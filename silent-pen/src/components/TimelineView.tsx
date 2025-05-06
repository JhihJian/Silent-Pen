import React from "react";
import type { DiaryMeta } from "../pages/MainPage";

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ marginRight: 8 }}>
    <rect x="4" y="8" width="12" height="8" rx="3" fill="#b0b8c1" stroke="#1976d2" strokeWidth="1.5"/>
    <path d="M7 8V6.5A3 3 0 0 1 13 6.5V8" stroke="#1976d2" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10" cy="12.5" r="1.2" fill="#1976d2" />
  </svg>
);

interface TimelineViewProps {
  diaryList: DiaryMeta[];
}

const TimelineView: React.FC<TimelineViewProps> = ({ diaryList }) => {
  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 6, color: '#1976d2', letterSpacing: 1 }}>封存日记时间轴</div>
      <div style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>所有日记内容已加密封存，无法查看，仅显示日期和字数</div>
      <div style={{ borderLeft: '3px dashed #b0b8c1', paddingLeft: 18 }}>
        {diaryList.length === 0 && <div style={{ color: '#888' }}>暂无封存日记</div>}
        {diaryList.map((item, idx) => (
          <div key={item.date + item.time + idx} style={{ marginBottom: 22, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{
              position: 'absolute', left: -32, top: 2, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#fff', borderRadius: '50%', boxShadow: '0 0 0 2px #b0b8c1', zIndex: 1
            }}>
              <LockIcon />
            </div>
            <span style={{ fontWeight: 500, fontSize: 15, color: '#444', fontVariantNumeric: 'tabular-nums' }}>{item.date} {item.time}</span>
            <span style={{ color: '#1976d2', marginLeft: 16, fontWeight: 500 }}>字数：{item.words}</span>
            <span style={{ marginLeft: 12, color: '#b0b8c1', fontSize: 13, fontStyle: 'italic' }}>已加密</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineView; 