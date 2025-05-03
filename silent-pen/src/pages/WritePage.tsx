import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getPassword } from "../utils/password";

function getNow() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

const WritePage: React.FC = () => {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState("");
  const now = getNow();
  const words = content.trim().length;

  async function handleSave() {
    setSaving(true);
    setError("");
    const password = getPassword();
    if (!password) {
      setError("未设置加密密码，请刷新页面");
      setSaving(false);
      return;
    }
    try {
      await invoke("save_diary", {
        content,
        datetime: now,
        words,
        password,
      });
      setShowDone(true);
      setTimeout(() => {
        setShowDone(false);
        window.location.href = "/";
      }, 1200);
    } catch (e: any) {
      setError("保存失败：" + (e?.toString() || "未知错误"));
    }
    setSaving(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fa', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 48 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #e3e3e3', padding: 32, minWidth: 360, width: 480, maxWidth: '90vw' }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 18, color: '#1976d2' }}>新建日记</div>
        <div style={{ color: '#888', marginBottom: 12 }}>当前时间：{now}</div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="写下你的想法...（内容不会被任何人看到）"
          style={{ width: '100%', minHeight: 180, fontSize: 16, borderRadius: 8, border: '1px solid #e3e3e3', padding: 12, resize: 'vertical', outline: 'none', marginBottom: 16 }}
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#1976d2', fontWeight: 500 }}>字数：{words}</span>
          <button
            onClick={handleSave}
            disabled={saving || words === 0}
            style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, padding: '8px 32px', fontWeight: 600, cursor: saving || words === 0 ? 'not-allowed' : 'pointer', opacity: saving || words === 0 ? 0.6 : 1 }}
          >{saving ? '保存中...' : '保存并封存'}</button>
        </div>
        {error && <div style={{ color: '#d32f2f', marginTop: 12 }}>{error}</div>}
      </div>
      {showDone && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 32px #0002', padding: 36, minWidth: 220, textAlign: 'center', color: '#1976d2', fontWeight: 600, fontSize: 20 }}>
            日记已封存！
          </div>
        </div>
      )}
    </div>
  );
};

export default WritePage; 