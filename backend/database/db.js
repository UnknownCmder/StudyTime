const { query, execute } = require('./connectDB');

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
    return query('SELECT id, subject_name, subject_color FROM user_subjects WHERE user_num_id = ?', [userId]);
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
async function createActiveStudyRecord(userId, startDateTime) {
    const result = await execute(`INSERT INTO study_record
        (user_num_id, subject_id, detail, start_time, end_time, rest_time, pause_start_time)
        VALUES (?, NULL, NULL, ?, NULL, 0, NULL)`, [userId, toDatabaseDateTime(startDateTime)]);
    return { id: result.insertId };
}

// 가장 최근 진행 중 기록을 조회합니다. 진행 중 상태는 end_time IS NULL로 판정합니다.
async function getActiveStudyRecord(userId) {
    const rows = await query(`SELECT id, start_time, rest_time, pause_start_time
        FROM study_record WHERE user_num_id = ? AND end_time IS NULL
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

// 활성 기록만 일시정지하고 아직 pause_start_time이 비어 있을 때에만 변경합니다.
// 조건부 UPDATE는 동시에 들어온 중복 요청이 상태를 덮어쓰지 않게 합니다.
async function setStudyRecordPaused(userId, recordId, pauseStartTime) {
    const result = await execute(`UPDATE study_record SET pause_start_time = ?
        WHERE id = ? AND user_num_id = ? AND end_time IS NULL AND pause_start_time IS NULL`,
    [toDatabaseDateTime(pauseStartTime), recordId, userId]);
    return result.affectedRows > 0;
}

// 일시정지 시작과 재개 시각의 차이를 초 단위 휴식으로 누적합니다.
// UPDATE에도 이전 pause_start_time을 조건으로 넣어 조회 후 상태가 바뀐 경우를 걸러냅니다.
async function addStudyRecordRestTime(userId, recordId, resumeTime) {
    const rows = await query(`SELECT pause_start_time FROM study_record
        WHERE id = ? AND user_num_id = ? AND end_time IS NULL`, [recordId, userId]);
    const record = rows[0];
    if (!record || !record.pause_start_time) return false;
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
async function finishActiveStudyRecord(userId, recordId, subjectId, detail, endDateTime) {
    const rows = await query(`SELECT start_time, pause_start_time FROM study_record
        WHERE id = ? AND user_num_id = ? AND end_time IS NULL`, [recordId, userId]);
    const record = rows[0];
    if (!record) return false;
    if (databaseDateTimeToDate(endDateTime) <= databaseDateTimeToDate(record.start_time)) return false;

    // 구간을 [start, end)로 간주합니다. start < 기존 end && end > 기존 start일 때 실제 겹침입니다.
    const overlaps = await query(`SELECT id FROM study_record
        WHERE user_num_id = ? AND id != ? AND end_time IS NOT NULL
            AND start_time < ? AND end_time > ? LIMIT 1`,
    [userId, recordId, toDatabaseDateTime(endDateTime), record.start_time]);
    if (overlaps.length) return false;

    const additionalRest = record.pause_start_time
        ? Math.max(0, Math.floor((databaseDateTimeToDate(endDateTime)
            - databaseDateTimeToDate(record.pause_start_time)) / 1000))
        : 0;
    // 위에서 검사한 조건을 UPDATE에도 포함해 변경 직전 상태가 달라진 경쟁 상황을 방어합니다.
    const result = await execute(`UPDATE study_record
        SET subject_id = ?, detail = ?, end_time = ?, rest_time = rest_time + ?, pause_start_time = NULL
        WHERE id = ? AND user_num_id = ? AND end_time IS NULL
            AND EXISTS (SELECT 1 FROM user_subjects WHERE id = ? AND user_num_id = ?)
            AND NOT EXISTS (SELECT 1 FROM study_record AS existing
                WHERE existing.user_num_id = ? AND existing.id != ? AND existing.end_time IS NOT NULL
                    AND existing.start_time < ? AND existing.end_time > ?)`,
    [subjectId, detail, toDatabaseDateTime(endDateTime), additionalRest, recordId, userId,
        subjectId, userId, userId, recordId, toDatabaseDateTime(endDateTime), record.start_time]);
    return result.affectedRows > 0;
}

// 완료/진행 여부와 무관하게 로그인 사용자가 소유한 기록만 삭제합니다.
async function deleteStudyRecord(userId, recordId) {
    const result = await execute('DELETE FROM study_record WHERE id = ? AND user_num_id = ?', [recordId, userId]);
    return result.affectedRows > 0;
}

// 활성 상태인 기록에 한해서만 삭제할 수 있게 합니다.
async function deleteActiveStudyRecord(userId, recordId) {
    const result = await execute('DELETE FROM study_record WHERE id = ? AND user_num_id = ? AND end_time IS NULL', [recordId, userId]);
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
    getActiveStudyRecord, setStudyRecordPaused, addStudyRecordRestTime,
    finishActiveStudyRecord, deleteStudyRecord, deleteActiveStudyRecord,
    getSession, setSession, deleteSession, touchSession, deleteExpiredSessions,
};
