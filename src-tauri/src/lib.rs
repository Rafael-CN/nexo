mod backup;
mod commands;
mod db;
mod models;

use db::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let conn = db::open(app_data_dir)?;
            app.manage(DbState(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_accounts,
            commands::get_categories,
            commands::add_account,
            commands::update_account,
            commands::delete_account,
            commands::add_category,
            commands::update_category,
            commands::delete_category,
            commands::get_recurrence_rules,
            commands::add_recurrence_rule,
            commands::update_recurrence_rule,
            commands::delete_recurrence_rule,
            commands::get_transactions,
            commands::add_transaction,
            commands::update_transaction,
            commands::delete_transaction,
            commands::get_goals,
            commands::add_goal,
            commands::update_goal,
            commands::delete_goal,
            commands::reset_database,
            backup::export_backup,
            backup::import_backup,
            backup::export_transactions_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
