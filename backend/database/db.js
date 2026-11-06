const { pool, query, execute } = require('./connectDB');

// 조회 구간과 겹치는 완료 기록 및 과목 정보를 한 쿼리에서 가져옵니다.
// end_time이 NULL인 기록은 아직 진행 중이므로 결과에서 제외합니다.
async function getStudyRecords(userId, from, to) {
    return query(`SELECT study_record.id, study_record.detail, study_record.start_time,
            study_record.end_time, study_record.rest_time,
            user_subjects.subject_name, user_subjects.subject_color
        FROM study_record
        INNER JOIN user_subjects ON user_subjects.id = study_record.subject_id
        WHERE study_record.user_num_id = ? AND study_record.end_time IS NOT NULL
            AND study_record.end_time > study_record.start_time
            AND study_record.start_time <= ? AND study_record.end_time >= ?`,
    [userId, toDatabaseDateTime(to), toDatabaseDateTime(from)]);
}

// 로그인 사용자의 과목 목록을 반환합니다. userId 조건으로 다른 사용자의 과목 접근을 막습니다.
function getUserSubjects(userId) {
    return query(`SELECT id, subject_name, subject_color,
            daily_study_time, monthly_study_time, yearly_study_time, total_study_time
        FROM user_subjects WHERE user_num_id = ?`, [userId]);
}

// 사용자별 과목을 등록하고, MySQL이 생성한 AUTO_INCREMENT 키를 API 응답용 id로 돌려줍니다.
async function createUserSubject(userId, subjectName, subjectColor) {
    const result = await execute(
        'INSERT INTO user_subjects (user_num_id, subject_name, subject_color) VALUES (?, ?, ?)',
        [userId, subjectName, subjectColor],
    );
    return { id: result.insertId, subject_name: subjectName, subject_color: subjectColor };
}

// 타이머 시작 시 미완료 기록을 만듭니다.
// MySQL DATETIME에 0을 저장할 수 없어 완료/일시정지 여부는 NULL로 표현합니다.
async function createActiveStudyRecord(userId) {
    // 브라우저 시계 대신 서버 시각을 기록의 기준 시각으로 사용합니다.
    const startDateTime = new Date();
    const result = await execute(`INSERT INTO study_record
        (user_num_id, subject_id, detail, start_time, end_time, rest_time, pause_start_time)
        VALUES (?, NULL, NULL, ?, NULL, 0, NULL)`, [userId, toDatabaseDateTime(startDateTime)]);
    return { id: result.insertId };
}

// 진행 중 기록이나 중지를 눌러 종료 시각은 고정됐지만 과목/설명을 아직 저장하지 않은 기록을 조회합니다.
async function getActiveStudyRecord(userId) {
    const rows = await query(`SELECT id, start_time, rest_time, pause_start_time, end_time, subject_id
        FROM study_record WHERE user_num_id = ?
            AND (end_time IS NULL OR (end_time IS NOT NULL AND subject_id IS NULL))
        ORDER BY id DESC LIMIT 1`, [userId]);
    return rows[0] || null;
}

// MySQL DATETIME 결과(Date)와 UTC 문자열을 계산에 쓸 JS Date로 통일합니다.
// 문자열이 DATETIME 형식이면 UTC 표식을 붙여 실행 환경의 로컬 시간대 해석을 피합니다.
function databaseDateTimeToDate(value) {
    if (value instanceof Date) return value;
    return new Date(`${toDatabaseDateTime(value).replace(' ', 'T')}Z`);
}

// 사용 중인 MySQL 컬럼이 DATETIME(0)이므로 프론트의 ISO UTC 값에서 밀리초를 제거합니다.
// 이를 거치지 않으면 INSERT에서 DB가 값을 반올림/절삭하는 동작과 애플리케이션 비교 결과가 달라질 수 있습니다.
function toDatabaseDateTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('Invalid date/time value');
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

// 완료 기록의 시작 시각이 속한 UTC 일/월/년을 집계 범위로 만듭니다.
// 현재 스키마에는 집계 기간을 나타내는 별도 날짜 컬럼이 없으므로 기록의 start_time을 기준으로 분류합니다.
function getUtcStudyPeriods(value) {
    const date = databaseDateTimeToDate(value);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    return {
        dayStart: new Date(Date.UTC(year, month, day)),
        dayEnd: new Date(Date.UTC(year, month, day + 1)),
        monthStart: new Date(Date.UTC(year, month, 1)),
        monthEnd: new Date(Date.UTC(year, month + 1, 1)),
        yearStart: new Date(Date.UTC(year, 0, 1)),
        yearEnd: new Date(Date.UTC(year + 1, 0, 1)),
    };
}

// 완료된 기록을 원천 데이터로 삼아 특정 사용자(및 선택적 과목)의 누계를 재계산합니다.
// 기간 누계는 다음 날짜/월/년 기록이 끝날 때 자연스럽게 해당 UTC 기간의 값으로 바뀝니다.
async function getStudyTimeTotals(connection, userId, period, subjectId = null) {
    const subjectFilter = subjectId === null ? '' : 'AND subject_id = ?';
    const params = [
        toDatabaseDateTime(period.dayStart), toDatabaseDateTime(period.dayEnd),
        toDatabaseDateTime(period.monthStart), toDatabaseDateTime(period.monthEnd),
        toDatabaseDateTime(period.yearStart), toDatabaseDateTime(period.yearEnd),
        userId,
    ];
    if (subjectId !== null) params.push(subjectId);

    const [rows] = await connection.execute(`SELECT
            COALESCE(SUM(CASE WHEN start_time >= ? AND start_time < ? THEN
                GREATEST(0, TIMESTAMPDIFF(SECOND, start_time, end_time) - rest_time) ELSE 0 END), 0) AS daily_time,
            COALESCE(SUM(CASE WHEN start_time >= ? AND start_time < ? THEN
                GREATEST(0, TIMESTAMPDIFF(SECOND, start_time, end_time) - rest_time) ELSE 0 END), 0) AS monthly_time,
            COALESCE(SUM(CASE WHEN start_time >= ? AND start_time < ? THEN
                GREATEST(0, TIMESTAMPDIFF(SECOND, start_time, end_time) - rest_time) ELSE 0 END), 0) AS yearly_time,
            COALESCE(SUM(GREATEST(0, TIMESTAMPDIFF(SECOND, start_time, end_time) - rest_time)), 0) AS total_time
        FROM study_record
        WHERE user_num_id = ? AND end_time IS NOT NULL ${subjectFilter}`, params);
    return Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]));
}

// 계산한 누계를 과목 행과 사용자 행에 함께 반영합니다.
async function saveStudyTimeTotals(connection, userId, subjectId, period) {
    const subjectTotals = await getStudyTimeTotals(connection, userId, period, subjectId);
    const userTotals = await getStudyTimeTotals(connection, userId, period);

    await connection.execute(`UPDATE user_subjects SET
            daily_study_time = ?, monthly_study_time = ?, yearly_study_time = ?, total_study_time = ?
        WHERE id = ? AND user_num_id = ?`,
    [subjectTotals.daily_time, subjectTotals.monthly_time,
        subjectTotals.yearly_time, subjectTotals.total_time, subjectId, userId]);

    // user_num_id가 UNIQUE가 아닐 수 있으므로 기존 행을 찾아 갱신하고, 없을 때만 삽입합니다.
    const [totalRows] = await connection.execute(`SELECT id FROM user_total_study_time
        WHERE user_num_id = ? ORDER BY id LIMIT 1 FOR UPDATE`, [userId]);
    if (totalRows.length) {
        // 중복 행이 이미 있다면 사용자에 해당하는 행들을 모두 동일한 최신 값으로 맞춥니다.
        await connection.execute(`UPDATE user_total_study_time SET
                daily_time = ?, monthly_time = ?, yearly_time = ?, total_study_time = ?
            WHERE user_num_id = ?`,
        [userTotals.daily_time, userTotals.monthly_time, userTotals.yearly_time,
            userTotals.total_time, userId]);
    } else {
        await connection.execute(`INSERT INTO user_total_study_time
                (user_num_id, daily_time, monthly_time, yearly_time, total_study_time)
            VALUES (?, ?, ?, ?, ?)`,
        [userId, userTotals.daily_time, userTotals.monthly_time,
            userTotals.yearly_time, userTotals.total_time]);
    }
}

// 활성 기록만 일시정지하고 아직 pause_start_time이 비어 있을 때에만 변경합니다.
// 조건부 UPDATE는 동시에 들어온 중복 요청이 상태를 덮어쓰지 않게 합니다.
async function setStudyRecordPaused(userId, recordId) {
    // 버튼 클릭 시각을 클라이언트가 조작하지 못하게 서버에서 정지 시각을 생성합니다.
    const pauseStartTime = new Date();
    const result = await execute(`UPDATE study_record SET pause_start_time = ?
        WHERE id = ? AND user_num_id = ? AND end_time IS NULL AND pause_start_time IS NULL`,
    [toDatabaseDateTime(pauseStartTime), recordId, userId]);
    return result.affectedRows > 0;
}

// 중지 버튼을 누른 시각에 기록의 end_time을 확정합니다.
// 이미 일시정지 중이었다면 중지 버튼 전까지의 휴식만 rest_time에 더하고, 팝업 대기 시간은 기록에 넣지 않습니다.
async function stopActiveStudyRecord(userId, recordId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [users] = await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
        if (!users.length) {
            await connection.rollback();
            return false;
        }

        const [records] = await connection.execute(`SELECT start_time, pause_start_time, end_time FROM study_record
            WHERE id = ? AND user_num_id = ?
                AND (end_time IS NULL OR (end_time IS NOT NULL AND subject_id IS NULL)) FOR UPDATE`,
        [recordId, userId]);
        const record = records[0];
        if (!record) {
            await connection.rollback();
            return false;
        }
        // 응답이 유실되어 클라이언트가 재시도해도 이미 고정한 종료 시각을 바꾸지 않습니다.
        if (record.end_time) {
            await connection.commit();
            return true;
        }

        const stoppedAt = new Date();
        if (stoppedAt <= databaseDateTimeToDate(record.start_time)) {
            await connection.rollback();
            return false;
        }
        const [overlaps] = await connection.execute(`SELECT id FROM study_record
            WHERE user_num_id = ? AND id != ? AND end_time IS NOT NULL
                AND start_time < ? AND end_time > ? LIMIT 1`,
        [userId, recordId, toDatabaseDateTime(stoppedAt), record.start_time]);
        if (overlaps.length) {
            await connection.rollback();
            return false;
        }

        const additionalRest = record.pause_start_time
            ? Math.max(0, Math.floor((stoppedAt - databaseDateTimeToDate(record.pause_start_time)) / 1000))
            : 0;
        const [result] = await connection.execute(`UPDATE study_record
            SET end_time = ?, rest_time = rest_time + ?, pause_start_time = NULL
            WHERE id = ? AND user_num_id = ? AND end_time IS NULL`,
        [toDatabaseDateTime(stoppedAt), additionalRest, recordId, userId]);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return false;
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 일시정지 시작과 재개 시각의 차이를 초 단위 휴식으로 누적합니다.
// UPDATE에도 이전 pause_start_time을 조건으로 넣어 조회 후 상태가 바뀐 경우를 걸러냅니다.
async function addStudyRecordRestTime(userId, recordId) {
    const rows = await query(`SELECT pause_start_time FROM study_record
        WHERE id = ? AND user_num_id = ? AND end_time IS NULL`, [recordId, userId]);
    const record = rows[0];
    if (!record || !record.pause_start_time) return false;
    // 저장된 서버 정지 시각과 현재 서버 시각의 차이만 휴식으로 누적합니다.
    const resumeTime = new Date();
    const restSeconds = Math.max(0, Math.floor(
        (databaseDateTimeToDate(resumeTime) - databaseDateTimeToDate(record.pause_start_time)) / 1000,
    ));
    const result = await execute(`UPDATE study_record
        SET rest_time = rest_time + ?, pause_start_time = NULL
        WHERE id = ? AND user_num_id = ? AND end_time IS NULL AND pause_start_time = ?`,
    [restSeconds, recordId, userId, record.pause_start_time]);
    return result.affectedRows > 0;
}

// 진행 중 기록을 완료합니다. 시작/종료 시각이 유효하고, 같은 사용자의 완료 기록과 겹치지 않으며,
// 선택한 과목이 해당 사용자 소유일 때만 기록을 갱신합니다.
async function finishActiveStudyRecord(userId, recordId, subjectId, detail) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 같은 사용자의 동시 완료 요청을 직렬화해 누계 재계산이 서로 덮어쓰지 않게 합니다.
        const [users] = await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
        if (!users.length) {
            await connection.rollback();
            return false;
        }

        const [records] = await connection.execute(`SELECT start_time, pause_start_time, end_time FROM study_record
            WHERE id = ? AND user_num_id = ?
                AND (end_time IS NULL OR (end_time IS NOT NULL AND subject_id IS NULL)) FOR UPDATE`,
        [recordId, userId]);
        const record = records[0];
        // 중지 버튼에서 이미 고정한 종료 시각이 있으면 보존하고, 없을 때만 서버 시각을 생성합니다.
        const endDateTime = record?.end_time || new Date();
        if (!record || databaseDateTimeToDate(endDateTime) <= databaseDateTimeToDate(record.start_time)) {
            await connection.rollback();
            return false;
        }

        // 구간을 [start, end)로 간주합니다. 경계에서 맞닿기만 하면 겹친 것으로 보지 않습니다.
        const [overlaps] = await connection.execute(`SELECT id FROM study_record
            WHERE user_num_id = ? AND id != ? AND end_time IS NOT NULL
                AND start_time < ? AND end_time > ? LIMIT 1`,
        [userId, recordId, toDatabaseDateTime(endDateTime), record.start_time]);
        if (overlaps.length) {
            await connection.rollback();
            return false;
        }

        const additionalRest = !record.end_time && record.pause_start_time
            ? Math.max(0, Math.floor((databaseDateTimeToDate(endDateTime)
                - databaseDateTimeToDate(record.pause_start_time)) / 1000))
            : 0;
        // 기간 누계와 기록을 하나의 트랜잭션으로 처리하므로 어느 한쪽만 저장되는 상태를 방지합니다.
        // 겹침은 바로 위에서 같은 트랜잭션 안에 확인했으므로 UPDATE의 자기참조 서브쿼리는 두지 않습니다.
        const [result] = await connection.execute(`UPDATE study_record
            SET subject_id = ?, detail = ?, end_time = ?, rest_time = rest_time + ?, pause_start_time = NULL
            WHERE id = ? AND user_num_id = ? AND subject_id IS NULL
                AND (end_time IS NULL OR end_time = ?)
                AND EXISTS (SELECT 1 FROM user_subjects WHERE id = ? AND user_num_id = ?)`,
        [subjectId, detail, toDatabaseDateTime(endDateTime), additionalRest, recordId, userId,
            toDatabaseDateTime(endDateTime), subjectId, userId]);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return false;
        }

        // 기록의 시작 시각 기준 UTC 일/월/년에 대해 과목별 값과 사용자 전체 값을 다시 계산합니다.
        const period = getUtcStudyPeriods(record.start_time);
        await saveStudyTimeTotals(connection, userId, subjectId, period);

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 완료/진행 여부와 무관하게 로그인 사용자가 소유한 기록만 삭제합니다.
async function deleteStudyRecord(userId, recordId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // 같은 사용자의 기록 완료 처리와 삭제 처리를 직렬화해 누계가 일치하도록 합니다.
        await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
        const [records] = await connection.execute(`SELECT subject_id, start_time, end_time
            FROM study_record WHERE id = ? AND user_num_id = ? FOR UPDATE`, [recordId, userId]);
        const record = records[0];
        if (!record) {
            await connection.rollback();
            return false;
        }

        const [result] = await connection.execute(
            'DELETE FROM study_record WHERE id = ? AND user_num_id = ?', [recordId, userId],
        );
        if (result.affectedRows === 0) {
            await connection.rollback();
            return false;
        }

        // 진행 중 기록은 아직 누계에 들어가지 않았으므로 완료 기록을 지운 때만 합계를 다시 만듭니다.
        if (record.end_time !== null && record.subject_id !== null) {
            await saveStudyTimeTotals(
                connection, userId, record.subject_id, getUtcStudyPeriods(record.start_time),
            );
        }
        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 활성 상태인 기록에 한해서만 삭제할 수 있게 합니다.
async function deleteActiveStudyRecord(userId, recordId) {
    // 진행 중 기록이나 과목/설명을 아직 저장하지 않은 중지 기록을 취소할 수 있습니다.
    const result = await execute(`DELETE FROM study_record
        WHERE id = ? AND user_num_id = ?
            AND (end_time IS NULL OR (end_time IS NOT NULL AND subject_id IS NULL))`,
    [recordId, userId]);
    return result.affectedRows > 0;
}

// express-session 저장소는 콜백 인터페이스를 요구하므로 Promise 기반 MySQL 접근 결과를 연결합니다.
// select=true인 조회는 첫 행만 전달하며, 검색 결과가 없으면 express-session 규약에 맞춰 undefined를 전달합니다.
function callbackResult(promise, callback, select = false) {
    promise.then((result) => callback(null, select ? (result[0] || undefined) : result))
        .catch((error) => callback(error));
}

// 만료 시각이 현재보다 큰 세션만 조회해 이미 만료된 세션은 복원하지 않습니다.
function getSession(sid, callback) {
    callbackResult(query('SELECT sess FROM sessions WHERE sid = ? AND expired_at > ?', [sid, Date.now()]), callback, true);
}
// 같은 세션 ID가 있으면 새 직렬화 데이터와 만료 시각으로 덮어씁니다(MySQL UPSERT 문법).
function setSession(sid, serializedSession, expiresAt, callback) {
    callbackResult(execute(`INSERT INTO sessions (sid, sess, expired_at) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE sess = VALUES(sess), expired_at = VALUES(expired_at)`,
    [sid, serializedSession, expiresAt]), callback);
}
// 로그아웃 등으로 폐기된 세션 행을 제거합니다.
function deleteSession(sid, callback) {
    callbackResult(execute('DELETE FROM sessions WHERE sid = ?', [sid]), callback);
}
// 세션 본문은 유지하고 쿠키 만료 시각만 갱신합니다.
function touchSession(sid, expiresAt, callback) {
    callbackResult(execute('UPDATE sessions SET expired_at = ? WHERE sid = ?', [expiresAt, sid]), callback);
}
// 주기적인 정리 작업에서 만료 시각이 지난 세션을 일괄 삭제합니다.
function deleteExpiredSessions(callback) {
    callbackResult(execute('DELETE FROM sessions WHERE expired_at <= ?', [Date.now()]), callback);
}

// 라우트와 MySQLSessionStore가 사용할 DB 동작만 공개합니다.
module.exports = {
    getStudyRecords, getUserSubjects, createUserSubject, createActiveStudyRecord,
    getActiveStudyRecord, setStudyRecordPaused, stopActiveStudyRecord, addStudyRecordRestTime,
    finishActiveStudyRecord, deleteStudyRecord, deleteActiveStudyRecord,
    getSession, setSession, deleteSession, touchSession, deleteExpiredSessions,
};
