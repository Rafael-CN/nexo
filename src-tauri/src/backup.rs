use crate::commands::{
    e, insert_account, insert_category, insert_goal, insert_recurrence_rule, insert_transaction,
    query_accounts, query_categories, query_goals, query_recurrence_rules, query_transactions,
    CmdResult,
};
use crate::db::DbState;
use crate::models::{Account, Category, Goal, RecurrenceRule, Transaction};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tauri::State;

pub const BACKUP_FORMAT: &str = "nexo-backup";
pub const BACKUP_VERSION: i64 = 1;

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupFile {
    pub format: String,
    pub version: i64,
    #[serde(rename = "exportedAt")]
    pub exported_at: String,
    pub data: BackupData,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupData {
    pub accounts: Vec<Account>,
    pub categories: Vec<Category>,
    #[serde(rename = "recurrenceRules", default)]
    pub recurrence_rules: Vec<RecurrenceRule>,
    pub transactions: Vec<Transaction>,
    #[serde(default)]
    pub goals: Vec<Goal>,
}

#[derive(Debug, Default, Serialize)]
pub struct ImportSummary {
    pub accounts: usize,
    pub categories: usize,
    #[serde(rename = "recurrenceRules")]
    pub recurrence_rules: usize,
    pub transactions: usize,
    pub goals: usize,
    pub skipped: usize,
}

pub fn build_backup(conn: &Connection, exported_at: String) -> CmdResult<BackupFile> {
    Ok(BackupFile {
        format: BACKUP_FORMAT.into(),
        version: BACKUP_VERSION,
        exported_at,
        data: BackupData {
            accounts: query_accounts(conn)?,
            categories: query_categories(conn)?,
            recurrence_rules: query_recurrence_rules(conn)?,
            transactions: query_transactions(conn)?,
            goals: query_goals(conn)?,
        },
    })
}

pub fn parse_backup(json: &str) -> CmdResult<BackupFile> {
    let backup: BackupFile = serde_json::from_str(json)
        .map_err(|_| "Arquivo inválido: não é um backup do Nexo.".to_string())?;

    if backup.format != BACKUP_FORMAT {
        return Err("Arquivo inválido: não é um backup do Nexo.".into());
    }
    if backup.version > BACKUP_VERSION {
        return Err(
            "Este backup foi criado por uma versão mais nova do Nexo. Atualize o aplicativo."
                .into(),
        );
    }

    validate_backup(&backup.data)?;
    Ok(backup)
}

/// Valida entidades e integridade referencial interna do backup.
fn validate_backup(data: &BackupData) -> CmdResult<()> {
    let account_ids: HashSet<&str> = data.accounts.iter().map(|a| a.id.as_str()).collect();
    let category_ids: HashSet<&str> = data.categories.iter().map(|c| c.id.as_str()).collect();
    let rule_ids: HashSet<&str> = data
        .recurrence_rules
        .iter()
        .map(|r| r.id.as_str())
        .collect();

    for account in &data.accounts {
        account.validate()?;
    }
    for category in &data.categories {
        category.validate()?;
    }
    for rule in &data.recurrence_rules {
        rule.validate()?;
    }
    for txn in &data.transactions {
        txn.validate()?;
        if !account_ids.contains(txn.account_id.as_str()) {
            return Err(format!(
                "Backup inconsistente: transação \"{}\" referencia conta inexistente.",
                txn.title
            ));
        }
        if txn.is_transfer() {
            let destination = txn.transfer_account_id.as_deref().unwrap_or("");
            if !account_ids.contains(destination) {
                return Err(format!(
                    "Backup inconsistente: transferência \"{}\" referencia conta de destino inexistente.",
                    txn.title
                ));
            }
        } else if !category_ids.contains(txn.category_id.as_str()) {
            return Err(format!(
                "Backup inconsistente: transação \"{}\" referencia categoria inexistente.",
                txn.title
            ));
        }
        if let Some(rule_id) = &txn.recurrence_id {
            if !rule_ids.contains(rule_id.as_str()) {
                return Err(format!(
                    "Backup inconsistente: transação \"{}\" referencia recorrência inexistente.",
                    txn.title
                ));
            }
        }
    }
    for goal in &data.goals {
        goal.validate()?;
        if let Some(account_id) = &goal.account_id {
            if !account_ids.contains(account_id.as_str()) {
                return Err(format!(
                    "Backup inconsistente: meta \"{}\" referencia conta inexistente.",
                    goal.name
                ));
            }
        }
    }

    Ok(())
}

/// Aplica o backup dentro de uma transação SQL.
/// mode "replace" apaga tudo antes; "merge" preserva registros existentes
/// (inserções são INSERT OR IGNORE por id).
pub fn apply_backup(
    conn: &mut Connection,
    data: &BackupData,
    mode: &str,
) -> CmdResult<ImportSummary> {
    if mode != "replace" && mode != "merge" {
        return Err("Modo de importação inválido.".into());
    }

    let tx = conn.transaction().map_err(e)?;

    if mode == "replace" {
        tx.execute_batch(
            "DELETE FROM goals; DELETE FROM transactions; DELETE FROM recurrence_rules; DELETE FROM accounts; DELETE FROM categories;",
        )
        .map_err(e)?;
    }

    let mut summary = ImportSummary::default();

    for category in &data.categories {
        match insert_category(&tx, category)? {
            0 => summary.skipped += 1,
            _ => summary.categories += 1,
        }
    }
    for account in &data.accounts {
        match insert_account(&tx, account)? {
            0 => summary.skipped += 1,
            _ => summary.accounts += 1,
        }
    }
    for rule in &data.recurrence_rules {
        match insert_recurrence_rule(&tx, rule)? {
            0 => summary.skipped += 1,
            _ => summary.recurrence_rules += 1,
        }
    }
    for txn in &data.transactions {
        match insert_transaction(&tx, txn)? {
            0 => summary.skipped += 1,
            _ => summary.transactions += 1,
        }
    }
    for goal in &data.goals {
        match insert_goal(&tx, goal)? {
            0 => summary.skipped += 1,
            _ => summary.goals += 1,
        }
    }

    tx.commit().map_err(e)?;
    Ok(summary)
}

pub fn build_transactions_csv(
    conn: &Connection,
    start_date: Option<&str>,
    end_date: Option<&str>,
) -> CmdResult<String> {
    let accounts = query_accounts(conn)?;
    let categories = query_categories(conn)?;
    let mut transactions = query_transactions(conn)?;
    if let Some(start) = start_date {
        transactions.retain(|txn| txn.date.as_str() >= start);
    }
    if let Some(end) = end_date {
        transactions.retain(|txn| txn.date.as_str() <= end);
    }
    transactions.sort_by(|a, b| a.date.cmp(&b.date).then_with(|| a.title.cmp(&b.title)));

    let account_name = |id: &str| -> String {
        find_name(
            accounts.iter().map(|a| (a.id.as_str(), a.name.as_str())),
            id,
        )
    };
    let category_name = |id: &str| -> String {
        find_name(
            categories.iter().map(|c| (c.id.as_str(), c.name.as_str())),
            id,
        )
    };

    // Separador ";" e decimal "," para abrir direto no Excel/LibreOffice pt-BR.
    let mut csv = String::from(
        "data;titulo;valor;tipo;conta;conta_destino;categoria;recorrente;projetada;notas\r\n",
    );
    for txn in &transactions {
        let kind = match txn.transaction_type.as_str() {
            "income" => "receita",
            "expense" => "despesa",
            _ => "transferencia",
        };
        let amount = format!("{:.2}", txn.amount).replace('.', ",");
        let destination = txn
            .transfer_account_id
            .as_deref()
            .map(account_name)
            .unwrap_or_default();
        let category = if txn.is_transfer() {
            String::new()
        } else {
            category_name(&txn.category_id)
        };

        let row = [
            txn.date.clone(),
            txn.title.clone(),
            amount,
            kind.to_string(),
            account_name(&txn.account_id),
            destination,
            category,
            if txn.recurrence_id.is_some() {
                "sim"
            } else {
                "nao"
            }
            .to_string(),
            if txn.is_projected { "sim" } else { "nao" }.to_string(),
            txn.notes.clone().unwrap_or_default(),
        ];
        csv.push_str(&row.map(|field| csv_escape(&field)).join(";"));
        csv.push_str("\r\n");
    }

    Ok(csv)
}

fn find_name<'a>(mut pairs: impl Iterator<Item = (&'a str, &'a str)>, id: &str) -> String {
    pairs
        .find(|(candidate, _)| *candidate == id)
        .map(|(_, name)| name.to_string())
        .unwrap_or_else(|| id.to_string())
}

fn csv_escape(field: &str) -> String {
    if field.contains(';') || field.contains('"') || field.contains('\n') || field.contains('\r') {
        format!("\"{}\"", field.replace('"', "\"\""))
    } else {
        field.to_string()
    }
}

#[tauri::command]
pub fn export_backup(state: State<DbState>, path: String, exported_at: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    let backup = build_backup(&conn, exported_at)?;
    let json = serde_json::to_string_pretty(&backup).map_err(e)?;
    std::fs::write(&path, json).map_err(|err| format!("Não foi possível salvar o arquivo: {err}"))
}

#[tauri::command]
pub fn import_backup(
    state: State<DbState>,
    json: String,
    mode: String,
) -> CmdResult<ImportSummary> {
    let backup = parse_backup(&json)?;
    let mut conn = state.0.lock().map_err(e)?;
    apply_backup(&mut conn, &backup.data, &mode)
}

#[tauri::command]
pub fn export_transactions_csv(
    state: State<DbState>,
    path: String,
    start_date: Option<String>,
    end_date: Option<String>,
) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    let csv = build_transactions_csv(&conn, start_date.as_deref(), end_date.as_deref())?;
    // BOM para o Excel reconhecer UTF-8.
    let contents = format!("\u{feff}{csv}");
    std::fs::write(&path, contents)
        .map_err(|err| format!("Não foi possível salvar o arquivo: {err}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate_schema;

    fn test_conn() -> Connection {
        let mut conn = Connection::open_in_memory().expect("in-memory db");
        migrate_schema(&mut conn).expect("schema");
        conn
    }

    fn sample_backup_json() -> String {
        serde_json::json!({
            "format": BACKUP_FORMAT,
            "version": BACKUP_VERSION,
            "exportedAt": "2026-07-03T12:00:00.000Z",
            "data": {
                "accounts": [
                    {"id": "acc-1", "name": "Corrente", "institution": "Banco", "type": "checking", "balance": 100.0, "color": "#111111", "icon": null, "lastFour": null},
                    {"id": "acc-2", "name": "Reserva", "institution": "Corretora", "type": "investment", "balance": 500.0, "color": "#222222", "icon": null, "lastFour": null}
                ],
                "categories": [
                    {"id": "cat-1", "name": "Salário", "color": "#0f0", "icon": "briefcase", "kind": "income"}
                ],
                "recurrenceRules": [
                    {"id": "rule-1", "frequency": "monthly", "interval": 1, "until": null}
                ],
                "transactions": [
                    {"id": "tx-1", "title": "Salário", "amount": 100.0, "date": "2026-07-01", "accountId": "acc-1", "categoryId": "cat-1", "type": "income", "isProjected": false, "notes": null, "recurrenceId": "rule-1", "transferAccountId": null},
                    {"id": "tx-2", "title": "Aporte", "amount": 50.0, "date": "2026-07-02", "accountId": "acc-1", "categoryId": "", "type": "transfer", "isProjected": false, "notes": null, "recurrenceId": null, "transferAccountId": "acc-2"}
                ],
                "goals": [
                    {"id": "goal-1", "name": "Reserva", "description": null, "targetAmount": 1000.0, "currentAmount": 100.0, "deadline": null, "accountId": "acc-2", "status": "active", "monthlyContribution": null}
                ]
            }
        })
        .to_string()
    }

    #[test]
    fn round_trips_export_and_import() {
        let mut conn = test_conn();
        let backup = parse_backup(&sample_backup_json()).expect("parse");
        let summary = apply_backup(&mut conn, &backup.data, "replace").expect("apply");

        assert_eq!(summary.accounts, 2);
        assert_eq!(summary.transactions, 2);
        assert_eq!(summary.goals, 1);
        assert_eq!(summary.skipped, 0);

        let exported = build_backup(&conn, "2026-07-03T13:00:00.000Z".into()).expect("export");
        assert_eq!(exported.data.accounts.len(), 2);
        assert_eq!(exported.data.transactions.len(), 2);

        let json = serde_json::to_string(&exported).expect("serialize");
        let reparsed = parse_backup(&json).expect("reparse");
        assert_eq!(reparsed.data.categories.len(), 1);
    }

    #[test]
    fn merge_skips_existing_records() {
        let mut conn = test_conn();
        let backup = parse_backup(&sample_backup_json()).expect("parse");
        apply_backup(&mut conn, &backup.data, "replace").expect("first apply");

        let summary = apply_backup(&mut conn, &backup.data, "merge").expect("merge");
        assert_eq!(summary.accounts, 0);
        assert_eq!(summary.transactions, 0);
        assert_eq!(summary.skipped, 7);
    }

    #[test]
    fn rejects_foreign_files_and_broken_references() {
        assert!(parse_backup("{\"foo\": 1}").is_err());
        assert!(parse_backup("not json").is_err());

        let broken =
            sample_backup_json().replace("\"accountId\":\"acc-1\"", "\"accountId\":\"missing\"");
        assert_ne!(broken, sample_backup_json());
        assert!(parse_backup(&broken).is_err());
    }

    #[test]
    fn builds_br_friendly_csv() {
        let mut conn = test_conn();
        let backup = parse_backup(&sample_backup_json()).expect("parse");
        apply_backup(&mut conn, &backup.data, "replace").expect("apply");

        let csv = build_transactions_csv(&conn, None, None).expect("csv");
        let lines: Vec<&str> = csv.trim_end().split("\r\n").collect();
        assert_eq!(lines.len(), 3);
        assert!(lines[0].starts_with("data;titulo;valor"));
        assert!(lines[1].contains("100,00"));
        assert!(lines[2].contains("transferencia"));
        assert!(lines[2].contains("Reserva"));

        let filtered = build_transactions_csv(&conn, Some("2026-07-02"), Some("2026-07-02"))
            .expect("filtered csv");
        assert_eq!(filtered.trim_end().split("\r\n").count(), 2);
    }
}
