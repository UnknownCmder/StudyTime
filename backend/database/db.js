const db = require('./connectDB');

function getStudyRecords(userId, from, to) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT
                study_record.id,
                study_record.detail,
                study_record.start_time,
                study_record.end_time,
                study_record.rest_time,
                user_subjects.subject_name,
                user_subjects.subject_color
            FROM study_record
            INNER JOIN user_subjects ON user_subjects.id = study_record.subject_id
            WHERE study_record.user_num_id = ?
                AND study_record.end_time != 0
                AND study_record.end_time > study_record.start_time
                AND study_record.start_time <= ?
                AND study_record.end_time >= ?`,
            [userId, to, from],
            (error, records) => {
                if (error) reject(error);
                else resolve(records);
            },
        );
    });
}

function getUserSubjects(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, subject_name, subject_color
            FROM user_subjects
            WHERE user_num_id = ?`,
            [userId],
            (error, subjects) => {
                if (error) reject(error);
                else resolve(subjects);
            },
        );
    });
}

function createUserSubject(userId, subjectName, subjectColor) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO user_subjects (user_num_id, subject_name, subject_color) VALUES (?, ?, ?)',
            [userId, subjectName, subjectColor],
            function (error) {
                if (error) reject(error);
                else resolve({ id: this.lastID, subject_name: subjectName, subject_color: subjectColor });
            },
        );
    });
}

function createActiveStudyRecord(userId, startDateTime) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO study_record
                (user_num_id, subject_id, detail, start_time, end_time, rest_time, pause_start_time)
            VALUES (?, NULL, NULL, ?, 0, 0, 0)`,
            [userId, startDateTime],
            function (error) {
                if (error) reject(error);
                else resolve({ id: this.lastID });
            },
        );
    });
}

function getActiveStudyRecord(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT id, start_time, rest_time, pause_start_time
            FROM study_record
            WHERE user_num_id = ? AND end_time = 0
            ORDER BY id DESC
            LIMIT 1`,
            [userId],
            (error, record) => {
                if (error) reject(error);
                else resolve(record || null);
            },
        );
    });
}

function databaseDateTimeToDate(value) {
    // DB에 저장된 ISO UTC 시각을 기준으로 휴식 시간을 계산합니다.
    return new Date(value);
}

function setStudyRecordPaused(userId, recordId, pauseStartTime) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE study_record
            SET pause_start_time = ?
            WHERE id = ? AND user_num_id = ? AND end_time = 0 AND pause_start_time = 0`,
            [pauseStartTime, recordId, userId],
            function (error) {
                if (error) return reject(error);
                resolve(this.changes > 0);
            },
        );
    });
}

function addStudyRecordRestTime(userId, recordId, resumeTime) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT pause_start_time FROM study_record
            WHERE id = ? AND user_num_id = ? AND end_time = 0`,
            [recordId, userId],
            (error, record) => {
                if (error) return reject(error);
                if (!record || record.pause_start_time == 0) return resolve(false);
                const restSeconds = Math.max(0, Math.floor(
                    (databaseDateTimeToDate(resumeTime) - databaseDateTimeToDate(record.pause_start_time)) / 1000,
                ));
                db.run(
                    `UPDATE study_record
                    SET rest_time = rest_time + ?, pause_start_time = 0
                    WHERE id = ? AND user_num_id = ? AND end_time = 0 AND pause_start_time = ?`,
                    [restSeconds, recordId, userId, record.pause_start_time],
                    function (updateError) {
                        if (updateError) return reject(updateError);
                        resolve(this.changes > 0);
                    },
                );
            },
        );
    });
}

function finishActiveStudyRecord(userId, recordId, subjectId, detail, endDateTime) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT start_time, rest_time, pause_start_time FROM study_record
            WHERE id = ? AND user_num_id = ?
                AND end_time = 0`,
            [recordId, userId],
            (error, record) => {
                if (error) return reject(error);
                if (!record) return resolve(false);
                if (endDateTime <= record.start_time) {
                    console.error(`Study record ${recordId} rejected: end_time must be after start_time.`);
                    return resolve(false);
                }

                // 완료된 기록끼리만 비교하며, 경계 시각만 맞닿는 경우는 겹침으로 보지 않습니다.
                db.get(
                    `SELECT id FROM study_record
                    WHERE user_num_id = ? AND id != ? AND end_time != 0
                        AND start_time < ? AND end_time > ?
                    LIMIT 1`,
                    [userId, recordId, endDateTime, record.start_time],
                    (overlapError, overlappingRecord) => {
                        if (overlapError) return reject(overlapError);
                        if (overlappingRecord) {
                            console.error(
                                `Study record ${recordId} rejected: time range overlaps with record ${overlappingRecord.id} for user ${userId}.`,
                            );
                            return resolve(false);
                        }

                        const additionalRest = record.pause_start_time == 0 ? 0 : Math.max(0, Math.floor(
                            (databaseDateTimeToDate(endDateTime) - databaseDateTimeToDate(record.pause_start_time)) / 1000,
                        ));
                        db.run(
                            `UPDATE study_record
                            SET subject_id = ?, detail = ?, end_time = ?,
                                rest_time = rest_time + ?, pause_start_time = 0
                            WHERE id = ? AND user_num_id = ?
                                AND end_time = 0
                                AND EXISTS (
                                    SELECT 1 FROM user_subjects
                                    WHERE id = ? AND user_num_id = ?
                                )
                                AND NOT EXISTS (
                                    SELECT 1 FROM study_record AS existing
                                    WHERE existing.user_num_id = ? AND existing.id != ?
                                        AND existing.end_time != 0
                                        AND existing.start_time < ? AND existing.end_time > ?
                                )`,
                            [
                                subjectId, detail, endDateTime, additionalRest,
                                recordId, userId, subjectId, userId,
                                userId, recordId, endDateTime, record.start_time,
                            ],
                            function (updateError) {
                                if (updateError) return reject(updateError);
                                resolve(this.changes > 0);
                            },
                        );
                    },
                );
            },
        );
    });
}

function deleteStudyRecord(userId, recordId) {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM study_record WHERE id = ? AND user_num_id = ?',
            [recordId, userId],
            function (error) {
                if (error) return reject(error);
                resolve(this.changes > 0);
            },
        );
    });
}

function deleteActiveStudyRecord(userId, recordId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM study_record
            WHERE id = ? AND user_num_id = ?
                AND end_time = 0`,
            [recordId, userId],
            function (error) {
                if (error) return reject(error);
                resolve(this.changes > 0);
            },
        );
    });
}

module.exports = {
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
};
