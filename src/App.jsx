import { useState, useEffect } from "react";
import "./styles.css";
import Shell          from "./components/Shell";
import LoginPage      from "./pages/Login";
import WorkspacesPage from "./pages/Workspaces";
import CustomizePage  from "./pages/Customize";
import SnippetsPage   from "./pages/Snippets";

export default function App() {
  const [token,        setToken]        = useState(() => localStorage.getItem("bubble_token") || "");
  const [email,        setEmail]        = useState(() => localStorage.getItem("bubble_email") || "");
  const [page,         setPage]         = useState("workspaces");
  const [navExtra,     setNavExtra]     = useState(null);
  const [darkMode,     setDarkMode]     = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  function handleLogin(em) {
    setToken(localStorage.getItem("bubble_token"));
    setEmail(em);
  }

  function handleLogout() {
    localStorage.removeItem("bubble_token");
    localStorage.removeItem("bubble_email");
    setToken(""); setEmail("");
    setPage("workspaces"); setNavExtra(null);
    setSearchFilter("");
  }

  function showPage(pg, ws = null) {
    setPage(pg);
    setNavExtra(ws);
    setSearchFilter("");
  }

  if (!token) return <LoginPage onLogin={handleLogin} />;

  return (
    <Shell
      page={page}
      setPage={p => { setPage(p); setNavExtra(null); setSearchFilter(""); }}
      email={email}
      onLogout={handleLogout}
      darkMode={darkMode}
      toggleDark={() => setDarkMode(d => !d)}
      onSearch={setSearchFilter}
    >
      {page === "workspaces" && (
        <WorkspacesPage show={showPage} searchFilter={searchFilter} />
      )}
      {page === "customize" && (
        <CustomizePage initialWs={navExtra} searchFilter={searchFilter} key={navExtra?.id ?? "none"} />
      )}
      {page === "snippets" && (
        <SnippetsPage initialWs={navExtra} searchFilter={searchFilter} key={navExtra?.id ?? "none"} />
      )}
    </Shell>
  );
}
