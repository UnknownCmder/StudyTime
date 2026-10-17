const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/connectDB');
const { verifyPassword } = require('../utils/password');

const SESSION_COOKIE = 'studytime_sid';
// 세션 유효 기간은 요구사항대로 1일로 설정합니다.
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24;
// 현재 구현은 서버 메모리에 세션을 저장합니다. 서버가 재시작되면 세션도 초기화됩니다.
const sessions = new Map();

function parseCookies(req) {
    const cookies = req.headers.cookie || '';

    return cookies
        .split(';')
        .map((cookie) => cookie.trim().split('='))
        .filter(([key, value]) => key && value)
        .reduce((parsedCookies, [key, value]) => {
            parsedCookies[key] = decodeURIComponent(value);
            return parsedCookies;
        }, {});
}

function getSession(req) {
    // 브라우저가 보낸 쿠키에서 세션 ID를 꺼낸 뒤 서버 메모리의 세션과 비교합니다.
    const sid = parseCookies(req)[SESSION_COOKIE];

    if (!sid) {
        return null;
    }

    const session = sessions.get(sid);

    if (!session) {
        return null;
    }

    if (session.expiresAt <= Date.now()) {
        // 만료된 세션은 즉시 삭제해서 이후 요청에서 재사용되지 않게 합니다.
        sessions.delete(sid);
        return null;
    }

    return session;
}

function isLoggedIn(req) {
    return Boolean(getSession(req));
}

function setSessionCookie(res, userId) {
    // 예측하기 어려운 랜덤 값을 세션 ID로 사용하고, 실제 사용자 정보는 서버에 저장합니다.
    const sid = crypto.randomBytes(32).toString('hex');

    sessions.set(sid, {
        userId,
        expiresAt: Date.now() + SESSION_MAX_AGE,
    });

    res.cookie(SESSION_COOKIE, sid, {
        // httpOnly 쿠키라서 브라우저 JavaScript에서 세션 값을 직접 읽을 수 없습니다.
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE,
    });
}

function clearSessionCookie(req, res) {
    // 로그아웃할 때 서버 세션과 브라우저 쿠키를 함께 제거합니다.
    const sid = parseCookies(req)[SESSION_COOKIE];

    if (sid) {
        sessions.delete(sid);
    }

    res.clearCookie(SESSION_COOKIE, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
    });
}

function getRedirectPath(req) {
    const redirectTo = req.query.redirectTo || req.get('Referer') || '/';

    try {
        const url = new URL(redirectTo, `${req.protocol}://${req.get('host')}`);

        if (url.host !== req.get('host')) {
            return '/';
        }

        return `${url.pathname}${url.search}${url.hash}`;
    } catch (error) {
        return '/';
    }
}

router.get('/status', function (req, res, next) {
    // 프론트가 새로고침 후에도 로그인 상태를 복원할 수 있도록 현재 세션 상태를 반환합니다.
    const session = getSession(req);

    res.send({
        isLoggedIn: Boolean(session),
        userId: session?.userId || null,
    });
});

router.post('/', function (req, res, next) {
    // 로그인 요청으로 받은 아이디/비밀번호를 DB의 해시된 비밀번호와 비교합니다.
    const { id, password } = req.body;

    if (!id || !password) {
        res.status(400).send({ message: '아이디와 비밀번호를 입력해주세요.' });
        return;
    }

    db.get('SELECT id, password FROM users WHERE id = ?', [id], async (err, user) => {
        if (err) {
            next(err);
            return;
        }

        if (!user) {
            res.status(401).send({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            return;
        }

        try {
            // 입력한 비밀번호를 같은 방식으로 해싱해 저장된 해시와 안전하게 비교합니다.
            const isPasswordValid = await verifyPassword(password, user.password);

            if (!isPasswordValid) {
                res.status(401).send({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
                return;
            }

            // 검증에 성공하면 1일짜리 세션 쿠키를 발급합니다.
            setSessionCookie(res, user.id);
            res.send({ isLoggedIn: true, userId: user.id });
        } catch (error) {
            next(error);
        }
    });
});

router.delete('/', function (req, res, next) {
    // 로그아웃 API입니다. 세션을 지우고 로그인 상태를 false로 돌려줍니다.
    clearSessionCookie(req, res);
    res.send({ isLoggedIn: false });
});

module.exports = router;
