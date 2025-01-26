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
    CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    Manager, WindowEvent
};
use std::sync::Mutex;

struct AppState {
    system_tray_created: Mutex<bool>,
}

// Create system tray with just quit option
fn create_default_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let tray_menu = SystemTrayMenu::new()
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

// Create system tray with flashcard controls
fn create_flashcard_tray() -> SystemTrayMenu {
    let pause = CustomMenuItem::new("pause".to_string(), "Pause");
    let resume = CustomMenuItem::new("resume".to_string(), "Resume");
    let stop = CustomMenuItem::new("stop".to_string(), "Stop");
    
    SystemTrayMenu::new()
        .add_item(pause)
        .add_item(resume)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(stop)
}

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

#[tauri::command]
async fn start_decks(deck_ids: Vec<String>, app_handle: tauri::AppHandle) -> Result<(), String> {
    println!("Starting decks with IDs: {:?}", deck_ids);
    // Emit an event to start the decks
    app_handle.emit_all("deck-runner-command", "start").map_err(|e| e.to_string())?;
    println!("Emitted start command");
    Ok(())
}

#[tauri::command]
async fn toggle_system_tray_on(app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut created = state.system_tray_created.lock().unwrap();
    if !*created {
        *created = true;
        // Update tray menu to show flashcard controls
        app_handle.tray_handle().set_menu(create_flashcard_tray()).map_err(|e| e.to_string())?;
        // Hide main window
        if let Some(window) = app_handle.get_window("main") {
            window.hide().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn toggle_system_tray_off(app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut created = state.system_tray_created.lock().unwrap();
    if *created {
        *created = false;
        // Update tray menu to show just quit
        let quit = CustomMenuItem::new("quit".to_string(), "Quit");
        let menu = SystemTrayMenu::new().add_item(quit);
        app_handle.tray_handle().set_menu(menu).map_err(|e| e.to_string())?;
        // Show main window
        if let Some(window) = app_handle.get_window("main") {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn main() {
    let app_state = AppState {
        system_tray_created: Mutex::new(false),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            start_decks,
            toggle_system_tray_on,
            toggle_system_tray_off
        ])
        .system_tray(create_default_tray())  // Start with just quit option
        .on_window_event(|event| {
            if let WindowEvent::CloseRequested { api, .. } = event.event() {
                if event.window().label() == "deck-editor" {
                    // Prevent the window from closing immediately
                    api.prevent_close();
                    // Emit an event to check for unsaved changes
                    event.window().emit("close-requested", ()).unwrap();
                }
            }
        })
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    println!("System tray menu item clicked: {}", id);
                    match id.as_str() {
                        "pause" => {
                            println!("Emitting pause command");
                            app.emit_all("deck-runner-command", "pause").unwrap();
                        }
                        "resume" => {
                            println!("Emitting resume command");
                            app.emit_all("deck-runner-command", "resume").unwrap();
                        }
                        "stop" => {
                            println!("Emitting stop command");
                            app.emit_all("deck-runner-command", "stop").unwrap();
                            // Update tray menu back to just quit
                            let quit = CustomMenuItem::new("quit".to_string(), "Quit");
                            let menu = SystemTrayMenu::new().add_item(quit);
                            app.tray_handle().set_menu(menu).unwrap();
                            // Show main window
                            if let Some(window) = app.get_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
