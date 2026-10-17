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

    try {
        // DB에 저장하기 전에 비밀번호를 평문이 아닌 해시 값으로 변환합니다.
        const hashedPassword = await hashPassword(password);

        db.run(
            'INSERT INTO users (id, password) VALUES (?, ?)',
            [id, hashedPassword],
            function (err) {
                if (!err) {
                    // 가입 성공 후 프론트는 로그인 페이지로 이동합니다.
                    res.status(201).send({ message: '회원가입이 완료되었습니다.' });
                    return;
                }

                if (err.code === 'SQLITE_CONSTRAINT') {
                    // users.id가 PRIMARY KEY라서 같은 아이디가 있으면 여기로 들어옵니다.
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
