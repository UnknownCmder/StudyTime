const session = require('express-session');
const database = require('./database/db');

// express-session 쿠키의 만료 시각을 숫자형 타임스탬프로 반환합니다.
function getExpirationTime(sess) {
    return sess.cookie && sess.cookie.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + 24 * 60 * 60 * 1000;
}

// express-session과 SQLite DB 함수 사이를 연결하는 저장소입니다.
class SQLiteSessionStore extends session.Store {
    constructor(options = {}) {
        super(options);
        // 주기적으로 만료된 세션을 지워 DB에 불필요한 행이 쌓이지 않게 합니다.
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
        database.setSession(sid, JSON.stringify(sess), getExpirationTime(sess), callback);
    }

    // 로그아웃 등 세션 폐기 시 해당 행을 삭제합니다.
    destroy(sid, callback = () => {}) {
        database.deleteSession(sid, callback);
    }

    // 요청으로 세션이 갱신됐을 때 만료 시각을 연장합니다.
    touch(sid, sess, callback = () => {}) {
        database.touchSession(sid, getExpirationTime(sess), callback);
    }

    // 저장소 정리 타이머를 멈춥니다. 공유 DB 연결은 닫지 않습니다.
    close(callback = () => {}) {
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
        callback();
    }
}

// 앱에서 사용할 express-session 미들웨어를 생성합니다.
module.exports = (options = {}) => session({
    // 브라우저 쿠키와 세션 서명에 사용할 설정입니다.
    name: 'studytime_sid',
    secret: options.secret || process.env.SESSION_SECRET || 'studytime-development-secret-change-me',
    store: new SQLiteSessionStore({ cleanupInterval: options.cleanupInterval }),
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
