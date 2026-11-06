const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { execute, query } = require('../database/connectDB');
const { sendVerificationCode } = require('../utils/email');

const CODE_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_INTERVAL_MS = 60 * 1000;

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hashCode(email, code) {
    const secret = process.env.EMAIL_CODE_SECRET;
    if (!secret) throw new Error('EMAIL_CODE_SECRET 환경 변수가 설정되지 않았습니다.');
    return crypto.createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
}

function isValidEmail(email) {
    return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/send', async (req, res, next) => {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) {
        return res.status(400).send({ message: '올바른 이메일 주소를 입력해주세요.' });
    }

    try {
        const existingUsers = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
        if (existingUsers.length) {
            return res.status(409).send({ message: '이미 사용 중인 이메일입니다.' });
        }

        const existingCode = await query('SELECT expired_at FROM email_verification WHERE email = ? LIMIT 1', [email]);
        if (existingCode.length && existingCode[0].expired_at - CODE_LIFETIME_MS + RESEND_INTERVAL_MS > Date.now()) {
            return res.status(429).send({ message: '인증 코드는 1분 후 다시 요청할 수 있습니다.' });
        }

        const code = crypto.randomInt(100000, 1000000).toString();
        const hashedCode = hashCode(email, code);
        await sendVerificationCode(email, code);
        await execute(`INSERT INTO email_verification (email, hashed_code, expired_at)
            VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE hashed_code = VALUES(hashed_code), expired_at = VALUES(expired_at)`,
        [email, hashedCode, Date.now() + CODE_LIFETIME_MS]);

        return res.send({ message: '인증 코드를 이메일로 보냈습니다. 10분 안에 입력해주세요.' });
    } catch (error) {
        next(error);
    }
});

router.post('/verify', async (req, res, next) => {
    const email = normalizeEmail(req.body.email);
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
        return res.status(400).send({ message: '이메일과 6자리 인증 코드를 확인해주세요.' });
    }

    try {
        const rows = await query('SELECT hashed_code, expired_at FROM email_verification WHERE email = ?', [email]);
        if (!rows.length || Number(rows[0].expired_at) <= Date.now()) {
            await execute('DELETE FROM email_verification WHERE email = ?', [email]);
            return res.status(400).send({ message: '인증 코드가 없거나 만료되었습니다. 새 코드를 요청해주세요.' });
        }

        const actual = Buffer.from(hashCode(email, code), 'hex');
        const expected = Buffer.from(rows[0].hashed_code, 'hex');
        if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
            return res.status(400).send({ message: '인증 코드가 올바르지 않습니다.' });
        }

        req.session.verifiedEmail = email;
        await execute('DELETE FROM email_verification WHERE email = ?', [email]);
        return res.send({ message: '이메일 인증이 완료되었습니다.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
