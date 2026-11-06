const express = require('express');
const router = express.Router();
// 목록 SELECT와 등록 INSERT를 각기 결과 형태에 맞는 공통 DB 함수로 실행합니다.
const { query, execute } = require('../database/connectDB');
const { getSession } = require('./signin');

function requireSession(req, res) {
    const session = getSession(req);
    if (!session) {
        res.status(401).send({ message: '로그인이 필요합니다.' });
        return null;
    }
    return session;
}

// async 핸들러에서 MySQL Promise를 기다려 쿼리 오류를 Express next로 전달합니다.
router.post('/', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;

    const { subject_name, start_time, end_time } = req.body;
    if (typeof subject_name !== 'string' || !subject_name.trim()
        || !Number.isFinite(start_time) || !Number.isFinite(end_time)
        || start_time < 0 || end_time <= start_time) {
        res.status(400).send({ message: '과목명과 올바른 시작·종료 시간을 입력해주세요.' });
        return;
    }

    try {
        // INSERT 결과의 insertId를 기존 API 응답의 id 필드로 돌려줍니다.
        const result = await execute(
            'INSERT INTO study_plan (user_id, subject_name, start_time, end_time) VALUES (?, ?, ?, ?)',
            [session.userId, subject_name.trim(), start_time, end_time],
        );
        res.status(201).send({
            id: result.insertId,
            user_id: session.userId,
            subject_name: subject_name.trim(),
            start_time,
            end_time,
        });
    } catch (error) {
        next(error);
    }
});

// 선택 기간 조건을 파라미터 목록과 함께 구성해 동적 SQL에서도 값 결합을 안전하게 유지합니다.
router.get('/', async (req, res, next) => {
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

    try {
        // 사용자 조건은 항상 포함하며 from/to가 전달된 경우에만 해당 범위를 더합니다.
        const plans = await query(
            `SELECT id, subject_name, start_time, end_time FROM study_plan WHERE ${conditions.join(' AND ')} ORDER BY start_time ASC`,
            params,
        );
        res.send(plans);
    } catch (error) {
        next(error);
    }
});

module.exports = router;

