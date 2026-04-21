use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub struct DbState(pub std::sync::Mutex<Connection>);

const LATEST_SCHEMA_VERSION: i64 = 2;

pub fn open(app_data_dir: PathBuf) -> Result<Connection> {
    let db_path = app_data_dir.join("financeiro.db");
    let mut conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    migrate_schema(&mut conn)?;
    Ok(conn)
}

fn migrate_schema(conn: &mut Connection) -> Result<()> {
    let mut current_version = schema_version(conn)?;

    while current_version < LATEST_SCHEMA_VERSION {
        match current_version {
            0 => {
                migrate_to_v1(conn)?;
                current_version = 1;
            }
            1 => {
                migrate_to_v2(conn)?;
                current_version = 2;
            }
            _ => unreachable!("schema version is lower than latest but has no migration"),
        }
    }

    Ok(())
}

fn schema_version(conn: &Connection) -> Result<i64> {
    conn.query_row("PRAGMA user_version", [], |row| row.get(0))
}

fn set_schema_version(conn: &Connection, version: i64) -> Result<()> {
    conn.pragma_update(None, "user_version", version)
}

fn migrate_to_v1(conn: &mut Connection) -> Result<()> {
    let tx = conn.transaction()?;

    // Keep the initial schema non-destructive so existing local databases can be adopted safely.
    tx.execute_batch(
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
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date
            ON transactions(date);
        CREATE INDEX IF NOT EXISTS idx_transactions_account_id
            ON transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_category_id
            ON transactions(category_id);
        CREATE INDEX IF NOT EXISTS idx_goals_account_id
            ON goals(account_id);",
    )?;

    set_schema_version(&tx, 1)?;
    tx.commit()
}

fn migrate_to_v2(conn: &mut Connection) -> Result<()> {
    let tx = conn.transaction()?;

    tx.execute_batch(
        "CREATE TABLE IF NOT EXISTS recurrence_rules (
            id        TEXT PRIMARY KEY,
            frequency TEXT NOT NULL,
            interval  INTEGER NOT NULL,
            until     TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_recurrence_id
            ON transactions(recurrence_id);",
    )?;

    set_schema_version(&tx, 2)?;
    tx.commit()
}
