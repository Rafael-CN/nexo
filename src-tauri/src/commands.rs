use tauri::State;
use crate::db::DbState;
use crate::models::{Account, Category, Transaction};

type CmdResult<T> = Result<T, String>;

fn e<E: std::fmt::Display>(err: E) -> String {
    err.to_string()
}

#[tauri::command]
pub fn get_accounts(state: State<DbState>) -> CmdResult<Vec<Account>> {
    let conn = state.0.lock().map_err(e)?;
    let mut stmt = conn
        .prepare("SELECT id, name, institution, type, balance, color, icon, last_four FROM accounts")
        .map_err(e)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                institution: row.get(2)?,
                account_type: row.get(3)?,
                balance: row.get(4)?,
                color: row.get(5)?,
                icon: row.get(6)?,
                last_four: row.get(7)?,
            })
        })
        .map_err(e)?;
    let accounts: Vec<Account> = rows.collect::<Result<Vec<_>, _>>().map_err(e)?;
    Ok(accounts)
}

#[tauri::command]
pub fn get_categories(state: State<DbState>) -> CmdResult<Vec<Category>> {
    let conn = state.0.lock().map_err(e)?;
    let mut stmt = conn
        .prepare("SELECT id, name, color, icon, kind FROM categories")
        .map_err(e)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                kind: row.get(4)?,
            })
        })
        .map_err(e)?;
    let categories: Vec<Category> = rows.collect::<Result<Vec<_>, _>>().map_err(e)?;
    Ok(categories)
}

#[tauri::command]
pub fn get_transactions(state: State<DbState>) -> CmdResult<Vec<Transaction>> {
    let conn = state.0.lock().map_err(e)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, amount, date, account_id, category_id, type,
                    is_projected, notes, recurrence_id
             FROM transactions ORDER BY date",
        )
        .map_err(e)?;
    let rows = stmt
        .query_map([], |row| {
            let is_projected: i32 = row.get(7)?;
            Ok(Transaction {
                id: row.get(0)?,
                title: row.get(1)?,
                amount: row.get(2)?,
                date: row.get(3)?,
                account_id: row.get(4)?,
                category_id: row.get(5)?,
                transaction_type: row.get(6)?,
                is_projected: is_projected != 0,
                notes: row.get(8)?,
                recurrence_id: row.get(9)?,
            })
        })
        .map_err(e)?;
    let transactions: Vec<Transaction> = rows.collect::<Result<Vec<_>, _>>().map_err(e)?;
    Ok(transactions)
}

#[tauri::command]
pub fn add_transaction(state: State<DbState>, txn: Transaction) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    conn.execute(
        "INSERT INTO transactions
           (id, title, amount, date, account_id, category_id, type, is_projected, notes, recurrence_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        rusqlite::params![
            txn.id, txn.title, txn.amount, txn.date,
            txn.account_id, txn.category_id, txn.transaction_type,
            txn.is_projected as i32, txn.notes, txn.recurrence_id
        ],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn update_transaction(state: State<DbState>, txn: Transaction) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    conn.execute(
        "UPDATE transactions SET
           title=?2, amount=?3, date=?4, account_id=?5, category_id=?6,
           type=?7, is_projected=?8, notes=?9, recurrence_id=?10
         WHERE id=?1",
        rusqlite::params![
            txn.id, txn.title, txn.amount, txn.date,
            txn.account_id, txn.category_id, txn.transaction_type,
            txn.is_projected as i32, txn.notes, txn.recurrence_id
        ],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn delete_transaction(state: State<DbState>, id: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    conn.execute("DELETE FROM transactions WHERE id=?1", [id])
        .map_err(e)?;
    Ok(())
}
