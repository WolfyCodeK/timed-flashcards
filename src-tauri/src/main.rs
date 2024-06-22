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

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem, SystemTrayEvent, Manager};

fn main() {
    // Create the initial SystemTrayMenu with "Hide" item
    let hide_show = CustomMenuItem::new("hide_show".to_string(), "Hide");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");

    let tray_menu = SystemTrayMenu::new()
        .add_item(hide_show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    // Create the SystemTray
    let system_tray = SystemTray::new().with_menu(tray_menu);

    // Build the Tauri application
    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                let item_handle = app.tray_handle().get_item(&id);
                let window = app.get_window("main").unwrap();
                match id.as_str() {
                    "quit" => {
                        // Exit the application
                        std::process::exit(0);
                    }
                    "hide_show" => {
                        if window.is_visible().unwrap() {
                            window.hide().unwrap();
                            // Update menu item to "Show"
                            item_handle.set_title("Show").unwrap();
                        } else {
                            window.show().unwrap();
                            // Update menu item to "Hide"
                            item_handle.set_title("Hide").unwrap(); 
                        }
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let app_handle = event.window().app_handle();
                let item_handle = app_handle.tray_handle().get_item("hide_show");
                
                // Update menu item to "Show"
                item_handle.set_title("Show").unwrap(); 
                // Hide the window instead of closing it
                event.window().hide().unwrap(); 
                // Prevent the default close behavior
                api.prevent_close(); 
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
