const express = require('express');
const router = express.Router();
const {
    getStudyRecords,
    getUserSubjects,
    createUserSubject,
    createActiveStudyRecord,
    getActiveStudyRecord,
    setStudyRecordPaused,
    addStudyRecordRestTime,
    finishActiveStudyRecord,
    deleteStudyRecord,
    deleteActiveStudyRecord,
} = require('../database/db');
const { getSession } = require('./signin');

function requireSession(req, res) {
    const session = getSession(req);
    if (!session) {
        res.status(401).send({ message: '로그인이 필요합니다.' });
        return null;
    }
    return session;
}

function isUtcDateTime(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

router.get('/subjects', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    try {
        res.send(await getUserSubjects(session.userId));
    } catch (error) {
        next(error);
    }
});

router.post('/subjects', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;

    const { subject_name, subject_color } = req.body;
    if (typeof subject_name !== 'string' || !subject_name.trim() || subject_name.trim().length > 20
        || typeof subject_color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(subject_color)) {
        res.status(400).send({ message: '과목명(1~20자)과 6자리 색상 코드를 입력해주세요.' });
        return;
    }

    try {
        res.status(201).send(await createUserSubject(session.userId, subject_name.trim(), subject_color));
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            res.status(409).send({ message: '이미 등록된 과목 이름입니다.' });
            return;
        }
        next(error);
    }
});

router.post('/active', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;

    const { start_time } = req.body;
    if (!isUtcDateTime(start_time)) {
        res.status(400).send({ message: '올바른 시작 시각을 입력해주세요.' });
        return;
    }
    try {
        res.status(201).send(await createActiveStudyRecord(session.userId, start_time));
    } catch (error) {
        next(error);
    }
});

router.get('/active', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    try {
        res.send(await getActiveStudyRecord(session.userId));
    } catch (error) {
        next(error);
    }
});

router.post('/:recordId/pause', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const recordId = Number(req.params.recordId);
    const { pause_start_time } = req.body;
    if (!Number.isInteger(recordId) || recordId < 1 || !isUtcDateTime(pause_start_time)) {
        res.status(400).send({ message: '올바른 기록과 일시정지 시각을 입력해주세요.' });
        return;
    }
    try {
        const paused = await setStudyRecordPaused(session.userId, recordId, pause_start_time);
        if (!paused) {
            res.status(409).send({ message: '기록을 일시정지할 수 없습니다.' });
            return;
        }
        res.send({ paused: true });
    } catch (error) {
        next(error);
    }
});

router.post('/:recordId/resume', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const recordId = Number(req.params.recordId);
    const { resume_time } = req.body;
    if (!Number.isInteger(recordId) || recordId < 1 || !isUtcDateTime(resume_time)) {
        res.status(400).send({ message: '올바른 기록과 재개 시각을 입력해주세요.' });
        return;
    }
    try {
        const resumed = await addStudyRecordRestTime(session.userId, recordId, resume_time);
        if (!resumed) {
            res.status(409).send({ message: '기록을 재개할 수 없습니다.' });
            return;
        }
        res.send({ resumed: true });
    } catch (error) {
        next(error);
    }
});

router.post('/:recordId/finish', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const recordId = Number(req.params.recordId);
    const { subject_id, detail = null, end_time } = req.body;
    if (!Number.isInteger(recordId) || recordId < 1
        || !Number.isInteger(subject_id) || subject_id < 1
        || (detail !== null && (typeof detail !== 'string' || detail.length > 255))
        || !isUtcDateTime(end_time)) {
        res.status(400).send({ message: '과목, 기록 내용과 올바른 종료 시각을 입력해주세요.' });
        return;
    }
    try {
        const finished = await finishActiveStudyRecord(
            session.userId, recordId, subject_id, detail, end_time,
        );
        if (!finished) {
            res.status(409).send({ message: '기록을 종료할 수 없습니다.' });
            return;
        }
        res.send({ finished: true });
    } catch (error) {
        next(error);
    }
});

router.delete('/:recordId/active', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;

    const recordId = Number(req.params.recordId);
    if (!Number.isInteger(recordId) || recordId < 1) {
        res.status(400).send({ message: '올바른 기록을 선택해주세요.' });
        return;
    }

    try {
        const deleted = await deleteActiveStudyRecord(session.userId, recordId);
        if (!deleted) {
            res.status(404).send({ message: '삭제할 활성 기록을 찾을 수 없습니다.' });
            return;
        }
        res.send({ deleted: true });
    } catch (error) {
        next(error);
    }
});

router.delete('/:recordId', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;

    const recordId = Number(req.params.recordId);
    if (!Number.isInteger(recordId) || recordId < 1) {
        res.status(400).send({ message: '올바른 기록을 선택해주세요.' });
        return;
    }

    try {
        const deleted = await deleteStudyRecord(session.userId, recordId);
        if (!deleted) {
            res.status(404).send({ message: '기록을 찾을 수 없습니다.' });
            return;
        }
        res.send({ deleted: true });
    } catch (error) {
        next(error);
    }
});

router.get('/', async (req, res, next) => {
    const session = requireSession(req, res);
    if (!session) return;
    const { from, to } = req.query;
    if (!isUtcDateTime(from) || !isUtcDateTime(to) || from > to) {
        res.status(400).send({ message: '조회 시작일과 종료일은 ISO UTC 시각 형식으로 입력해주세요.' });
        return;
    }
    try {
        res.send(await getStudyRecords(session.userId, from, to));
    } catch (error) {
        next(error);
    }
});

module.exports = router;

