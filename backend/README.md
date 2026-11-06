# Backend setup

The backend uses MySQL. Existing SQLite data is not imported; the old SQLite file, if present, is left untouched.

`mysql2` is the MySQL driver dependency in `package.json` and `package-lock.json`. The backend uses its Promise API so route handlers and database functions can sequence queries with `async`/`await` and route failures through Express error handling.

1. Install and start MySQL Server, then use the database and tables you already created. If the database itself does not exist yet, create it once:

   ```sql
   CREATE DATABASE studytime CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Copy `.env.example` to `.env`, then set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and a long random `SESSION_SECRET` for your machine.
   Defaults connect to `localhost:3306`, user `root`, and database `studytime`.
3. Install dependencies and start the app from the repository root as usual. At startup, the backend checks the MySQL connection with `SELECT 1`; it does not create or alter databases, tables, columns, or indexes.

The MySQL account needs permission to run the application's SELECT, INSERT, UPDATE, and DELETE queries against the prepared tables. Do not use a production password in `.env.example`.

## User table requirements

The application stores a scrypt password hash in `users.hashed_pw`. The current hash format is 168 characters, so `VARCHAR(300)` is wide enough. If your table still uses `pw VARCHAR(30)`, rename and widen it before using signup:

```sql
ALTER TABLE users CHANGE COLUMN pw hashed_pw VARCHAR(300) NOT NULL;
```

Signup also relies on a unique constraint for `user_text_id` so duplicate account IDs are rejected by MySQL.
