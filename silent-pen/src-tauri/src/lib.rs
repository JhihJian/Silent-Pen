// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{command, AppHandle, State, Manager};
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit};
use rand_core::TryRngCore;
use rand_core::OsRng;
use base64::{engine::general_purpose, Engine as _};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use uuid::Uuid;

// 从密码生成密钥
fn derive_key(password: &str) -> Key<Aes256Gcm> {
    let mut key_bytes = [0u8; 32];
    let hash = blake3::hash(password.as_bytes());
    key_bytes.copy_from_slice(&hash.as_bytes()[..32]);
    Key::<Aes256Gcm>::from_slice(&key_bytes).clone()
}

// 获取日记文件路径
fn get_diary_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = get_app_data_dir(app)?;
    Ok(data_dir.join("diary.enc"))
}

#[command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 获取应用数据目录
fn get_app_data_dir(_app: &AppHandle) -> Result<PathBuf, String> {
    #[cfg(mobile)]
    {
        let path_result = _app.path().app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
        let mut data_dir = path_result;
        data_dir.push("data");
        Ok(data_dir)
    }
    #[cfg(not(mobile))]
    {
        let mut data_dir = std::env::current_dir().map_err(|e| e.to_string())?;
        data_dir.push("data");
        Ok(data_dir)
    }
}

#[command]
fn save_diary(
    app_handle: AppHandle,
    content: String, 
    datetime: String, 
    words: u32, 
    password: String
) -> Result<(), String> {
    let data_dir = get_app_data_dir(&app_handle)?;
    let key = derive_key(&password);
    let cipher = Aes256Gcm::new(&key);
    let mut nonce_bytes = [0u8; 12];
    let mut rng = OsRng;
    rng.try_fill_bytes(&mut nonce_bytes).map_err(|e| format!("生成随机数失败: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    // 生成唯一id
    let id = Uuid::new_v4().to_string();
    // 明文格式：id|时间|字数|内容
    let plain = format!("{}|{}|{}|{}", id, datetime, words, content);
    let ciphertext = cipher.encrypt(nonce, plain.as_bytes()).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    let b64 = general_purpose::STANDARD.encode(&out);
    create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let file_path = data_dir.join("diary.enc");
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| format!("打开文件失败: {:?} - {}", file_path, e))?;
    writeln!(f, "{}", b64).map_err(|e| format!("写入文件失败: {}", e))?;
    Ok(())
}

#[command]
fn load_diary(
    app_handle: AppHandle,
    password: String
) -> Result<Vec<(String, String, u32)>, String> {
    // 获取应用数据目录
    let data_dir = get_app_data_dir(&app_handle)?;
    let file_path = data_dir.join("diary.enc");
    
    println!("读取文件从路径: {:?}", file_path);
    
    let mut res = Vec::new();
    let key = derive_key(&password);
    let cipher = Aes256Gcm::new(&key);
    
    let f = match File::open(&file_path) {
        Ok(file) => file,
        Err(_) => return Ok(res), // 没有日记数据文件时返回空vec
    };
    let reader = BufReader::new(f);
    
    for line in reader.lines() {
        let line = line.map_err(|_| "读取文件失败".to_string())?;
        let data = general_purpose::STANDARD.decode(line).map_err(|_| "base64解码失败".to_string())?;
        if data.len() < 12 {
            continue;
        }
        let (nonce_bytes, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        let plain: Vec<u8> = match cipher.decrypt(nonce, ciphertext) {
            Ok(p) => p,
            Err(_) => return Err("密码错误或数据损坏".to_string()),
        };
        let plain_str = String::from_utf8_lossy(&plain);
        // 明文格式：id|时间|字数|内容
        let mut parts = plain_str.splitn(4, '|');
        let _id = parts.next().unwrap_or("");
        let datetime = parts.next().unwrap_or("").to_string();
        let words = parts.next().unwrap_or("0").parse::<u32>().unwrap_or(0);
        // 内容不返回
        let date = datetime.split(' ').next().unwrap_or("").to_string();
        let time = datetime.split(' ').nth(1).unwrap_or("").to_string();
        res.push((date, time, words));
    }
    Ok(res)
}

#[command]
fn export_diary(
    app_handle: AppHandle,
    password: String,
    _export_pwd: String
) -> Result<String, String> {
    let data_dir = get_app_data_dir(&app_handle)?;
    let file_path = data_dir.join("diary.enc");
    let mut res = Vec::new();
    let key = derive_key(&password);
    let cipher = Aes256Gcm::new(&key);
    let f = File::open(&file_path).map_err(|e| format!("没有日记数据: {}", e))?;
    let reader = BufReader::new(f);
    for line in reader.lines() {
        let line = line.map_err(|_| "读取文件失败".to_string())?;
        let data = general_purpose::STANDARD.decode(line).map_err(|_| "base64解码失败".to_string())?;
        if data.len() < 12 {
            continue;
        }
        let (nonce_bytes, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        let plain: Vec<u8> = match cipher.decrypt(nonce, ciphertext) {
            Ok(p) => p,
            Err(_) => return Err("密码错误或数据损坏".to_string()),
        };
        let plain_str = String::from_utf8_lossy(&plain);
        // 明文格式：id|时间|字数|内容
        let mut parts = plain_str.splitn(4, '|');
        let id = parts.next().unwrap_or("");
        let datetime = parts.next().unwrap_or("");
        let words = parts.next().unwrap_or("");
        let content = parts.next().unwrap_or("");
        res.push(format!("ID：{}
时间：{}
字数：{}
内容：
{}

", id, datetime, words, content));
    }
    Ok(res.join("---\n"))
}

#[command]
fn import_diary(
    app_handle: AppHandle,
    _password: String,
    _import_pwd: String,
    content: String
) -> Result<(), String> {
    let data_dir = get_app_data_dir(&app_handle)?;
    // 读取已有id集合
    let file_path = data_dir.join("diary.enc");
    let mut existing_ids = std::collections::HashSet::new();
    if let Ok(f) = File::open(&file_path) {
        let reader = BufReader::new(f);
        for line in reader.lines() {
            if let Ok(line) = line {
                if let Ok(data) = general_purpose::STANDARD.decode(&line) {
                    if data.len() >= 12 {
                        let (nonce_bytes, ciphertext) = data.split_at(12);
                        let nonce = Nonce::from_slice(nonce_bytes);
                        if let Ok(plain) = Aes256Gcm::new(&derive_key("dummy")).decrypt(nonce, ciphertext) {
                            let plain_str = String::from_utf8_lossy(&plain);
                            let mut parts = plain_str.splitn(4, '|');
                            if let Some(id) = parts.next() {
                                existing_ids.insert(id.to_string());
                            }
                        }
                    }
                }
            }
        }
    }
    // 生成密钥（用导入时的密码加密）
    let key = derive_key(&_import_pwd);
    let cipher = Aes256Gcm::new(&key);
    for entry in content.split("---\n") {
        let mut lines = entry.lines();
        let id_line = lines.next().unwrap_or("");
        let datetime_line = lines.next().unwrap_or("");
        let words_line = lines.next().unwrap_or("");
        let content_line = lines.skip(1).collect::<Vec<_>>().join("\n");
        let id = id_line.strip_prefix("ID：").unwrap_or("").trim();
        if id.is_empty() || existing_ids.contains(id) {
            continue;
        }
        let datetime = datetime_line.strip_prefix("时间：").unwrap_or("").trim();
        let words = words_line.strip_prefix("字数：").unwrap_or("").trim();
        // 明文格式：id|时间|字数|内容
        let plain = format!("{}|{}|{}|{}", id, datetime, words, content_line);
        let mut nonce_bytes = [0u8; 12];
        let mut rng = OsRng;
        rng.try_fill_bytes(&mut nonce_bytes).map_err(|e| format!("生成随机数失败: {}", e))?;
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = cipher.encrypt(nonce, plain.as_bytes()).map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        out.extend_from_slice(&nonce_bytes);
        out.extend_from_slice(&ciphertext);
        let b64 = general_purpose::STANDARD.encode(&out);
        create_dir_all(&data_dir).map_err(|e| e.to_string())?;
        let mut f = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&file_path)
            .map_err(|e| format!("打开文件失败: {:?} - {}", file_path, e))?;
        writeln!(f, "{}", b64).map_err(|e| format!("写入文件失败: {}", e))?;
        existing_ids.insert(id.to_string());
    }
    Ok(())
}

#[tauri::command]
async fn write_diary(
    app_handle: tauri::AppHandle,
    password: String,
    content: String,
) -> Result<(), String> {
    let diary_path = get_diary_path(&app_handle)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(diary_path)
        .map_err(|e| e.to_string())?;

    let mut nonce_bytes = [0u8; 12];
   let mut rng = OsRng;
    rng.try_fill_bytes(&mut nonce_bytes).map_err(|e| format!("生成随机数失败: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let key = derive_key(&password);
    let cipher = Aes256Gcm::new(&key);
    let encrypted = cipher.encrypt(nonce, content.as_bytes())
        .map_err(|e| e.to_string())?;

    let mut encrypted_data = nonce_bytes.to_vec();
    encrypted_data.extend_from_slice(&encrypted);
    let encoded = general_purpose::STANDARD.encode(encrypted_data);
    writeln!(file, "{}", encoded).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 这里可以按需注册更多插件
            app.handle().plugin(tauri_plugin_fs::init())?;
            app.handle().plugin(tauri_plugin_dialog::init())?;
            // 例如：注册日志插件（可选）
            // if cfg!(debug_assertions) {
            //     app.handle().plugin(
            //         tauri_plugin_log::Builder::default()
            //             .level(log::LevelFilter::Info)
            //             .build(),
            //     )?;
            // }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            load_diary,
            save_diary,
            export_diary,
            import_diary,
            write_diary,
            import_diary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}