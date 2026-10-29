const express = require('express');
const router = express.Router();
const db = require('../database/connectDB');
const { hashPassword } = require('../utils/password');

router.post('/', async function (req, res, next) {
    // 회원가입 화면에서 입력한 아이디와 비밀번호를 받습니다.
    const { id, password } = req.body;

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

    if (!/^[A-Za-z0-9_*!@#$%^&*()]+$/.test(password) || !/^[A-Za-z0-9_*!@#$%^&*()]+$/.test(id)) {
        res.status(400).send({ message: '아이디와 비밀번호는 영어, 숫자, 밑줄(_)과 숫자 위 특수문자만 사용할 수 있습니다.' });
        return;
    }

    try {
        // DB에 저장하기 전에 비밀번호를 평문이 아닌 해시 값으로 변환합니다.
        const hashedPassword = await hashPassword(password);

        db.run(
            'INSERT INTO users (user_text_id, password) VALUES (?, ?)',
            [id, hashedPassword],
            function (err) {
                if (!err) {
                    // 가입 성공 후 프론트는 로그인 페이지로 이동합니다.
                    res.status(201).send({ message: '회원가입이 완료되었습니다.' });
                    return;
                }

                if (err.code === 'SQLITE_CONSTRAINT') {
                    // users.user_text_id가 UNIQUE라서 같은 아이디가 있으면 여기로 들어옵니다.
                    res.status(409).send({ message: '이미 사용 중인 아이디입니다.' });
                    return;
                }

                next(err);
            },
        );
    } catch (error) {
        next(error);
    }
});

module.exports = router;
