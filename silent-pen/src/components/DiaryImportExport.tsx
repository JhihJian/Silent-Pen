import React, { useState, useRef } from "react";
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from "@tauri-apps/api/core";
import { usePassword } from "./PasswordManager";
import styles from '../pages/MainPage.module.css';

interface DiaryImportExportProps {
  onImportSuccess?: () => void;
}

const DiaryImportExport: React.FC<DiaryImportExportProps> = ({ onImportSuccess }) => {
  const [showExport, setShowExport] = useState(false);
  const [showExportPwd, setShowExportPwd] = useState(false);
  const [exportPwd, setExportPwd] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const { password } = usePassword();

  async function handleExportConfirm() {
    try {
      if (!exportPwd) {
        setError("请输入导出密码");
        return;
      }
      const filePath = await save({
        filters: [{ name: 'Text', extensions: ['txt'] }]
      });
      if (!filePath) return;
      let res = '';
      try {
        res = await invoke<string>("export_diary", { password: exportPwd, exportPwd });
      } catch (e: any) {
        const msg = e?.toString() || "导出失败，可能是密码错误或数据损坏";
        if (msg.includes("密码错误")) {
          setError("密码错误，请重试");
        } else {
          setError(msg);
        }
        return;
      }
      if (!res) {
        setError("没有可导出的数据");
        return;
      }
      await writeTextFile(filePath, res);
      setShowExportPwd(false);
      setExportPwd("");
    } catch (e: any) {
      setError(e?.toString() || "导出失败");
    }
  }

  async function handleImportConfirm() {
    try {
      if (!password) {
        setError("未设置加密密码");
        return;
      }
      const filePath = await open({ title: '选择导入文件' });
      if (!filePath) return;
      const content = await readTextFile(filePath);
      await invoke("import_diary", { password: '', importPwd: password, content });
      setShowImport(false);
      if (onImportSuccess) onImportSuccess();
    } catch (e: any) {
      setError(e?.toString() || "导入失败");
    }
  }

  return (
    <>
      {/* 右下角设置按钮 */}
      <div style={{position: 'fixed', bottom: 32, right: 32, zIndex: 100}}>
        <div style={{position: 'relative'}}>
          <button
            className={styles.secondaryButton}
            style={{fontSize: 20, width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #0001'}}
            onClick={() => setShowExport(v => !v)}
            aria-label="设置"
          >
            <span role="img" aria-label="设置">⚙️</span>
          </button>
          {showExport && (
            <div ref={menuRef} style={{position: 'absolute', right: 0, bottom: 56, background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px #0002', minWidth: 120, zIndex: 10, padding: 8}}>
              <button
                className={styles.secondaryButton}
                style={{width: '100%', justifyContent: 'flex-start', marginBottom: 4}}
                onClick={() => { setShowExport(false); setShowExportPwd(true); }}
              >导出</button>
              <button
                className={styles.secondaryButton}
                style={{width: '100%', justifyContent: 'flex-start'}}
                onClick={() => { setShowExport(false); setShowImport(true); }}
              >导入</button>
            </div>
          )}
        </div>
      </div>
      {/* 导出密码弹窗 */}
      {showExportPwd && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>请输入导出密码</div>
            <input
              type="text"
              value={exportPwd}
              onChange={e => setExportPwd(e.target.value)}
              className={styles.modalInput}
              autoFocus
            />
            <div className={styles.modalButtons}>
              <button
                onClick={handleExportConfirm}
                disabled={!exportPwd}
                className={styles.modalButtonPrimary}
              >确认</button>
              <button
                onClick={() => { setShowExportPwd(false); setExportPwd(""); }}
                className={styles.modalButtonSecondary}
              >取消</button>
            </div>
          </div>
        </div>
      )}
      {/* 导入弹窗 */}
      {showImport && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>请选择要导入的文件</div>
            <div className={styles.modalButtons}>
              <button
                onClick={handleImportConfirm}
                className={styles.modalButtonPrimary}
              >确认</button>
              <button
                onClick={() => { setShowImport(false); }}
                className={styles.modalButtonSecondary}
              >取消</button>
            </div>
          </div>
        </div>
      )}
      {/* 错误提示 */}
      {error && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalTitle} style={{color: '#d32f2f'}}>{error}</div>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setError("")}
                className={styles.modalButtonPrimary}
              >确定</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DiaryImportExport; 