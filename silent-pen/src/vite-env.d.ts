/// <reference types="vite/client" />

interface Window {
  __TAURI__?: {
    app: any;
    // 添加其他您可能需要的 Tauri 属性
  };
}
