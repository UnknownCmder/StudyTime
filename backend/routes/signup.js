const express = require('express');
const router = express.Router();
// 계정 INSERT는 결과 메타데이터를 쓰지 않으므로 공통 execute 헬퍼를 이용합니다.
const { execute, query } = require('../database/connectDB');
const { hashPassword } = require('../utils/password');

router.post('/', async function (req, res, next) {
    // 회원가입 화면에서 입력한 아이디와 비밀번호를 받습니다.
    const { id, password, passwordConfirm } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!email || req.session.verifiedEmail !== email) {
        res.status(400).send({ message: '회원가입 전에 이메일 인증을 완료해주세요.' });
        return;
    }

    if (!id || !password) {
        res.status(400).send({ message: '아이디와 비밀번호를 입력해주세요.' });
        return;
    }

    if (typeof id !== 'string' || id.length < 1 || id.length > 20) {
        res.status(400).send({ message: '아이디는 1자 이상 20자 이하로 입력해주세요.' });
        return;
    }

    if (typeof password !== 'string' || password.length < 6 || password.length > 20) {
        res.status(400).send({ message: '비밀번호는 문자가 포함된 6자 이상 20자 이하로 입력해주세요.' });
        return;
    }

    if (typeof passwordConfirm !== 'string' || password !== passwordConfirm) {
        res.status(400).send({ message: '비밀번호가 일치하지 않습니다.' });
        return;
    }

    if (!/^[A-Za-z0-9_*!@#$%^&*()]+$/.test(password) || !/^[A-Za-z0-9_*!@#$%^&*()]+$/.test(id)) {
        res.status(400).send({ message: '아이디와 비밀번호는 영어, 숫자, 밑줄(_)과 숫자 위 특수문자만 사용할 수 있습니다.' });
        return;
    }

    try {
        const existingAccounts = await query(
            'SELECT id FROM users WHERE user_text_id = ? OR email = ? LIMIT 1',
            [id, email],
        );
        if (existingAccounts.length) {
            res.status(409).send({ message: '아이디 또는 이메일이 이미 사용 중입니다.' });
            return;
        }

        // DB에 저장하기 전에 비밀번호를 평문이 아닌 해시 값으로 변환합니다.
        const hashedPassword = await hashPassword(password);

        // Promise가 성공적으로 끝난 뒤에만 가입 성공 응답을 보냅니다.
        // 중복 아이디의 MySQL 고유 키 오류는 아래에서 ER_DUP_ENTRY로 구분합니다.
        // 원문 비밀번호가 아닌 해시를 users.hashed_pw 컬럼에 저장합니다.
        await execute(
            'INSERT INTO users (user_text_id, hashed_pw, email) VALUES (?, ?, ?)',
            [id, hashedPassword, email],
        );
        delete req.session.verifiedEmail;
        res.status(201).send({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        // SQLite 오류 코드 대신 MySQL 드라이버의 고유 키 위반 코드를 확인합니다.
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).send({ message: '아이디 또는 이메일이 이미 사용 중입니다.' });
            return;
        }
        next(error);
    }
});

module.exports = router;
