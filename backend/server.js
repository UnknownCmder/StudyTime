const dotenv = require('dotenv');
const express = require('express')
const app = express()
const cors = require('cors')
const path = require('path')
// .env 값을 읽은 뒤 세션 설정이 SESSION_SECRET을 참조하도록 합니다.
dotenv.config({ path: path.join(__dirname, '.env') }); //환경 변수 로드
// DB 모듈이 환경 변수로 연결 풀을 구성하므로 .env 로딩 뒤에 불러옵니다.
const { pool } = require('./database/connectDB')
const sessionMiddleware = require('./session')()

const port = process.env.PORT || 8080

app.use(cors({
    origin: true,
    credentials: true,
}))
app.use(express.json())
// API 라우트보다 먼저 세션을 복원해 각 라우트에서 req.session을 쓸 수 있게 합니다.
app.use(sessionMiddleware)
app.use('/', express.static(path.join(__dirname, 'public')))

const index = require('./routes/index');
const signin = require('./routes/signin');
const signup = require('./routes/signup');
const emailVerification = require('./routes/emailVerification');
const studyRecord = require('./routes/studyRecord');
const studyPlan = require('./routes/studyPlan');

app.use('/api/signin', signin); // 로그인, 로그아웃 및 로그인 상태 API
app.use('/api/signup', signup);
app.use('/api/email-verification', emailVerification);
app.use('/api/studyRecord', studyRecord);
app.use('/api/studyPlan', studyPlan);
app.use('/', index);

// 테이블이나 컬럼은 생성하지 않고, 설정한 MySQL 서버/DB에 연결할 수 있는지만 확인합니다.
// 접속 설정이 틀리거나 DB가 꺼져 있으면 HTTP 서버를 열지 않고 오류를 표시합니다.
pool.query('SELECT 1')
    .then(() => {
        // DB 연결 확인에 성공한 경우 API 요청을 받기 시작합니다.
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`)
        })
    })
    .catch(async (error) => {
        // 테이블 생성 오류가 아니라 MySQL 접속 오류입니다. 연결 풀을 닫고 실패 상태로 끝냅니다.
        console.error('Failed to connect to MySQL database:', error.message)
        await pool.end()
        process.exitCode = 1
    })

