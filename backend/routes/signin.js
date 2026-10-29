const express = require('express');
const router = express.Router();
const db = require('../database/connectDB');
const { verifyPassword } = require('../utils/password');

// 로그인 세션이 있으면 반환하고, 로그인하지 않았으면 null을 반환합니다.
function getSession(req) {
    return req.session?.userId ? req.session : null;
}

// 현재 요청에 로그인된 사용자가 있는지 확인하는 API입니다.
router.get('/status', (req, res) => {
    const session = getSession(req);
    // 프론트엔드가 로그인 여부와 사용자 ID를 복원할 수 있도록 응답합니다.
    res.send({
        isLoggedIn: Boolean(session),
        userId: session?.userId || null,
    });
});

// 아이디와 비밀번호를 확인하고 성공하면 로그인 세션을 생성하는 API입니다.
router.post('/', (req, res, next) => {
    // JSON 요청 본문에서 로그인 정보를 가져옵니다.
    const { id, password } = req.body;
    // 필수 값이 빠졌으면 DB 조회 없이 잘못된 요청으로 응답합니다.
    if (!id || !password) {
        res.status(400).send({ message: '아이디와 비밀번호를 입력해주세요.' });
        return;
    }

    if (!/^[A-Za-z0-9_*!@#$%^&*()]+$/.test(password) || !/^[A-Za-z0-9_*!@#$%^&*()]+$/.test(id)) {
        res.status(400).send({ message: '아이디와 비밀번호는 영어, 숫자, 밑줄(_)과 숫자 위 특수문자만 사용할 수 있습니다.' });
        return;
    }

    // 입력한 아이디에 해당하는 계정의 비밀번호 해시를 조회합니다.
    db.get('SELECT id, user_text_id, password FROM users WHERE user_text_id = ?', [id], async (err, user) => {
        // DB 오류는 Express의 오류 처리기로 전달합니다.
        if (err) return next(err);
        // 계정이 없을 때도 비밀번호 오류와 같은 메시지로 응답합니다.
        if (!user) {
            res.status(401).send({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            return;
        }

        try {
            // 입력한 비밀번호를 DB의 해시와 안전하게 비교합니다.
            const isPasswordValid = await verifyPassword(password, user.password);
            // 비밀번호가 일치하지 않으면 인증 실패로 응답합니다.
            if (!isPasswordValid) {
                res.status(401).send({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
                return;
            }

            // 로그인할 때 세션 ID를 갱신해 세션 고정 공격을 막습니다.
            req.session.regenerate((sessionError) => {
                // 세션 생성 중 오류가 발생하면 오류 처리기로 전달합니다.
                if (sessionError) return next(sessionError);
                // 서버 세션에 로그인한 사용자의 ID를 저장합니다.
                req.session.userId = user.id;
                // 세션 저장이 끝난 뒤 성공 응답을 보냅니다.
                req.session.save((saveError) => {
                    if (saveError) return next(saveError);
                    res.send({ isLoggedIn: true, userId: user.id, userTextId: user.user_text_id });
                });
            });
        } catch (error) {
            // 비밀번호 검증 중 발생한 예외를 Express 오류 처리기로 전달합니다.
            next(error);
        }
    });
});

// 현재 로그인한 사용자의 세션을 삭제하는 로그아웃 API입니다.
router.delete('/', (req, res, next) => {
    // 세션이 없는 요청은 이미 로그아웃된 상태로 응답합니다.
    if (!req.session) {
        res.send({ isLoggedIn: false });
        return;
    }

    // 서버 세션을 제거한 뒤 브라우저 쿠키도 만료시킵니다.
    req.session.destroy((err) => {
        // 세션 삭제 오류는 Express 오류 처리기로 전달합니다.
        if (err) return next(err);
        res.clearCookie('studytime_sid', { httpOnly: true, sameSite: 'lax', path: '/' });
        res.send({ isLoggedIn: false });
    });
});

// 서버에서 라우터를 등록할 수 있도록 내보냅니다.
module.exports = router;
// 학습 기록·계획 라우트도 로그인 세션을 확인할 수 있도록 함수를 함께 내보냅니다.
module.exports.getSession = getSession;
