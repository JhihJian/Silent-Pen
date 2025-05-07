import React, { createContext, useContext, useEffect, useState } from "react";
import { getPassword as getPwdFromStorage, setPassword as setPwdToStorage } from "../utils/password";

interface PasswordContextProps {
  password: string | null;
  setPassword: (pwd: string) => void;
}

const PasswordContext = createContext<PasswordContextProps>({
  password: null,
  setPassword: () => {},
});

export const usePassword = () => useContext(PasswordContext);

export const PasswordManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [password, setPasswordState] = useState<string | null>(getPwdFromStorage());
  const [showPwd, setShowPwd] = useState(!getPwdFromStorage());
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    function onStorageChange() {
      setPasswordState(getPwdFromStorage());
    }
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, []);

  const setPassword = (newPwd: string) => {
    setPwdToStorage(newPwd);
    setPasswordState(newPwd);
    setShowPwd(false);
    window.location.reload();
  };

  useEffect(() => {
    if (!getPwdFromStorage()) {
      setShowPwd(true);
    }
  }, [password]);

  return (
    <PasswordContext.Provider value={{ password, setPassword }}>
      {children}
      {showPwd && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 32px #0002', padding: 36, minWidth: 320, textAlign: 'center', color: '#1976d2', fontWeight: 600, fontSize: 18 }}>
            <div style={{ marginBottom: 16 }}>请设置你的日记本加密密码</div>
            <input
              type="text"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              style={{ width: '80%', fontSize: 16, padding: 8, borderRadius: 6, border: '1px solid #e3e3e3', marginBottom: 16 }}
              autoFocus
            />
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setPassword(pwd)}
                disabled={!pwd}
                style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, padding: '6px 32px', fontWeight: 600, cursor: !pwd ? 'not-allowed' : 'pointer', opacity: !pwd ? 0.6 : 1, marginRight: 12 }}
              >确认</button>
            </div>
          </div>
        </div>
      )}
    </PasswordContext.Provider>
  );
}; 