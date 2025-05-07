import React, { useState } from "react";
import 'react-calendar/dist/Calendar.css';
import Calendar from "react-calendar";
import type { DiaryMeta } from "../pages/MainPage";

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface CalendarViewProps {
  diaryList: DiaryMeta[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ diaryList }) => {
  const [selected, setSelected] = useState<Date | null>(null);
  const [showInfo, setShowInfo] = useState<{date: string, list: {time: string, words: number}[]} | null>(null);

  // 生成高亮日期集合
  const diaryDays = Array.from(new Set(diaryList.map(d => d.date)));

  return (
    <div>
      <Calendar
        onClickDay={(value) => {
          const key = formatDate(value);
          const list = diaryList.filter(d => d.date === key).map(d => ({ time: d.time, words: d.words }));
          if (list.length > 0) {
            setShowInfo({ date: key, list });
          } else {
            setShowInfo(null);
          }
          setSelected(value);
        }}
        tileContent={({ date, view }) => {
          const key = formatDate(date);
          if (view === 'month' && diaryDays.includes(key)) {
            return (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <span style={{
                  position: 'absolute', right: 2, bottom: 2, color: '#1976d2', fontWeight: 'bold', fontSize: 18
                }}>•</span>
              </div>
            );
          }
          return null;
        }}
        tileClassName={({ date, view }) => {
          const key = formatDate(date);
          if (view === 'month' && diaryDays.includes(key)) {
            return 'diary-day';
          }
          return undefined;
        }}
        value={selected}
      />
      {/* 自定义样式 */}
      <style>{`
        .diary-day {
          font-weight: bold !important;
          color: #1976d2 !important;
          background: #e3f0fc !important;
          border-radius: 8px !important;
        }
      `}</style>
      {showInfo && (
        <>
          <div
            style={{
              position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
              background: 'rgba(0,0,0,0.25)', zIndex: 1000
            }}
            onClick={() => setShowInfo(null)}
          />
          <div
            style={{
              position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
              background: '#fff', borderRadius: 12, boxShadow: '0 4px 32px #0002',
              padding: 32, minWidth: 260, zIndex: 1001, textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>日记信息</div>
            <div style={{ marginBottom: 6 }}><b>日期：</b>{showInfo.date}</div>
            <div style={{ textAlign: 'left', margin: '12px 0 0 0' }}>
              {showInfo.list.map((item, idx) => (
                <div key={idx} style={{ marginBottom: 6, color: '#1976d2', fontWeight: 500 }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{item.time}</span>
                  <span style={{ marginLeft: 16, color: '#444' }}>字数：{item.words}</span>
                </div>
              ))}
            </div>
            <button
              style={{ marginTop: 18, padding: '6px 24px', borderRadius: 8, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
              onClick={() => setShowInfo(null)}
            >关闭</button>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarView; 