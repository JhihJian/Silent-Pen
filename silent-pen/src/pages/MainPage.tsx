import React, { useEffect, useState } from "react";
import CalendarView from "../components/CalendarView";
import TimelineView from "../components/TimelineView";
import { getPassword } from "../utils/password";
import { invoke } from "@tauri-apps/api/core";

export interface DiaryMeta {
  date: string;
  time: string;
  words: number;
}

const MainPage: React.FC = () => {
  const [diaryList, setDiaryList] = useState<DiaryMeta[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
        const res = await invoke<[string, string, number][]>("load_diary", { password });
        setDiaryList(res.map(([date, time, words]) => ({ date, time, words })));
      } catch (e: any) {
        setError(e?.toString() || "加载失败");
      }
      setLoading(false);
    }
    fetchDiary();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fa' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 40px 12px 40px', background: '#fff', boxShadow: '0 2px 8px #f0f1f2',
      }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 2, color: '#1976d2' }}>沉默日记</h1>
        <a href="/write" style={{ textDecoration: 'none' }}>
          <button style={{
            background: '#1976d2', color: '#fff', border: 'none', borderRadius: 24, fontSize: 20,
            padding: '8px 24px', fontWeight: 600, boxShadow: '0 2px 8px #e3e3e3', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span style={{ fontSize: 26, lineHeight: 1, marginRight: 4 }}>+</span> 新建日记
          </button>
        </a>
      </header>
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '70vh', paddingTop: 32 }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #e3e3e3', padding: 32, minWidth: 360 }}>
          {loading ? <div style={{ color: '#888', textAlign: 'center' }}>加载中...</div> :
            error ? <div style={{ color: '#d32f2f', textAlign: 'center' }}>{error}</div> :
            <CalendarView diaryList={diaryList} />
          }
        </div>
        <div style={{ width: 420 }}>
          <TimelineView diaryList={diaryList} />
        </div>
      </main>
    </div>
  );
};

export default MainPage; 