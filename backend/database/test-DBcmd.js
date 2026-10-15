const db = require('./connectDB');
const { hashPassword } = require('../utils/password');

async function insertTestUser() {
    const password = await hashPassword('1234');

    db.run(`INSERT INTO users (id, password) VALUES (?, ?)`, ['admin', password],
        function(err) {
            if (err) {
                console.error('Failed to insert data:', err.message);
                return;
            }
            console.log(`A row has been inserted with rowid ${this.lastID}`);
        }
    );
}

insertTestUser();
