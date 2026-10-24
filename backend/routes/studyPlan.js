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

router.post('/', (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;

    const { subject_name, start_time, end_time } = req.body;
    if (typeof subject_name !== 'string' || !subject_name.trim()
        || !Number.isFinite(start_time) || !Number.isFinite(end_time)
        || start_time < 0 || end_time <= start_time) {
        res.status(400).send({ message: '과목명과 올바른 시작·종료 시간을 입력해주세요.' });
        return;
    }

    db.run(
        'INSERT INTO study_plan (user_id, subject_name, start_time, end_time) VALUES (?, ?, ?, ?)',
        [session.userId, subject_name.trim(), start_time, end_time],
        function (err) {
            if (err) return next(err);
            res.status(201).send({
                id: this.lastID,
                user_id: session.userId,
                subject_name: subject_name.trim(),
                start_time,
                end_time,
            });
        },
    );
});

router.get('/', (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;

    const { from, to } = req.query;
    if ((from !== undefined && !Number.isFinite(Number(from)))
        || (to !== undefined && !Number.isFinite(Number(to)))) {
        res.status(400).send({ message: '조회 기간은 숫자 timestamp로 입력해주세요.' });
        return;
    }

    const conditions = ['user_id = ?'];
    const params = [session.userId];
    if (from !== undefined) {
        conditions.push('start_time >= ?');
        params.push(Number(from));
    }
    if (to !== undefined) {
        conditions.push('start_time <= ?');
        params.push(Number(to));
    }

    db.all(
        `SELECT id, subject_name, start_time, end_time FROM study_plan WHERE ${conditions.join(' AND ')} ORDER BY start_time ASC`,
        params,
        (err, plans) => {
            if (err) return next(err);
            res.send(plans);
        },
    );
});

module.exports = router;

