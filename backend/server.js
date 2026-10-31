const dotenv = require('dotenv');
const express = require('express')
const app = express()
const cors = require('cors')
const path = require('path')
const session = require('express-session')
require('./database/init_setting_DB')

dotenv.config({ path: path.join(__dirname, '.env') }); //환경 변수 로드

const port = process.env.PORT || 8080

app.use(cors({
    origin: true,
    credentials: true,
}))
app.use(express.json())
app.use(session({
    name: 'studytime_sid',
    secret: process.env.SESSION_SECRET || 'studytime-development-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24,
    },
}))
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

