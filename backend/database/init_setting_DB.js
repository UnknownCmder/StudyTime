const db = require('./connectDB');

db.run('PRAGMA foreign_keys = ON;', (err) => { // 외래키 제약 조건 활성화
    if (err) {
        console.error('Error enabling foreign key constraints:', err.message);
    } else {
        console.log('Foreign key constraints enabled.');
    }
});

//users 테이블 생성
db.run(`CREATE TABLE IF NOT EXISTS users ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_text_id TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
)`, (err) => { 
    if (err) {
        console.error('Error creating users table:', err.message);
    } else {
        console.log('Users table created or already exists.');
    }
});

//user 공부 과목 테이블 생성
db.run(`CREATE TABLE IF NOT EXISTS user_subjects ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_num_id INTEGER NOT NULL,
    subject_name TEXT NOT NULL,
    subject_color TEXT NOT NULL,

    FOREIGN KEY (user_num_id) R
        EFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)`, (err) => {
    if (err) {
        console.error('Error creating user_subjects table:', err.message);
    } else {
        console.log('User_subjects table created or already exists.');
    }
});

//study_record 테이블 생성
db.run(`CREATE TABLE IF NOT EXISTS study_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_num_id INTEGER NOT NULL,
    subject_name TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER default 0,
    
    FOREIGN KEY (user_num_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (subject_name)
        REFERENCES user_subjects(subject_name)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)`, (err) => {
    if (err) {
        console.error('Error creating study_record table:', err.message);
    } else {
        console.log('Study_record table created or already exists.');
    }
});

db.run(`CREATE INDEX IF NOT EXISTS idx_study_record_user_time
    ON study_record (user_num_id, start_time, end_time)`);

//study_plan 테이블 생성
db.run(`CREATE TABLE IF NOT EXISTS study_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_num_id INTEGER NOT NULL,
    subject_name TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,

    FOREIGN KEY (user_num_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_name) REFERENCES user_subjects(subject_name) ON DELETE CASCADE
)`, (err) => {
    if (err) {
        console.error('Error creating study_plan table:', err.message);
    } else {
        console.log('Study_plan table created or already exists.');
    }
});

db.run(`CREATE INDEX IF NOT EXISTS idx_study_plan_user_time
    ON study_plan (user_num_id, start_time, end_time)`);
