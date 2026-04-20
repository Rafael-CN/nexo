use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub struct DbState(pub std::sync::Mutex<Connection>);

pub fn open(app_data_dir: PathBuf) -> Result<Connection> {
    let db_path = app_data_dir.join("financeiro.db");
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    create_tables(&conn)?;
    Ok(conn)
}

fn create_tables(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS accounts (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            institution TEXT NOT NULL,
            type        TEXT NOT NULL,
            balance     REAL NOT NULL,
            color       TEXT NOT NULL,
            icon        TEXT,
            last_four   TEXT
        );
        CREATE TABLE IF NOT EXISTS categories (
            id   TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            icon TEXT NOT NULL,
            kind TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id            TEXT PRIMARY KEY,
            title         TEXT NOT NULL,
            amount        REAL NOT NULL,
            date          TEXT NOT NULL,
            account_id    TEXT NOT NULL,
            category_id   TEXT NOT NULL,
            type          TEXT NOT NULL,
            is_projected  INTEGER NOT NULL DEFAULT 0,
            notes         TEXT,
            recurrence_id TEXT
        );
        CREATE TABLE IF NOT EXISTS goals (
            id                   TEXT PRIMARY KEY,
            name                 TEXT NOT NULL,
            description          TEXT,
            target_amount        REAL NOT NULL,
            current_amount       REAL NOT NULL,
            deadline             TEXT,
            account_id           TEXT,
            status               TEXT NOT NULL,
            monthly_contribution REAL
        );",
    )
}
