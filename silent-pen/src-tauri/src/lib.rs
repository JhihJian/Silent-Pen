// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::command;
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit};
use rand::rngs::OsRng;
use rand_core::TryRngCore;
use base64::{engine::general_purpose, Engine as _};
use std::fs::File;
use std::io::{BufRead, BufReader};

#[command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[command]
fn save_diary(content: String, datetime: String, words: u32, password: String) -> Result<(), String> {
    // 生成密钥
    let mut key_bytes = [0u8; 32];
    let hash = blake3::hash(password.as_bytes());
    key_bytes.copy_from_slice(&hash.as_bytes()[..32]);
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    // 生成随机 nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.try_fill_bytes(&mut nonce_bytes).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    // 明文格式：时间|字数|内容
    let plain = format!("{}|{}|{}", datetime, words, content);
    let ciphertext = cipher.encrypt(nonce, plain.as_bytes()).map_err(|e| e.to_string())?;
    // 拼接 nonce + 密文，base64 存储
    let mut out = Vec::new();
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    let b64 = general_purpose::STANDARD.encode(&out);
    // 写入文件
    let dir = "data";
    let file = "data/diary.enc";
    create_dir_all(dir).map_err(|e| e.to_string())?;
    let mut f = OpenOptions::new().create(true).append(true).open(file).map_err(|e| e.to_string())?;
    writeln!(f, "{}", b64).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
fn load_diary(password: String) -> Result<Vec<(String, String, u32)>, String> {
    let file = "data/diary.enc";
    let mut res = Vec::new();
    let mut key_bytes = [0u8; 32];
    let hash = blake3::hash(password.as_bytes());
    key_bytes.copy_from_slice(&hash.as_bytes()[..32]);
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let f = File::open(file).map_err(|_| "没有日记数据".to_string())?;
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
        // 明文格式：时间|字数|内容
        let mut parts = plain_str.splitn(3, '|');
        let datetime = parts.next().unwrap_or("").to_string();
        let words = parts.next().unwrap_or("0").parse::<u32>().unwrap_or(0);
        // 内容不返回
        let date = datetime.split(' ').next().unwrap_or("").to_string();
        let time = datetime.split(' ').nth(1).unwrap_or("").to_string();
        res.push((date, time, words));
    }
    Ok(res)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, save_diary, load_diary])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
