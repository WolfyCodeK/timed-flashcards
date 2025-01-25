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

// Add this near the top with other state
struct AppState {
    system_tray_created: Mutex<bool>,
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
async fn toggle_system_tray_on(_app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut created = state.system_tray_created.lock().unwrap();
    if !*created {
        *created = true;
    }
    Ok(())
}

#[tauri::command]
async fn toggle_system_tray_off(_app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut created = state.system_tray_created.lock().unwrap();
    if *created {
        *created = false;
    }
    Ok(())
}

fn create_system_tray() -> SystemTray {
    let pause = CustomMenuItem::new("pause".to_string(), "Pause");
    let resume = CustomMenuItem::new("resume".to_string(), "Resume");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(pause)
        .add_item(resume)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
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
        .system_tray(create_system_tray())
        .on_window_event(|event| {
            if let WindowEvent::CloseRequested { api, .. } = event.event() {
                if event.window().label() == "deck-editor" {
                    // Prevent the window from closing
                    api.prevent_close();
                    
                    // Emit an event to the frontend to handle the close request
                    event.window().emit("close-requested", ()).unwrap();
                }
            }
        })
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "pause" => {
                        app.emit_all("deck-runner-command", "pause").unwrap();
                    }
                    "resume" => {
                        app.emit_all("deck-runner-command", "resume").unwrap();
                    }
                    "quit" => {
                        app.emit_all("deck-runner-command", "stop").unwrap();
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
