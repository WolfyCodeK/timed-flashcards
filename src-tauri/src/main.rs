// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// #[tauri::command]
// fn add_flashcard(question: String, answer: String) -> Result<(), String> {
//     // Implement saving flashcard to a file or database
//     Ok(())
// }

use tauri::{
    CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem,
    SystemTrayEvent, Manager
};

#[tauri::command]
async fn read_text_file(path: String) -> Result<String, String> {
    match std::fs::read_to_string(path) {
        Ok(content) => Ok(content),
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
async fn write_text_file(path: String, content: String) -> Result<(), String> {
    match std::fs::write(path, content) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string())
    }
}

fn main() {
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let pause = CustomMenuItem::new("pause".to_string(), "Pause");
    let stop = CustomMenuItem::new("stop".to_string(), "Stop");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");

    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(pause)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(stop)
        .add_item(quit);

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file
        ])
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "show" => {
                        if let Some(window) = app.get_window("main") {
                            window.show().unwrap();
                        }
                    }
                    "pause" => {
                        app.emit_all("deck-runner-command", "pause").unwrap();
                    }
                    "stop" => {
                        app.emit_all("deck-runner-command", "stop").unwrap();
                        if let Some(window) = app.get_window("main") {
                            window.show().unwrap();
                        }
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
