const dotenv = require('dotenv');
const express = require('express')
const app = express()
const cors = require('cors')
const path = require('path')
// .env 값을 읽은 뒤 세션 설정이 SESSION_SECRET을 참조하도록 합니다.
dotenv.config({ path: path.join(__dirname, '.env') }); //환경 변수 로드
// 테이블 초기화 코드를 실행하고, 공용 세션 미들웨어를 불러옵니다.
require('./database/init_setting_DB')
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
const studyRecord = require('./routes/studyRecord');
const studyPlan = require('./routes/studyPlan');

app.use('/api/signin', signin); // 로그인, 로그아웃 및 로그인 상태 API
app.use('/api/signup', signup);
app.use('/api/studyRecord', studyRecord);
app.use('/api/studyPlan', studyPlan);
app.use('/', index);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})

