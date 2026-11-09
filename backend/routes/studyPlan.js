const express = require('express');
const router = express.Router();
const { pool, query, execute } = require('../database/connectDB');
const { getSession } = require('./signin');

function requireSession(req, res) {
    const session = getSession(req);
    if (!session) {
        res.status(401).send({ message: '로그인이 필요합니다.' });
        return null;
    }
    return session;
}

function validTime(value) {
    return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function validPlan(subjectId, startTime, endTime) {
    return Number.isInteger(subjectId) && subjectId > 0
        && validTime(startTime) && validTime(endTime) && startTime < endTime;
}

function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// 주간 반복 계획은 요일(일요일=0)과 시작/종료 시각으로 저장합니다.
router.get('/weekly', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    try {
        const plans = await query(`SELECT p.id, p.day_of_week, p.subject_id, s.subject_name, s.subject_color,
                TIME_FORMAT(p.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(p.end_time, '%H:%i') AS end_time
            FROM weekly_study_plan p INNER JOIN user_subjects s ON s.id = p.subject_id
            WHERE p.user_num_id = ? AND s.user_num_id = ?
            ORDER BY p.day_of_week, p.start_time`, [session.userId, session.userId]);
        res.send(plans);
    } catch (error) { next(error); }
});

router.post('/weekly', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const { subject_id: subjectId, day_of_week: day, start_time: startTime, end_time: endTime } = req.body;
    if (!validPlan(subjectId, startTime, endTime) || !Number.isInteger(day) || day < 0 || day > 6) {
        res.status(400).send({ message: '요일, 과목, 시작·종료 시간을 확인해주세요.' });
        return;
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 사용자 행 잠금으로 같은 사용자의 동시 계획 등록도 순서대로 검사합니다.
        const [users] = await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [session.userId]);
        if (!users.length) {
            await connection.rollback();
            res.status(401).send({ message: '로그인 사용자를 확인할 수 없습니다.' });
            return;
        }

        // 종료 시각과 시작 시각이 맞닿는 경우는 허용하고, 실제 구간이 겹치는 경우만 거부합니다.
        const [overlaps] = await connection.execute(`SELECT id FROM weekly_study_plan
            WHERE user_num_id = ? AND day_of_week = ?
                AND start_time < ? AND end_time > ? LIMIT 1`,
        [session.userId, day, endTime, startTime]);
        if (overlaps.length) {
            await connection.rollback();
            res.status(409).send({ message: '선택한 요일에 해당 시간과 겹치는 계획이 이미 있습니다.' });
            return;
        }

        const [subjects] = await connection.execute(
            'SELECT id FROM user_subjects WHERE id = ? AND user_num_id = ?',
            [subjectId, session.userId],
        );
        if (!subjects.length) {
            await connection.rollback();
            res.status(400).send({ message: '선택한 과목을 찾을 수 없습니다.' });
            return;
        }

        const [result] = await connection.execute(`INSERT INTO weekly_study_plan
            (user_num_id, subject_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)`,
        [session.userId, subjectId, day, startTime, endTime]);
        await connection.commit();
        res.status(201).send({ id: result.insertId, subject_id: subjectId, day_of_week: day, start_time: startTime, end_time: endTime });
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(400).send({ message: '선택한 과목을 찾을 수 없습니다.' });
            return;
        }
        next(error);
    } finally {
        connection.release();
    }
});

router.put('/weekly/:id', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const id = Number(req.params.id);
    const { subject_id: subjectId, day_of_week: day, start_time: startTime, end_time: endTime } = req.body;
    if (!Number.isInteger(id) || id < 1 || !validPlan(subjectId, startTime, endTime)
        || !Number.isInteger(day) || day < 0 || day > 6) {
        res.status(400).send({ message: '요일, 과목과 시작·종료 시간을 확인해주세요.' });
        return;
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [users] = await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [session.userId]);
        if (!users.length) {
            await connection.rollback();
            res.status(401).send({ message: '로그인 사용자를 확인할 수 없습니다.' });
            return;
        }
        const [currentPlans] = await connection.execute(
            'SELECT id FROM weekly_study_plan WHERE id = ? AND user_num_id = ?', [id, session.userId],
        );
        if (!currentPlans.length) {
            await connection.rollback();
            res.status(404).send({ message: '계획을 찾을 수 없습니다.' });
            return;
        }
        const [overlaps] = await connection.execute(`SELECT id FROM weekly_study_plan
            WHERE user_num_id = ? AND day_of_week = ? AND id <> ?
                AND start_time < ? AND end_time > ? LIMIT 1`,
        [session.userId, day, id, endTime, startTime]);
        if (overlaps.length) {
            await connection.rollback();
            res.status(409).send({ message: '선택한 요일에 해당 시간과 겹치는 계획이 이미 있습니다.' });
            return;
        }
        const [subjects] = await connection.execute(
            'SELECT id FROM user_subjects WHERE id = ? AND user_num_id = ?', [subjectId, session.userId],
        );
        if (!subjects.length) {
            await connection.rollback();
            res.status(400).send({ message: '선택한 과목을 찾을 수 없습니다.' });
            return;
        }
        await connection.execute(`UPDATE weekly_study_plan
            SET subject_id = ?, day_of_week = ?, start_time = ?, end_time = ?
            WHERE id = ? AND user_num_id = ?`,
        [subjectId, day, startTime, endTime, id, session.userId]);
        await connection.commit();
        res.send({ updated: true });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

router.delete('/weekly/:id', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).send({ message: '올바른 계획을 선택해주세요.' });
    try {
        const result = await execute('DELETE FROM weekly_study_plan WHERE id = ? AND user_num_id = ?', [id, session.userId]);
        if (!result.affectedRows) return res.status(404).send({ message: '계획을 찾을 수 없습니다.' });
        res.send({ deleted: true });
    } catch (error) { next(error); }
});

router.get('/daily', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const { date } = req.query;
    if (!validDate(date)) return res.status(400).send({ message: '날짜 형식을 확인해주세요.' });
    try {
        const plans = await query(`SELECT p.id, p.subject_id, s.subject_name, s.subject_color, p.detail, p.isDone
            FROM daily_study_plan p INNER JOIN user_subjects s ON s.id = p.subject_id
            WHERE p.user_num_id = ? AND s.user_num_id = ? AND p.plan_date = ?
            ORDER BY p.id`, [session.userId, session.userId, date]);
        res.send(plans);
    } catch (error) { next(error); }
});

router.post('/daily', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const { subject_id: subjectId, plan_date: date, detail = '' } = req.body;
    if (!Number.isInteger(subjectId) || subjectId < 1 || !validDate(date)
        || typeof detail !== 'string' || detail.length > 100) {
        res.status(400).send({ message: '날짜, 과목과 세부 내용(100자 이하)을 확인해주세요.' });
        return;
    }
    try {
        const result = await execute(`INSERT INTO daily_study_plan
            (user_num_id, subject_id, plan_date, detail)
            VALUES (?, ?, ?, ?)`, [session.userId, subjectId, date, detail.trim()]);
        res.status(201).send({ id: result.insertId, subject_id: subjectId, plan_date: date, detail: detail.trim(), isDone: false });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(400).send({ message: '선택한 과목을 찾을 수 없습니다.' });
            return;
        }
        next(error);
    }
});

router.put('/daily/:id', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const id = Number(req.params.id);
    const { subject_id: subjectId, detail = '' } = req.body;
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(subjectId) || subjectId < 1
        || typeof detail !== 'string' || detail.length > 100) {
        res.status(400).send({ message: '과목과 세부 내용(100자 이하)을 확인해주세요.' });
        return;
    }
    try {
        const [subjects] = await pool.execute(
            'SELECT id FROM user_subjects WHERE id = ? AND user_num_id = ?', [subjectId, session.userId],
        );
        if (!subjects.length) return res.status(400).send({ message: '선택한 과목을 찾을 수 없습니다.' });
        const result = await execute(
            'UPDATE daily_study_plan SET subject_id = ?, detail = ? WHERE id = ? AND user_num_id = ?',
            [subjectId, detail.trim(), id, session.userId],
        );
        if (!result.affectedRows) return res.status(404).send({ message: '계획을 찾을 수 없습니다.' });
        res.send({ updated: true });
    } catch (error) { next(error); }
});

router.patch('/daily/:id', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const id = Number(req.params.id);
    const { isDone } = req.body;
    if (!Number.isInteger(id) || id < 1 || typeof isDone !== 'boolean') {
        return res.status(400).send({ message: '완료 상태를 확인해주세요.' });
    }
    try {
        const result = await execute('UPDATE daily_study_plan SET isDone = ? WHERE id = ? AND user_num_id = ?', [isDone, id, session.userId]);
        if (!result.affectedRows) return res.status(404).send({ message: '계획을 찾을 수 없습니다.' });
        res.send({ updated: true, isDone });
    } catch (error) { next(error); }
});

router.delete('/daily/:id', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).send({ message: '올바른 계획을 선택해주세요.' });
    try {
        const result = await execute('DELETE FROM daily_study_plan WHERE id = ? AND user_num_id = ?', [id, session.userId]);
        if (!result.affectedRows) return res.status(404).send({ message: '계획을 찾을 수 없습니다.' });
        res.send({ deleted: true });
    } catch (error) { next(error); }
});

module.exports = router;
