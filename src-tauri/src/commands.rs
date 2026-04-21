use crate::db::{seed_default_categories, DbState};
use crate::models::{Account, Category, Goal, RecurrenceRule, Transaction};
use rusqlite::Connection;
use tauri::State;

type CmdResult<T> = Result<T, String>;

fn e<E: std::fmt::Display>(err: E) -> String {
    err.to_string()
}

fn account_exists(conn: &Connection, id: &str) -> CmdResult<bool> {
    entity_exists(conn, "accounts", id)
}

fn category_exists(conn: &Connection, id: &str) -> CmdResult<bool> {
    entity_exists(conn, "categories", id)
}

fn recurrence_rule_exists(conn: &Connection, id: &str) -> CmdResult<bool> {
    entity_exists(conn, "recurrence_rules", id)
}

fn entity_exists(conn: &Connection, table: &str, id: &str) -> CmdResult<bool> {
    let sql = format!("SELECT EXISTS(SELECT 1 FROM {table} WHERE id=?1)");
    let exists: i64 = conn.query_row(&sql, [id], |row| row.get(0)).map_err(e)?;
    Ok(exists != 0)
}

#[tauri::command]
pub fn get_accounts(state: State<DbState>) -> CmdResult<Vec<Account>> {
    let conn = state.0.lock().map_err(e)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, institution, type, balance, color, icon, last_four FROM accounts",
        )
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
pub fn add_account(state: State<DbState>, account: Account) -> CmdResult<()> {
    account.validate()?;
    let conn = state.0.lock().map_err(e)?;
    conn.execute(
        "INSERT INTO accounts (id, name, institution, type, balance, color, icon, last_four)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        rusqlite::params![
            account.id,
            account.name,
            account.institution,
            account.account_type,
            account.balance,
            account.color,
            account.icon,
            account.last_four
        ],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn update_account(state: State<DbState>, account: Account) -> CmdResult<()> {
    account.validate()?;
    let conn = state.0.lock().map_err(e)?;
    conn.execute(
        "UPDATE accounts SET name=?2, institution=?3, type=?4, balance=?5, color=?6, icon=?7, last_four=?8
         WHERE id=?1",
        rusqlite::params![
            account.id,
            account.name,
            account.institution,
            account.account_type,
            account.balance,
            account.color,
            account.icon,
            account.last_four
        ],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn delete_account(state: State<DbState>, id: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    let txn_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM transactions WHERE account_id=?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(e)?;
    if txn_count > 0 {
        return Err("Não é possível excluir uma conta com transações vinculadas.".into());
    }
    let goal_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM goals WHERE account_id=?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(e)?;
    if goal_count > 0 {
        return Err("Não é possível excluir uma conta com metas vinculadas.".into());
    }
    conn.execute("DELETE FROM accounts WHERE id=?1", [id])
        .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn add_category(state: State<DbState>, category: Category) -> CmdResult<()> {
    category.validate()?;
    let conn = state.0.lock().map_err(e)?;
    conn.execute(
        "INSERT INTO categories (id, name, color, icon, kind)
         VALUES (?1,?2,?3,?4,?5)",
        rusqlite::params![
            category.id,
            category.name,
            category.color,
            category.icon,
            category.kind
        ],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn update_category(state: State<DbState>, category: Category) -> CmdResult<()> {
    category.validate()?;
    let conn = state.0.lock().map_err(e)?;
    conn.execute(
        "UPDATE categories SET name=?2, color=?3, icon=?4, kind=?5 WHERE id=?1",
        rusqlite::params![
            category.id,
            category.name,
            category.color,
            category.icon,
            category.kind
        ],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn delete_category(state: State<DbState>, id: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM transactions WHERE category_id=?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(e)?;
    if count > 0 {
        return Err("Não é possível excluir uma categoria com transações vinculadas.".into());
    }
    conn.execute("DELETE FROM categories WHERE id=?1", [id])
        .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn get_recurrence_rules(state: State<DbState>) -> CmdResult<Vec<RecurrenceRule>> {
    let conn = state.0.lock().map_err(e)?;
    let mut stmt = conn
        .prepare("SELECT id, frequency, interval, until FROM recurrence_rules")
        .map_err(e)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(RecurrenceRule {
                id: row.get(0)?,
                frequency: row.get(1)?,
                interval: row.get(2)?,
                until: row.get(3)?,
            })
        })
        .map_err(e)?;
    let rules: Vec<RecurrenceRule> = rows.collect::<Result<Vec<_>, _>>().map_err(e)?;
    Ok(rules)
}

#[tauri::command]
pub fn add_recurrence_rule(state: State<DbState>, rule: RecurrenceRule) -> CmdResult<()> {
    rule.validate()?;
    let conn = state.0.lock().map_err(e)?;
    conn.execute(
        "INSERT INTO recurrence_rules (id, frequency, interval, until)
         VALUES (?1,?2,?3,?4)",
        rusqlite::params![rule.id, rule.frequency, rule.interval, rule.until],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn update_recurrence_rule(state: State<DbState>, rule: RecurrenceRule) -> CmdResult<()> {
    rule.validate()?;
    let conn = state.0.lock().map_err(e)?;
    conn.execute(
        "UPDATE recurrence_rules SET frequency=?2, interval=?3, until=?4 WHERE id=?1",
        rusqlite::params![rule.id, rule.frequency, rule.interval, rule.until],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn delete_recurrence_rule(state: State<DbState>, id: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM transactions WHERE recurrence_id=?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(e)?;
    if count > 0 {
        return Err("Não é possível excluir uma recorrência com transações vinculadas.".into());
    }

    conn.execute("DELETE FROM recurrence_rules WHERE id=?1", [id])
        .map_err(e)?;
    Ok(())
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
    txn.validate()?;
    let conn = state.0.lock().map_err(e)?;
    validate_transaction_refs(&conn, &txn)?;
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
    txn.validate()?;
    let conn = state.0.lock().map_err(e)?;
    validate_transaction_refs(&conn, &txn)?;
    conn.execute(
        "UPDATE transactions SET
           title=?2, amount=?3, date=?4, account_id=?5, category_id=?6,
           type=?7, is_projected=?8, notes=?9, recurrence_id=?10
         WHERE id=?1",
        rusqlite::params![
            txn.id,
            txn.title,
            txn.amount,
            txn.date,
            txn.account_id,
            txn.category_id,
            txn.transaction_type,
            txn.is_projected as i32,
            txn.notes,
            txn.recurrence_id
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

#[tauri::command]
pub fn get_goals(state: State<DbState>) -> CmdResult<Vec<Goal>> {
    let conn = state.0.lock().map_err(e)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, target_amount, current_amount, deadline,
                    account_id, status, monthly_contribution
             FROM goals",
        )
        .map_err(e)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Goal {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                target_amount: row.get(3)?,
                current_amount: row.get(4)?,
                deadline: row.get(5)?,
                account_id: row.get(6)?,
                status: row.get(7)?,
                monthly_contribution: row.get(8)?,
            })
        })
        .map_err(e)?;
    let goals: Vec<Goal> = rows.collect::<Result<Vec<_>, _>>().map_err(e)?;
    Ok(goals)
}

#[tauri::command]
pub fn add_goal(state: State<DbState>, goal: Goal) -> CmdResult<()> {
    goal.validate()?;
    let conn = state.0.lock().map_err(e)?;
    validate_goal_refs(&conn, &goal)?;
    conn.execute(
        "INSERT INTO goals
           (id, name, description, target_amount, current_amount, deadline, account_id, status, monthly_contribution)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        rusqlite::params![
            goal.id,
            goal.name,
            goal.description,
            goal.target_amount,
            goal.current_amount,
            goal.deadline,
            goal.account_id,
            goal.status,
            goal.monthly_contribution
        ],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn update_goal(state: State<DbState>, goal: Goal) -> CmdResult<()> {
    goal.validate()?;
    let conn = state.0.lock().map_err(e)?;
    validate_goal_refs(&conn, &goal)?;
    conn.execute(
        "UPDATE goals SET
           name=?2, description=?3, target_amount=?4, current_amount=?5,
           deadline=?6, account_id=?7, status=?8, monthly_contribution=?9
         WHERE id=?1",
        rusqlite::params![
            goal.id,
            goal.name,
            goal.description,
            goal.target_amount,
            goal.current_amount,
            goal.deadline,
            goal.account_id,
            goal.status,
            goal.monthly_contribution
        ],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn delete_goal(state: State<DbState>, id: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    conn.execute("DELETE FROM goals WHERE id=?1", [id])
        .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn reset_database(state: State<DbState>) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    conn.execute_batch(
        "DELETE FROM goals; DELETE FROM transactions; DELETE FROM recurrence_rules; DELETE FROM accounts; DELETE FROM categories;",
    )
    .map_err(e)?;
    seed_default_categories(&conn).map_err(e)?;
    Ok(())
}

fn validate_transaction_refs(conn: &Connection, txn: &Transaction) -> CmdResult<()> {
    if !account_exists(conn, &txn.account_id)? {
        return Err("Conta da transação não foi encontrada.".into());
    }

    if !category_exists(conn, &txn.category_id)? {
        return Err("Categoria da transação não foi encontrada.".into());
    }

    if let Some(recurrence_id) = &txn.recurrence_id {
        if !recurrence_rule_exists(conn, recurrence_id)? {
            return Err("Recorrência da transação não foi encontrada.".into());
        }
    }

    Ok(())
}

fn validate_goal_refs(conn: &Connection, goal: &Goal) -> CmdResult<()> {
    if let Some(account_id) = &goal.account_id {
        if !account_exists(conn, account_id)? {
            return Err("Conta da meta não foi encontrada.".into());
        }
    }

    Ok(())
}
