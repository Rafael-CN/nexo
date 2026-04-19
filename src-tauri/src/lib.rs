mod commands;
mod db;
mod models;
mod seed;

use db::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let conn = db::open(app_data_dir)?;
            seed::seed_all(&conn)?;
            app.manage(DbState(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_accounts,
            commands::get_categories,
            commands::get_transactions,
            commands::add_transaction,
            commands::update_transaction,
            commands::delete_transaction,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
