const dotenv = require('dotenv');
const express = require('express')
const app = express()
const cors = require('cors')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '.env') }); //환경 변수 로드

const port = process.env.PORT

app.use(cors()) 
app.use(express.json())
app.use('/', express.static(path.join(__dirname, 'public')))

const index = require('./routes/index');
const login = require('./routes/login');

app.use('/', index);
// TODO: signup route가 생기면 여기에서 등록하세요.
app.use('/api/login', login); // Use the login route for handling login requests

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})
