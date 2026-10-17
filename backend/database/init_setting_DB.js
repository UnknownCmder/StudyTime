const db = require('./connectDB');

// db.run(`DROP TABLE IF EXISTS users`, (err) => { //users 테이블이 존재하면 삭제  
//     if (err) {
//         console.error('Error dropping users table:', err.message);
//     } else {
//         console.log('Users table dropped if it existed.');
//     }
// });

//users 테이블 생성
db.run(`CREATE TABLE IF NOT EXISTS users ( 
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL
)`, (err) => { 
    if (err) {
        console.error('Error creating users table:', err.message);
    } else {
        console.log('Users table created or already exists.');
    }
});

db.run(`CREATE TABLE IF NOT EXISTS study_time (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER default 0,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
)`, (err) => {
    if (err) {
        console.error('Error creating study_time table:', err.message);
    } else {
        console.log('Study_time table created or already exists.');
    }
});