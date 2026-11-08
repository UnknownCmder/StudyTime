const session = require('express-session');
const database = require('./database/db');

// express-session 쿠키의 만료 시각을 숫자형 타임스탬프로 반환합니다.
function getExpirationTime(sess) {
    return sess.cookie && sess.cookie.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + 24 * 60 * 60 * 1000;
}

// express-session의 Store 인터페이스를 MySQL 세션 테이블과 연결합니다.
// 세션 본문은 express-session이 직렬화한 JSON이고, DB 계층은 이를 그대로 보관합니다.
class MySQLSessionStore extends session.Store {
    constructor(options = {}) {
        super(options);
        // 오래된 세션 행이 계속 쌓이지 않도록 기본 15분마다 만료 행을 정리합니다.
        // cleanupInterval=0은 정리 타이머가 필요 없는 환경에서 이를 끄는 선택지입니다.
        if (options.cleanupInterval !== 0) {
            this.cleanupTimer = setInterval(
                () => database.deleteExpiredSessions(() => {}),
                options.cleanupInterval || 15 * 60 * 1000,
            );
            this.cleanupTimer.unref();
        }
    }

    // express-session이 요청 쿠키의 세션을 복구할 때 호출합니다.
    get(sid, callback) {
        // 저장 계층에서 만료 시각도 검사하므로 존재하지만 만료된 세션은 복원되지 않습니다.
        database.getSession(sid, (error, row) => {
            if (error) return callback(error);
            if (!row) return callback(null, null);
            try {
                callback(null, JSON.parse(row.sess));
            } catch (parseError) {
                callback(parseError);
            }
        });
    }

    // 세션이 새로 생성되거나 바뀌었을 때 DB에 저장합니다.
    set(sid, sess, callback = () => {}) {
        // express-session 객체를 JSON 문자열로 바꿔 MySQL TEXT 컬럼에 저장합니다.
        database.setSession(sid, JSON.stringify(sess), getExpirationTime(sess), callback);
    }

    // 로그아웃 등 세션 폐기 시 해당 행을 삭제합니다.
    destroy(sid, callback = () => {}) {
        // 로그아웃 시 현재 세션 ID에 해당하는 행을 제거합니다.
        database.deleteSession(sid, callback);
    }

    // 요청으로 세션이 갱신됐을 때 만료 시각을 연장합니다.
    touch(sid, sess, callback = () => {}) {
        // 세션 본문을 다시 쓰지 않고 만료 시각만 업데이트해 DB 쓰기를 줄입니다.
        database.touchSession(sid, getExpirationTime(sess), callback);
    }

    // 저장소 정리 타이머를 멈춥니다. 공유 DB 연결은 닫지 않습니다.
    close(callback = () => {}) {
        // 타이머만 종료합니다. 연결 풀은 앱 내 다른 DB 코드도 공유하므로 여기서 닫지 않습니다.
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
        callback();
    }
}

// 앱에서 사용할 express-session 미들웨어를 생성합니다.
module.exports = (options = {}) => session({
    // 브라우저 쿠키와 세션 서명에 사용할 설정입니다.
    name: 'studytime_sid',
    secret: options.secret || process.env.SESSION_SECRET || 'studytime-development-secret-change-me',
    // express-session 기본 메모리 저장소는 재시작 시 세션이 사라지므로 MySQL 저장소를 사용합니다.
    store: new MySQLSessionStore({ cleanupInterval: options.cleanupInterval }),
    // 변경 없는 세션의 불필요한 저장을 줄이는 설정입니다.
    resave: false,
    saveUninitialized: false,
    cookie: {
        // 자바스크립트에서 쿠키에 접근하지 못하게 하고, 기본 만료 시간을 하루로 둡니다.
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24,
    },
});
