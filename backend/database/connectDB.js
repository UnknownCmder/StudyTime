const mysql = require('mysql2/promise');

// 프로세스 전체가 재사용할 MySQL 연결 풀입니다.
// 요청마다 새 연결을 열고 닫는 비용을 줄이고, 동시에 여러 요청이 쿼리를 실행할 수 있게 합니다.
const pool = mysql.createPool({
    // DB 접속 정보는 환경별로 달라지므로 .env에서 읽고, 로컬 개발 기본값도 제공합니다.
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'studytime',
    // 풀이 연결을 기다리고 최대 10개 연결을 재사용하게 합니다.
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // DATETIME을 UTC 기준으로 주고받아 클라이언트/서버 시간대 차이로 시각이 바뀌지 않게 합니다.
    timezone: 'Z',
    // DATETIME 컬럼은 JS Date로 받아 JSON 응답에서 ISO 날짜로 직렬화되게 합니다.
    dateStrings: false,
});

// SELECT처럼 행 목록을 돌려주는 쿼리 전용 함수입니다.
// execute는 값들을 준비된 문(statement)의 파라미터로 전달하여 SQL 주입을 방지합니다.
async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// INSERT/UPDATE/DELETE 및 DDL을 실행하고 insertId, affectedRows 같은 메타데이터를 반환합니다.
async function execute(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return result;
}

// DB 접근을 한 파일에 모아 라우트와 저장소 코드가 드라이버 세부사항을 직접 다루지 않게 합니다.
module.exports = { pool, query, execute };
