const dotenv = require('dotenv');
dotenv.config();

const express = require('express')
const app = express()
const cors = require('cors')
const path = require('path')

const port = process.env.PORT

app.use(cors())
app.use('/', express.static(path.join(__dirname, 'public')))

const index = require('./routes/index');
const login = require('./routes/login');

app.use('/', index);
app.use('/api/login', login); // Use the login route for handling login requests

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})