import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage";
import WritePage from "./pages/WritePage";
import { PasswordManager } from "./components/PasswordManager";
import "./App.css";

function App() {
  return (
    <PasswordManager>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/write" element={<WritePage />} />
        </Routes>
      </Router>
    </PasswordManager>
  );
}

export default App;
