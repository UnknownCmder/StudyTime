const express = require('express');
const router = express.Router();
const AUTH_COOKIE = 'studytime_login';

function isLoggedIn(req) {
    const cookies = req.headers.cookie || '';
    return cookies
        .split(';')
        .map((cookie) => cookie.trim())
        .includes(`${AUTH_COOKIE}=true`);
}

function setLoginCookie(res) {
    res.cookie(AUTH_COOKIE, 'true', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24, // 1 day
    });
}

function clearLoginCookie(res) {
    res.clearCookie(AUTH_COOKIE, {
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
    res.send({ isLoggedIn: isLoggedIn(req) });
});

router.post('/', function (req, res, next) {
    // TODO: 실제 로그인 검증이 추가되면 성공한 뒤 아래 redirect를 실행하면 됩니다.
    setLoginCookie(res);
    res.send({ isLoggedIn: true });
});

router.delete('/', function (req, res, next) {
    clearLoginCookie(res);
    res.send({ isLoggedIn: false });
});

router.get('/', function (req, res, next) {
    // TODO: 실제 로그인 검증이 추가되면 성공한 뒤 쿠키를 저장하면 됩니다.
    setLoginCookie(res);
    res.redirect(getRedirectPath(req));
});

module.exports = router;
