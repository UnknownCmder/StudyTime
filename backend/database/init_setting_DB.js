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
    user_text_id VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(20) NOT NULL
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
    subject_name VARCHAR(20) NOT NULL,
    subject_color VARCHAR(7) NOT NULL,
    study_time INTEGER default 0,

    UNIQUE (user_num_id, subject_name),
    
    FOREIGN KEY (user_num_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)`, (err) => {
    if (err) {
        console.error('Error creating user_subjects table:', err.message);
    } else {
        console.log('User_subjects table created or already exists.');
        db.run(`CREATE INDEX IF NOT EXISTS idx_user_subjects_user_num_id
            ON user_subjects (user_num_id, subject_name)`);
    }
});

//study_record 테이블 생성
db.run(`CREATE TABLE IF NOT EXISTS study_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_num_id INTEGER NOT NULL,
    subject_id INTEGER,
    detail VARCHAR(255),
    start_time DATETIME NOT NULL DEFAULT 0,
    end_time DATETIME DEFAULT 0,
    rest_time INTEGER NOT NULL DEFAULT 0,
    pause_start_time DATETIME DEFAULT 0,
    
    FOREIGN KEY (user_num_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (subject_id)
        REFERENCES user_subjects(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)`, (err) => {
    if (err) {
        console.error('Error creating study_record table:', err.message);
    } else {
        console.log('Study_record table created or already exists.');
        db.run(`CREATE INDEX IF NOT EXISTS idx_study_record_user_time
            ON study_record (user_num_id, start_time, end_time)`);
    }
});

// 일일 공부 계획 테이블
db.run(`CREATE TABLE IF NOT EXISTS daily_study_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_num_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    plan_date DATE NOT NULL,

    FOREIGN KEY (user_num_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (subject_id)
        REFERENCES user_subjects(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)`, (err) => {
    if (err) {
        console.error('Error creating daily_study_plan table:', err.message);
    } else {
        console.log('Daily_study_plan table created or already exists.');
        db.run(`CREATE INDEX IF NOT EXISTS idx_daily_study_plan
            ON daily_study_plan (user_num_id, plan_date)`);
    }
});

// 주별 공부 계획 테이블
db.run(`CREATE TABLE IF NOT EXISTS weekly_study_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_num_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    FOREIGN KEY (user_num_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (subject_id)
        REFERENCES user_subjects(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)`, (err) => {
    if (err) {
        console.error('Error creating weekly_study_plan table:', err.message);
    } else {
        console.log('Weekly_study_plan table created or already exists.');
        db.run(`CREATE INDEX IF NOT EXISTS idx_weekly_study_plan
            ON weekly_study_plan (user_num_id, start_time, end_time)`);
    }
});

// 일별, 월별, 연별 공부 총 시간 테이블
db.run(`CREATE TABLE IF NOT EXISTS user_total_study_time (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_num_id INTEGER NOT NULL UNIQUE,
    daily_time INTEGER default 0,
    monthly_time INTEGER default 0,
    yearly_time INTEGER default 0,
    total_study_time INTEGER default 0,

    FOREIGN KEY (user_num_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)`, (err) => {
    if (err) {
        console.error('Error creating user_total_study_time table:', err.message);
    } else {
        console.log('User_total_study_time table created or already exists.');

        db.run(`CREATE INDEX IF NOT EXISTS idx_user_total_study_time_user_num_id
            ON user_total_study_time (user_num_id DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_user_total_study_time_daily
            ON user_total_study_time (daily_time DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_user_total_study_time_monthly
            ON user_total_study_time (monthly_time DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_user_total_study_time_yearly
            ON user_total_study_time (yearly_time DESC)`);
    }
});
