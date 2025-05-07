import React, { useEffect, useState, useRef } from "react";
import CalendarView from "../components/CalendarView";
import TimelineView from "../components/TimelineView";
import { getPassword } from "../utils/password";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import styles from './MainPage.module.css';
import { usePassword } from "../components/PasswordManager";
import DiaryImportExport from "../components/DiaryImportExport";

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
  const [showImportPwd, setShowImportPwd] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { password } = usePassword();

  useEffect(() => {
    async function fetchDiary() {
      setLoading(true);
      setError("");
      if (!password) {
        setError("未设置加密密码，请刷新页面");
        setLoading(false);
        return;
      }
      try {
        const res = await invoke<[string, string, number][]>("load_diary", { password });
        setDiaryList(res.map(([date, time, words]) => ({ date, time, words })));
      } catch (e: any) {
        setError(e?.toString() || "加载失败");
      }
      setLoading(false);
    }
    fetchDiary();
  }, [password]);

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
      let res = '';
      try {
        res = await invoke<string>("export_diary", { 
          password,
          exportPwd: password
        });
      } catch (e: any) {
        setError(e?.toString() || "导出失败，可能是密码错误或数据损坏");
        return;
      }
      if (!res) {
        setError("没有可导出的数据");
        return;
      }
      await writeTextFile(filePath, res);
      setShowExportPwd(false);
    } catch (e: any) {
      setError(e?.toString() || "导出失败");
    }
  }

  async function handleImport() {
    setShowImportPwd(true);
  }

  async function handleImportConfirm() {
    try {
      const filePath = await open({ title: '选择导入文件' });
      if (!filePath) return;
      const content = await readTextFile(filePath);
      await invoke("import_diary", { 
        password: '',
        importPwd: getPassword(),
        content
      });
      const res = await invoke<[string, string, number][]>("load_diary", { 
        password: getPassword() 
      });
      setDiaryList(res.map(([date, time, words]) => ({ date, time, words })));
      setShowImportPwd(false);
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
      <DiaryImportExport onImportSuccess={() => {
        // 重新加载日记列表
        if (password) {
          setLoading(true);
          setError("");
          invoke<[string, string, number][]>("load_diary", { password })
            .then(res => setDiaryList(res.map(([date, time, words]) => ({ date, time, words }))))
            .catch(e => setError(e?.toString() || "加载失败"))
            .finally(() => setLoading(false));
        }
      }} />

      {showExportPwd && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>确认导出所有日记？</div>
            <div className={styles.modalButtons}>
              <button
                onClick={handleExportConfirm}
                className={styles.modalButtonPrimary}
              >确认</button>
              <button
                onClick={() => { setShowExportPwd(false); }}
                className={styles.modalButtonSecondary}
              >取消</button>
            </div>
          </div>
        </div>
      )}

      {showImportPwd && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>请选择要导入的文件</div>
            <div className={styles.modalButtons}>
              <button
                onClick={handleImportConfirm}
                className={styles.modalButtonPrimary}
              >确认</button>
              <button
                onClick={() => { setShowImportPwd(false); }}
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