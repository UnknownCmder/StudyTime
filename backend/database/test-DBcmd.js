const db = require('./connectDB');

db.run(`INSERT INTO users (id, password) VALUES (?, ?)`, ['admin', '1234'], 
    function(err) {
        if (err) {
            console.error('Failed to insert data:', err.message);
            return;
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
    }
);