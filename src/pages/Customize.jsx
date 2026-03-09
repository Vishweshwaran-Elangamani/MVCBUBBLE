import { useState, useEffect } from "react";
import { apiCall, darkenHex } from "../utils/api";
import { useToast }           from "../components/Toast";
import { Icon }               from "../components/Icons";

export default function CustomizePage({ initialWs, searchFilter = "" }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [color,      setColor]      = useState("#6366f1");
  const [text,       setText]       = useState("");
  const [previewBg,  setPreviewBg]  = useState("#1e3a8a");
  const [saving,     setSaving]     = useState(false);
  const [toastEl,    showToast]     = useToast();

  useEffect(() => {
    apiCall("/api/workspaces")
      .then(r => r.json())
      .then(list => {
        setWorkspaces(list);
        if (initialWs) {
          const target = list.find(w => w.id === initialWs.id);
          if (target) selectWs(target);
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

  async function selectWs(ws) {
    setSelected(ws);
    setColor("#6366f1");
    setText("");
    setPreviewBg("#1e3a8a");
    try {
      const res = await apiCall(`/api/workspaces/${ws.id}/appearance`);
      if (res.ok) {
        const app = await res.json();
        setColor(app.color || "#6366f1");
        setText(app.text  || "");
      }
    } catch {
      showToast(`Cannot reach server — showing defaults for "${ws.name}".`, "error");
    }
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await apiCall(`/api/workspaces/${selected.id}/appearance`, {
        method: "PUT",
        body: JSON.stringify({ color, text }),
      });
      if (res.ok || res.status === 204)
        showToast(`Appearance for "${selected.name}" saved!`, "success");
      else
        showToast(`Could not save — try again.`, "error");
    } catch {
      showToast("Cannot reach the server.", "error");
    }
    setSaving(false);
  }

  const displayText = text || selected?.name?.slice(0, 2).toUpperCase() || "●";
  const bubbleStyle = { "--bubble-color": color };
  const notesStyle  = {
    background: `linear-gradient(145deg, ${color}, ${darkenHex(color, 0.28)})`,
    boxShadow:  `0 6px 22px ${color}55`,
  };

  return (
    <>
      {toastEl}
      <div className="customize-wrapper">

        {/* ── Left workspace list ── */}
        <div className="workspace-side">
          <h3>Workspaces</h3>
          {displayedWorkspaces.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              {searchFilter.trim() ? `No results for "${searchFilter}"` : "No workspaces yet."}
            </p>
          )}
          {displayedWorkspaces.map(ws => (
            <div
              key={ws.id}
              className={`workspace-item${selected?.id === ws.id ? " active-item" : ""}`}
              onClick={() => selectWs(ws)}
            >
              {ws.name}
            </div>
          ))}
        </div>

        {/* ── Right panel ── */}
        {!selected ? (
          <div className="instruction-card">
            <div className="instruction-card-icon"><Icon.Palette /></div>
            <h3>Select a Workspace</h3>
            <p>Choose a workspace from the left panel to start customizing your bubble appearance.</p>
            <div className="instruction-steps">
              <div className="instruction-step">
                <span className="step-num">1</span> Click a workspace on the left
              </div>
              <div className="instruction-step">
                <span className="step-num">2</span> Pick a color and set bubble text
              </div>
              <div className="instruction-step">
                <span className="step-num">3</span> Hit "Save Changes" to apply
              </div>
            </div>
          </div>
        ) : (
          <div className="customize-main">

            {/* ── TOP ROW — controls + bubble preview ── */}
            <div className="top-row">
              <div className="control-panel">
                <h2>Bubble Settings — {selected.name}</h2>

                <div className="field-row">
                  <label>Bubble Color</label>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                  <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "monospace" }}>
                    {color}
                  </span>
                </div>

                <div className="field-row">
                  <label>Bubble Text</label>
                  <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    maxLength={10}
                    placeholder={selected.name.slice(0, 2).toUpperCase()}
                    style={{ width: 160 }}
                  />
                </div>

                <div className="field-row">
                  <label>Card BG</label>
                  <input type="color" value={previewBg} onChange={e => setPreviewBg(e.target.value)} />
                  <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "monospace" }}>
                    {previewBg}
                  </span>
                </div>

                <button className="primary-btn" onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

              <div className="preview-panel"
                style={{ background: previewBg, transition: "background 0.3s" }}>
                <div className="custom-bubble" style={bubbleStyle}>{displayText}</div>
              </div>
            </div>

            {/* ── BOTTOM ROW — browser mock + notes ── */}
            <div className="bottom-row">

              <div className="browser-window">
                <div className="browser-titlebar">
                  <div className="browser-dots">
                    <span className="bdot bdot-red" />
                    <span className="bdot bdot-yel" />
                    <span className="bdot bdot-grn" />
                  </div>
                  <div className="browser-tabs">
                    <div className="browser-tab active-tab">
                      <span className="tab-favicon" />
                      <span>My Website</span>
                      <span className="tab-close">✕</span>
                    </div>
                    <div className="browser-tab">
                      <span className="tab-favicon fav2" />
                      <span style={{ color: "#94a3b8" }}>New Tab</span>
                    </div>
                    <div className="tab-new-btn">＋</div>
                  </div>
                </div>

                <div className="browser-addressbar">
                  <div className="addr-icons">
                    <span className="addr-arrow">‹</span>
                    <span className="addr-arrow">›</span>
                    <span className="addr-arrow addr-refresh">↺</span>
                  </div>
                  <div className="addr-url">
                    <span className="addr-lock">🔒</span>
                    <span>https://mywebsite.com</span>
                  </div>
                  <div className="addr-menu">⋯</div>
                </div>

                <div className="browser-page">
                  <div className="demo-hero">
                    <div className="demo-hero-text">
                      <div className="demo-hero-title" />
                      <div className="demo-hero-sub" />
                      <div className="demo-hero-sub short" />
                      <div className="demo-hero-btn" />
                    </div>
                    <div className="demo-hero-img" />
                  </div>

                  <div className="demo-nav">
                    <div className="demo-nav-logo" />
                    <div className="demo-nav-links">
                      {[80, 60, 70, 55].map((w, i) => (
                        <div key={i} className="demo-nav-link" style={{ width: w }} />
                      ))}
                    </div>
                    <div className="demo-nav-btn" />
                  </div>

                  <div className="demo-cards">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="demo-card">
                        <div className="demo-card-icon" style={{
                          background: `linear-gradient(135deg,
                            ${["#6366f1", "#8b5cf6", "#ec4899"][i]},
                            ${["#8b5cf6", "#ec4899", "#f43f5e"][i]})`
                        }} />
                        <div className="demo-card-line" />
                        <div className="demo-card-line short" />
                        <div className="demo-card-line shorter" />
                      </div>
                    ))}
                  </div>

                  <div className="website-bubble" style={bubbleStyle}>{displayText}</div>
                </div>
              </div>

              <div className="notes-panel" style={notesStyle}>
                <h3>Notes</h3>
                {[
                  "Bubble appears bottom-right of website",
                  "Bubble color matches workspace theme",
                  "Embed bubble using snippet integration",
                ].map((n, i) => (
                  <div className="note-item" key={i}>{n}</div>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}
