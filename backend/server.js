const dotenv = require('dotenv');
const express = require('express')
const app = express()
const cors = require('cors')
const path = require('path')
require('./database/init_setting_DB')

dotenv.config({ path: path.join(__dirname, '.env') }); //환경 변수 로드

const port = process.env.PORT || 8080

app.use(cors({
    origin: true,
    credentials: true,
}))
app.use(express.json())
app.use('/', express.static(path.join(__dirname, 'public')))

const index = require('./routes/index');
const signin = require('./routes/signin');
const signup = require('./routes/signup');
const studyRecord = require('./routes/studyRecord');
const studyPlan = require('./routes/studyPlan');

app.use('/api/signin', signin); // 로그인, 로그아웃 및 로그인 상태 API
app.use('/api/signup', signup);
app.use('/api/study-records', studyRecord);
app.use('/api/study-plans', studyPlan);
app.use('/', index);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})

