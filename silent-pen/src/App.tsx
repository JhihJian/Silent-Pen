import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage";
import WritePage from "./pages/WritePage";
import { useEffect, useState } from "react";
import { getPassword, setPassword } from "./utils/password";
import "./App.css";

function App() {
  const [showPwd, setShowPwd] = useState(false);
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    if (!getPassword()) {
      setShowPwd(true);
    }
  }, []);

  function handleSetPwd() {
    setPassword(pwd);
    setShowPwd(false);
  }

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/write" element={<WritePage />} />
        </Routes>
      </Router>
      {showPwd && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 32px #0002', padding: 36, minWidth: 320, textAlign: 'center', color: '#1976d2', fontWeight: 600, fontSize: 18 }}>
            <div style={{ marginBottom: 16 }}>请设置你的日记本加密密码（明文显示）</div>
            <input
              type="text"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              style={{ width: '80%', fontSize: 16, padding: 8, borderRadius: 6, border: '1px solid #e3e3e3', marginBottom: 16 }}
              autoFocus
            />
            <div style={{ marginTop: 8 }}>
              <button
                onClick={handleSetPwd}
                disabled={!pwd}
                style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, padding: '6px 32px', fontWeight: 600, cursor: !pwd ? 'not-allowed' : 'pointer', opacity: !pwd ? 0.6 : 1, marginRight: 12 }}
              >确认</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
