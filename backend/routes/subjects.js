const express = require('express');
const router = express.Router();
const db = require('../database/connectDB');
const { getSession } = require('./signin');

function requireSession(req, res) {
    const session = getSession(req);
    if (!session) {
        res.status(401).send({ message: '로그인이 필요합니다.' });
        return null;
    }
    return session;
}

router.get('/', (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;

    db.all(
        'SELECT id, subject_name, subject_color FROM user_subjects WHERE user_num_id = ? ORDER BY id',
        [session.userId],
        (err, subjects) => {
            if (err) return next(err);
            res.send(subjects);
        },
    );
});

router.post('/', (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;

    const { subject_name, subject_color } = req.body || {};
    if (typeof subject_name !== 'string' || !subject_name.trim() || subject_name.trim().length > 50
        || typeof subject_color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(subject_color)) {
        res.status(400).send({ message: '과목명(1~50자)과 올바른 색상을 입력해주세요.' });
        return;
    }

    const trimmedName = subject_name.trim();
    db.run(
        'INSERT INTO user_subjects (user_num_id, subject_name, subject_color) VALUES (?, ?, ?)',
        [session.userId, trimmedName, subject_color],
        function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT'
                    && err.message.includes('UNIQUE constraint failed')) {
                    res.status(409).send({ message: '이미 등록된 과목입니다.' });
                    return;
                }
                return next(err);
            }
            res.status(201).send({
                id: this.lastID,
                subject_name: trimmedName,
                subject_color,
            });
        },
    );
});

router.delete('/:id', (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;

    const subjectId = Number(req.params.id);
    if (!Number.isSafeInteger(subjectId) || subjectId <= 0) {
        res.status(400).send({ message: '올바른 과목 ID가 아닙니다.' });
        return;
    }

    db.run(
        'DELETE FROM user_subjects WHERE id = ? AND user_num_id = ?',
        [subjectId, session.userId],
        function (err) {
            if (err) return next(err);
            if (this.changes === 0) {
                res.status(404).send({ message: '과목을 찾을 수 없습니다.' });
                return;
            }
            res.send({ message: '과목이 삭제되었습니다.' });
        },
    );
});

module.exports = router;
