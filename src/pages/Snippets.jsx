import { useState, useEffect } from "react";
import { apiCall }   from "../utils/api";
import { useToast }  from "../components/Toast";
import { Icon }      from "../components/Icons";

export default function SnippetsPage({ initialWs, searchFilter = "" }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [snippet,    setSnippet]    = useState("");
  const [toastEl,    showToast]     = useToast();

  useEffect(() => {
    apiCall("/api/workspaces")
      .then(r => r.json())
      .then(list => {
        setWorkspaces(list);
        if (initialWs) {
          const target = list.find(w => w.id === initialWs.id);
          if (target) loadSnippet(target);
        }
      })
      .catch(() => showToast("Could not load workspaces — check your connection.", "error"));
  }, []);

  // ── Filter left sidebar list ────────────────────────────────────
  const displayedWorkspaces = searchFilter.trim()
    ? workspaces.filter(ws =>
        ws.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ws.slug.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : workspaces;

  async function loadSnippet(ws) {
    setSelected(ws);
    setSnippet("Loading...");
    try {
      const res = await apiCall(`/api/snippet/${ws.slug}`);
      if (res.ok) {
        const data = await res.json();
        setSnippet(data.snippet || "No snippet returned.");
        showToast(`Snippet loaded for "${ws.name}".`, "success");
      } else if (res.status === 404) {
        setSnippet("");
        showToast(`Workspace "${ws.name}" not found — try refreshing.`, "error");
      } else {
        setSnippet("");
        showToast(`Could not load snippet for "${ws.name}" (${res.status}).`, "error");
      }
    } catch {
      setSnippet("");
      showToast("Cannot reach the server — check your connection.", "error");
    }
  }

  function copy() {
    if (!snippet || snippet === "Loading...") return;
    navigator.clipboard.writeText(snippet)
      .then(() => showToast(`Snippet for "${selected.name}" copied to clipboard!`, "success"))
      .catch(() => showToast("Could not copy — please select the text manually.", "error"));
  }

  return (
    <>
      {toastEl}
      <div className="snippet-container">

        {/* ── Left workspace list ── */}
        <div className="snippet-list">
          <h3>Workspaces</h3>
          {displayedWorkspaces.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              {searchFilter.trim() ? `No results for "${searchFilter}"` : "No workspaces."}
            </p>
          )}
          {displayedWorkspaces.map(ws => (
            <div
              key={ws.id}
              className={`snippet-item${selected?.id === ws.id ? " active" : ""}`}
              onClick={() => loadSnippet(ws)}
            >
              {ws.name}
            </div>
          ))}
        </div>

        {/* ── Right snippet view ── */}
        <div className="snippet-view">
          <h2>Snippet</h2>
          {!selected ? (
            <div className="snippet-placeholder">
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon.Code />
              </div>
              <span>Select a workspace to view its embed snippet</span>
            </div>
          ) : (
            <>
              <button
                className="secondary-btn"
                onClick={copy}
                disabled={!snippet || snippet === "Loading..."}
                style={{ display: "flex", alignItems: "center", gap: 7, alignSelf: "flex-start" }}
              >
                <Icon.Copy /> Copy Snippet
              </button>
              <textarea className="snippet-textarea" readOnly value={snippet} />
            </>
          )}
        </div>

      </div>
    </>
  );
}
