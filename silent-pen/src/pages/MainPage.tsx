import React, { useEffect, useState, useRef } from "react";
import CalendarView from "../components/CalendarView";
import TimelineView from "../components/TimelineView";
import { getPassword } from "../utils/password";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import styles from './MainPage.module.css';

export interface DiaryMeta {
  date: string;
  time: string;
  words: number;
}

const MainPage: React.FC = () => {
  const [diaryList, setDiaryList] = useState<DiaryMeta[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showExportPwd, setShowExportPwd] = useState(false);
  const [exportPwd, setExportPwd] = useState("");
  const [showImportPwd, setShowImportPwd] = useState(false);
  const [importPwd, setImportPwd] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchDiary() {
      setLoading(true);
      setError("");
      const password = getPassword();
      if (!password) {
        setError("未设置加密密码，请刷新页面");
        setLoading(false);
        return;
      }
      try {
        const res = await invoke<[string, string, number][]>("load_diary", { 
          password 
        });
        setDiaryList(res.map(([date, time, words]) => ({ date, time, words })));
      } catch (e: any) {
        setError(e?.toString() || "加载失败");
      }
      setLoading(false);
    }
    fetchDiary();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  async function handleExport() {
    setShowExportPwd(true);
  }

  async function handleExportConfirm() {
    try {
      const password = getPassword();
      if (!password) {
        setError("未设置加密密码");
        return;
      }
      const filePath = await save({
        filters: [{
          name: 'Text',
          extensions: ['txt']
        }]
      });
      if (!filePath) return;
      
      const res = await invoke<string>("export_diary", { 
        password,
        exportPwd: exportPwd
      });
      
      await writeTextFile(filePath, res);
      setShowExportPwd(false);
      setExportPwd("");
    } catch (e: any) {
      setError(e?.toString() || "导出失败");
    }
  }

  async function handleImport() {
    setShowImportPwd(true);
  }

  async function handleImportConfirm() {
    try {
      const password = getPassword();
      if (!password) {
        setError("未设置加密密码");
        return;
      }
      const filePath = await open({
        filters: [{
          name: 'Text',
          extensions: ['txt']
        }]
      });
      if (!filePath) return;
      
      const content = await readTextFile(filePath);
      await invoke("import_diary", { 
        password,
        importPwd: importPwd,
        content
      });
      
      // 重新加载日记列表
      const res = await invoke<[string, string, number][]>("load_diary", { 
        password 
      });
      setDiaryList(res.map(([date, time, words]) => ({ date, time, words })));
      
      setShowImportPwd(false);
      setImportPwd("");
    } catch (e: any) {
      setError(e?.toString() || "导入失败");
    }
  }

  return (
    <div className={styles.container}>
      {/* 右下角设置按钮 */}
      <div style={{position: 'fixed', bottom: 32, right: 32, zIndex: 100}}>
        <div style={{position: 'relative'}}>
          <button
            className={styles.secondaryButton}
            style={{fontSize: 20, width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #0001'}}
            onClick={() => setShowMenu(v => !v)}
            aria-label="设置"
          >
            <span role="img" aria-label="设置">⚙️</span>
          </button>
          {showMenu && (
            <div ref={menuRef} style={{position: 'absolute', right: 0, bottom: 56, background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px #0002', minWidth: 120, zIndex: 10, padding: 8}}>
              <button
                className={styles.secondaryButton}
                style={{width: '100%', justifyContent: 'flex-start', marginBottom: 4}}
                onClick={() => { setShowMenu(false); handleExport(); }}
              >导出</button>
              <button
                className={styles.secondaryButton}
                style={{width: '100%', justifyContent: 'flex-start'}}
                onClick={() => { setShowMenu(false); handleImport(); }}
              >导入</button>
            </div>
          )}
        </div>
      </div>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>沉默日记</h1>
        </div>
        <a href="/write" style={{ textDecoration: 'none' }}>
          <button className={styles.primaryButton} style={{fontSize: 18, padding: '12px 32px', borderRadius: 12, boxShadow: '0 6px 24px #1976d244'}}>
            <span style={{ fontSize: 24, lineHeight: 1, marginRight: 8 }}>+</span> 新建日记
          </button>
        </a>
      </header>
      <main className={styles.main}>
        <div className={styles.calendarCard}>
          {loading ? <div className={styles.loading}>加载中...</div> :
            error ? <div className={styles.error}>{error}</div> :
            <CalendarView diaryList={diaryList} />
          }
        </div>
        <div className={styles.timelineContainer}>
          <TimelineView diaryList={diaryList} />
        </div>
      </main>

      {showExportPwd && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>请输入导出密码（明文显示）</div>
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

      {showImportPwd && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>请输入导入密码（明文显示）</div>
            <input
              type="text"
              value={importPwd}
              onChange={e => setImportPwd(e.target.value)}
              className={styles.modalInput}
              autoFocus
            />
            <div className={styles.modalButtons}>
              <button
                onClick={handleImportConfirm}
                disabled={!importPwd}
                className={styles.modalButtonPrimary}
              >确认</button>
              <button
                onClick={() => { setShowImportPwd(false); setImportPwd(""); }}
                className={styles.modalButtonSecondary}
              >取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage; 