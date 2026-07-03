use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub struct DbState(pub std::sync::Mutex<Connection>);

const LATEST_SCHEMA_VERSION: i64 = 3;

pub fn open(app_data_dir: PathBuf) -> Result<Connection> {
    let db_path = app_data_dir.join("nexo.db");
    let legacy_db_path = app_data_dir.join("financeiro.db");
    if !db_path.exists() && legacy_db_path.exists() {
        let _ = std::fs::copy(&legacy_db_path, &db_path);
    }
    let mut conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    migrate_schema(&mut conn)?;
    seed_default_categories(&conn)?;
    Ok(conn)
}

pub fn seed_default_categories(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }

    let categories = [
        (
            "cat-income-salary",
            "Salário",
            "#16A34A",
            "briefcase",
            "income",
        ),
        (
            "cat-income-freelance",
            "Freelance",
            "#22C55E",
            "wallet",
            "income",
        ),
        (
            "cat-income-investments",
            "Investimentos",
            "#0EA5E9",
            "trending-up",
            "income",
        ),
        (
            "cat-income-refund",
            "Reembolso",
            "#14B8A6",
            "refresh-cw",
            "income",
        ),
        (
            "cat-expense-food",
            "Alimentação",
            "#F97316",
            "utensils",
            "expense",
        ),
        (
            "cat-expense-market",
            "Mercado",
            "#EAB308",
            "shopping-cart",
            "expense",
        ),
        (
            "cat-expense-transport",
            "Transporte",
            "#3B82F6",
            "car",
            "expense",
        ),
        (
            "cat-expense-fuel",
            "Combustível",
            "#6366F1",
            "fuel",
            "expense",
        ),
        ("cat-expense-home", "Moradia", "#8B5CF6", "home", "expense"),
        (
            "cat-expense-health",
            "Saúde",
            "#EF4444",
            "heart-pulse",
            "expense",
        ),
        (
            "cat-expense-education",
            "Educação",
            "#06B6D4",
            "book-open",
            "expense",
        ),
        (
            "cat-expense-leisure",
            "Lazer",
            "#EC4899",
            "gamepad-2",
            "expense",
        ),
        (
            "cat-expense-subscriptions",
            "Assinaturas",
            "#64748B",
            "repeat",
            "expense",
        ),
        (
            "cat-expense-taxes",
            "Impostos",
            "#71717A",
            "receipt",
            "expense",
        ),
    ];

    for (id, name, color, icon, kind) in categories {
        conn.execute(
            "INSERT OR IGNORE INTO categories (id, name, color, icon, kind)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![id, name, color, icon, kind],
        )?;
    }

    Ok(())
}

pub(crate) fn migrate_schema(conn: &mut Connection) -> Result<()> {
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
            2 => {
                migrate_to_v3(conn)?;
                current_version = 3;
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

fn migrate_to_v3(conn: &mut Connection) -> Result<()> {
    let tx = conn.transaction()?;

    tx.execute_batch(
        "ALTER TABLE transactions ADD COLUMN transfer_account_id TEXT;

        CREATE INDEX IF NOT EXISTS idx_transactions_transfer_account_id
            ON transactions(transfer_account_id);",
    )?;

    set_schema_version(&tx, 3)?;
    tx.commit()
}
