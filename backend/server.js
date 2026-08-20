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
const login = require('./routes/login');
const signup = require('./routes/signup');

app.use('/api/login', login); // Use the login route for handling login requests
app.use('/api/signup', signup);
app.use('/', index);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})
