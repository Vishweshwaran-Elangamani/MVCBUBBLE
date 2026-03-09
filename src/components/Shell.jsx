import { useState, useRef, useEffect } from "react";
import { Icon }       from "./Icons";
import ThemeBurst     from "./ThemeBurst";
import bubbleLogo     from "../assets/bubble-logo.png";

export default function Shell({
  page, setPage,
  email, onLogout,
  darkMode, toggleDark,
  onSearch,
  children,
}) {
  const [burst,      setBurst]      = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inputVal,   setInputVal]   = useState("");

  const themeBtnRef  = useRef(null);
  const searchBoxRef = useRef(null);
  const inputRef     = useRef(null);

  // ── Click outside → close & reset ──────────────────────────────
  useEffect(() => {
    function handleOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        closeSearch();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ── Reset search when page changes ─────────────────────────────
  useEffect(() => {
    closeSearch();
  }, [page]);

  function closeSearch() {
    setSearchOpen(false);
    setInputVal("");
    onSearch("");
  }

  function commitSearch() {
    onSearch(inputVal.trim());
  }

  function handleIconClick() {
    if (!searchOpen) {
      setSearchOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      commitSearch();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter")  commitSearch();
    if (e.key === "Escape") closeSearch();
  }

  // ── Theme burst ─────────────────────────────────────────────────
  function handleThemeToggle() {
    const btn = themeBtnRef.current;
    if (!btn) { toggleDark(); return; }
    const rect  = btn.getBoundingClientRect();
    const x     = rect.left + rect.width  / 2;
    const y     = rect.top  + rect.height / 2;
    const color = darkMode ? "#f4f6fb" : "#020617";
    setBurst({ x, y, color, key: Date.now() });
    setTimeout(() => toggleDark(), 415);
  }

  const NAV = [
    { id: "workspaces", label: "Workspaces", Ico: Icon.Workspaces },
    { id: "customize",  label: "Customize",  Ico: Icon.Customize  },
    { id: "snippets",   label: "Snippets",   Ico: Icon.Snippets   },
  ];

  return (
    <div className="layout">
      {burst && (
        <ThemeBurst key={burst.key} x={burst.x} y={burst.y}
          color={burst.color} onDone={() => setBurst(null)} />
      )}

      {/* ── Sidebar ── */}
      <div className="sidebar">
        <div className="logo">
          <img src={bubbleLogo} alt="Bubble" className="logo-img" />
          <span>Bubble</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ id, label, Ico }) => (
            <button
              key={id}
              className={`nav-item${page === id ? " active" : ""}`}
              onClick={() => setPage(id)}
            >
              <Ico /> {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-avatar">{email?.[0]?.toUpperCase() || "U"}</div>
          <div className="user-email">{email}</div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="main">
        <div className="header">
          <div className="header-left">
            <span className="welcome">Welcome back</span>
          </div>

          <div className="header-right">

            {/* ── Search box — always visible ── */}
            <div
              ref={searchBoxRef}
              className={`search-box${searchOpen ? " search-box--open" : ""}`}
            >
              {searchOpen && (
                <input
                  ref={inputRef}
                  placeholder="Search workspaces..."
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              )}
              <button className="search-icon-btn" onClick={handleIconClick}>
                <Icon.Search />
              </button>
            </div>

            <button ref={themeBtnRef} className="theme-toggle-global" onClick={handleThemeToggle}>
              {darkMode ? <Icon.Sun /> : <Icon.Moon />}
              {darkMode ? "Light" : "Dark"}
            </button>

            <button className="logout-btn" onClick={onLogout}>
              <Icon.Logout /> Logout
            </button>

          </div>
        </div>

        <div className="page">{children}</div>
      </div>
    </div>
  );
}
