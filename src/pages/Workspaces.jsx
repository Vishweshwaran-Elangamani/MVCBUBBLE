import { useState, useEffect, useCallback } from "react";
import { apiCall }   from "../utils/api";
import { useToast }  from "../components/Toast";
import { Icon }      from "../components/Icons";
import ConfirmModal  from "../components/ConfirmModal";

/* ══════════════════════════════════════════
   INTEGRATION GUIDE MODAL  (unchanged — paste your existing one here)
══════════════════════════════════════════ */
function IntegrationGuideModal({ ws, onClose }) {
  const [tab,    setTab]    = useState("checklist");
  const [copied, setCopied] = useState("");

  function copy(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box ig-modal">
        <div className="modal-header">
          <div>
            <h3>🧩 Bubble Integration Guide</h3>
            <p className="er-subtitle">For workspace: <strong>{ws.name}</strong></p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="er-tabs" style={{ marginTop: 0, marginBottom: 16 }}>
          {[
            { key: "checklist",  label: "📋 Requirements"     },
            { key: "integrate",  label: "🔌 How to Integrate"  },
          ].map(t => (
            <button
              key={t.key}
              className={`er-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ig-body">
          {tab === "checklist" && (
            <>
              <div className="ig-section-title">✅ Your app MUST have</div>
              <div className="ig-check-list">
                <div className="ig-check-item">
                  <span className="ig-check-icon must">✓</span>
                  <div>
                    <strong>A logged-in user with an ID</strong>
                    <p>Your app must have user accounts. Each user must have a unique ID.</p>
                  </div>
                </div>
                <div className="ig-check-item">
                  <span className="ig-check-icon must">✓</span>
                  <div>
                    <strong>User stored somewhere after login</strong>
                    <p>The logged-in user's ID must be accessible via at least one of:</p>
                    <div className="ig-options">
                      <span className="ig-option">💾 localStorage</span>
                      <span className="ig-option">🌐 window.currentUser</span>
                      <span className="ig-option">🗃️ Redux / Zustand</span>
                      <span className="ig-option">🍪 Cookie</span>
                    </div>
                  </div>
                </div>
                <div className="ig-check-item">
                  <span className="ig-check-icon must">✓</span>
                  <div>
                    <strong>The Bubble snippet added to your app</strong>
                    <p>The script tag from the <strong>Snippet</strong> button must be in your HTML before <code>&lt;/body&gt;</code>.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "integrate" && (
            <>
              <div className="ig-integrate-step">
                <div className="ig-integrate-num">1</div>
                <div className="ig-integrate-content">
                  <div className="ig-integrate-title">Get your Snippet</div>
                  <div className="ig-integrate-desc">
                    Click the <strong>Snippet</strong> button on this workspace card and copy the full <code>&lt;script&gt;</code> tag.
                  </div>
                  <div className="ig-code-block">
                    <pre>{`<script src="https://yourserver.com/widget.js"
  data-workspace="${ws.slug}"
  data-key="YOUR_KEY">
</script>
</body>`}</pre>
                    <button
                      className="ig-copy"
                      onClick={() => copy(
                        `<script src="https://yourserver.com/widget.js" data-workspace="${ws.slug}" data-key="YOUR_KEY"></script>`,
                        "snip"
                      )}
                    >
                      {copied === "snip" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="ig-integrate-step">
                <div className="ig-integrate-num">2</div>
                <div className="ig-integrate-content">
                  <div className="ig-integrate-title">Store user ID after login</div>
                  <div className="ig-option-block">
                    <div className="ig-option-label">
                      Option A — localStorage <span className="ig-badge">Simplest</span>
                    </div>
                    <div className="ig-code-block">
                      <pre>{`localStorage.setItem("userId", user.id);
localStorage.setItem("email",  user.email);`}</pre>
                      <button
                        className="ig-copy"
                        onClick={() => copy(
                          `localStorage.setItem("userId", user.id);\nlocalStorage.setItem("email", user.email);`,
                          "ls"
                        )}
                      >
                        {copied === "ls" ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SOFT-DELETE CONFIRM MODAL
══════════════════════════════════════════ */
function DeleteConfirmModal({ wsName, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>🗑️ Schedule Workspace Deletion?</h3>
        <p className="modal-message">
          You are about to delete <strong>"{wsName}"</strong>.
        </p>
        <p className="modal-message" style={{ marginTop: 10, color: "#d97706", fontWeight: 600 }}>
          ⏳ Data will be permanently deleted after <strong>24 hours</strong>.
        </p>
        <p className="modal-message" style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
          During this period you can still restore the workspace or download a backup.
          After 24 hours, all notes, to-dos, reminders and messages will be gone forever.
        </p>
        <div className="modal-actions">
          <button className="secondary-btn" onClick={onCancel}>Cancel</button>
          <button className="danger-btn"    onClick={onConfirm}>Yes, Schedule Deletion</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function hoursUntilPurge(deletedAt) {
  if (!deletedAt) return 0;
  const purgeAt   = new Date(new Date(deletedAt).getTime() + 24 * 60 * 60 * 1000);
  const remaining = Math.max(0, Math.round((purgeAt - Date.now()) / (1000 * 60 * 60)));
  return remaining;
}

/** Formats the raw backup JSON into a nicely readable .txt document */
function formatBackupAsText(data) {
  const line  = "─".repeat(60);
  const thick = "═".repeat(60);
  const now   = new Date(data.exportedAt).toLocaleString([], {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const fmtDt = iso =>
    new Date(iso).toLocaleString([], {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  let out = "";
  out += `${thick}\n`;
  out += `  BUBBLE WORKSPACE BACKUP\n`;
  out += `  Workspace : ${data.workspaceName}  (#${data.slug})\n`;
  out += `  Exported  : ${now}\n`;
  out += `${thick}\n\n`;

  /* ── Notes ── */
  out += `📝  NOTES  (${data.notes.length})\n${line}\n`;
  if (!data.notes.length) {
    out += "  (no notes)\n";
  } else {
    data.notes.forEach((n, i) => {
      out += `\n[${fmtDt(n.createdAt)}]\n`;
      out += `${n.content}\n`;
      if (i < data.notes.length - 1) out += "\n";
    });
  }
  out += "\n\n";

  /* ── To-Do ── */
  const prioIcon = { high: "🔴", medium: "🟡", low: "🟢" };
  out += `✅  TO-DO LIST  (${data.todos.length})\n${line}\n`;
  if (!data.todos.length) {
    out += "  (no tasks)\n";
  } else {
    data.todos.forEach(t => {
      const check = t.done ? "[✓]" : "[ ]";
      const icon  = prioIcon[t.priority] || "⚪";
      const pLabel = (t.priority || "medium").toUpperCase().padEnd(6);
      out += `${icon}  [${pLabel}]  ${check}  ${t.content}\n`;
    });
  }
  out += "\n\n";

  /* ── Reminders ── */
  out += `🔔  REMINDERS  (${data.reminders.length})\n${line}\n`;
  if (!data.reminders.length) {
    out += "  (no reminders)\n";
  } else {
    data.reminders.forEach(r => {
      const ack  = r.acknowledged ? "✓ Acknowledged" : "⏰ Pending";
      out += `\n[Due: ${fmtDt(r.remindAt)}]  ${ack}\n`;
      out += `${r.content}\n`;
    });
  }
  out += "\n\n";

  /* ── General Chat ── */
  out += `💬  GENERAL MESSAGES  (${data.general.length})\n${line}\n`;
  if (!data.general.length) {
    out += "  (no messages)\n";
  } else {
    data.general.forEach(m => {
      const who = m.userEmail || `user·${m.userId?.slice(0, 6) || "?"}`;
      out += `\n[${fmtDt(m.createdAt)}]  ${who}\n`;
      if (m.replyToContent) {
        out += `  ↳ Replying to: "${m.replyToContent.slice(0, 60)}${m.replyToContent.length > 60 ? "…" : ""}"\n`;
      }
      out += `${m.content}${m.isEdited ? "  (edited)" : ""}\n`;
    });
  }
  out += "\n";
  out += `${thick}\n`;
  out += `  End of backup — Bubble App\n`;
  out += `${thick}\n`;

  return out;
}

/** Triggers a browser file download */
function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function WorkspacesPage({ onNavigate, searchFilter = "" }) {
  const [workspaces,   setWorkspaces]   = useState([]);
  const [name,         setName]         = useState("");
  const [loading,      setLoading]      = useState(false);
  const [confirm,      setConfirm]      = useState(null);  // { id, name }
  const [guideWs,      setGuideWs]      = useState(null);
  const [backupLoading,setBackupLoading]= useState({});    // { [wsId]: bool }
  const [toastEl,      showToast]       = useToast();

  const load = useCallback(async () => {
    try {
      const res  = await apiCall("/api/workspaces");
      const list = await res.json();
      setWorkspaces(list);
    } catch {
      showToast("Could not load workspaces — check your connection.", "error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function show(page, ws) { onNavigate(page, ws); }

  const displayed = searchFilter.trim()
    ? workspaces.filter(ws =>
        ws.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ws.slug.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : workspaces;

  /* ── Create ─────────────────────────────────────────── */
  async function create() {
    const trimmed = name.trim();
    if (!trimmed)           { showToast("Please enter a workspace name.", "error"); return; }
    if (trimmed.length < 2) { showToast("Name must be at least 2 characters.", "error"); return; }
    setLoading(true);
    try {
      const res = await apiCall("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setName(""); await load();
        showToast(`Workspace "${trimmed}" created!`, "success");
      } else if (res.status === 409) {
        showToast(`"${trimmed}" is already taken.`, "error");
      } else {
        showToast(`Failed to create "${trimmed}" (${res.status}).`, "error");
      }
    } catch {
      showToast("Cannot reach the server.", "error");
    }
    setLoading(false);
  }

  /* ── Soft Delete ────────────────────────────────────── */
  function del(id, wsName) { setConfirm({ id, name: wsName }); }

  async function handleConfirmDelete() {
    const { id, name: wsName } = confirm;
    setConfirm(null);
    try {
      const res = await apiCall(`/api/workspaces/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        await load();
        showToast(
          `"${wsName}" will be permanently deleted in 24 hours. Download a backup if needed.`,
          "success"
        );
      } else {
        showToast(`Could not schedule deletion — please try again.`, "error");
      }
    } catch {
      showToast("Cannot reach the server.", "error");
    }
  }

  /* ── Restore ─────────────────────────────────────────── */
  async function handleRestore(id, wsName) {
    try {
      const res = await apiCall(`/api/workspaces/${id}/restore`, { method: "POST" });
      if (res.ok || res.status === 204) {
        await load();
        showToast(`"${wsName}" has been restored — deletion cancelled! ✅`, "success");
      } else {
        showToast(`Could not restore "${wsName}".`, "error");
      }
    } catch {
      showToast("Cannot reach the server.", "error");
    }
  }

  /* ── Backup Download ────────────────────────────────── */
  async function handleBackup(id, wsName) {
    setBackupLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await apiCall(`/api/workspaces/${id}/backup`);
      if (!res.ok) {
        showToast(`Could not fetch backup for "${wsName}".`, "error");
        return;
      }
      const data      = await res.json();
      const text      = formatBackupAsText(data);
      const dateStr   = new Date().toISOString().slice(0, 10);
      const filename  = `bubble-backup-${data.slug}-${dateStr}.txt`;
      downloadText(filename, text);
      showToast(`Backup for "${wsName}" downloaded! 💾`, "success");
    } catch {
      showToast("Backup failed — check your connection.", "error");
    } finally {
      setBackupLoading(prev => ({ ...prev, [id]: false }));
    }
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <>
      {toastEl}

      {confirm && (
        <DeleteConfirmModal
          wsName={confirm.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {guideWs && (
        <IntegrationGuideModal ws={guideWs} onClose={() => setGuideWs(null)} />
      )}

      <div className="create-row">
        <h2>Create Workspace</h2>
        <div className="create-row-inputs">
          <input
            placeholder="Workspace name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && create()}
          />
          <button
            className="primary-btn"
            onClick={create}
            disabled={loading || !name.trim()}
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      {searchFilter.trim() && (
        <p style={{ marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
          {displayed.length > 0
            ? `Showing ${displayed.length} result${displayed.length !== 1 ? "s" : ""} for "${searchFilter}"`
            : `No workspaces match "${searchFilter}"`}
        </p>
      )}

      <div className="grid">
        {displayed.length === 0 && !searchFilter.trim() && (
          <div className="empty-state">
            <div className="empty-state-icon">🏗️</div>
            <p>No workspaces yet — create one above to get started.</p>
          </div>
        )}

        {displayed.map(ws => {
          const isPending  = ws.isDeleted && ws.deletedAt;
          const hoursLeft  = isPending ? hoursUntilPurge(ws.deletedAt) : null;
          const isExpiring = isPending && hoursLeft <= 6;

          return (
            <div
              className="workspace-card"
              key={ws.id}
              style={isPending ? { opacity: 0.75, borderColor: "#fca5a5" } : undefined}
            >
              {/* ── Deletion Warning Banner ── */}
              {isPending && (
                <div style={{
                  background:   isExpiring ? "#fef2f2" : "#fffbeb",
                  borderBottom: `1px solid ${isExpiring ? "#fecaca" : "#fde68a"}`,
                  padding:      "8px 16px",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          8,
                  fontSize:     12,
                  fontWeight:   600,
                  color:        isExpiring ? "#dc2626" : "#92400e",
                }}>
                  {isExpiring ? "🔴" : "⏳"}
                  {hoursLeft <= 0
                    ? "Pending permanent deletion…"
                    : `Data will be deleted in ${hoursLeft}h`
                  }
                </div>
              )}

              {/* ── Card Body ── */}
              <div className="workspace-card-body">
                <div className="workspace-card-avatar">
                  {ws.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="workspace-card-info">
                  <h3>{ws.name}</h3>
                  <span className="workspace-slug">{ws.slug}</span>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="workspace-card-footer">
                {!isPending && (
                  <div className="workspace-actions-row">
                    <button className="secondary-btn" onClick={() => show("customize", ws)}>
                      <Icon.Customize /> Customize
                    </button>
                    <button className="secondary-btn" onClick={() => show("snippets", ws)}>
                      <Icon.Snippets /> Snippet
                    </button>
                    <button className="secondary-btn" onClick={() => setGuideWs(ws)}>
                      🔌 Integrate
                    </button>
                  </div>
                )}

                {/* Backup button — always visible, especially important when pending */}
                <div className="workspace-actions-row" style={{ marginTop: isPending ? 0 : 6 }}>
                  <button
                    className="secondary-btn"
                    onClick={() => handleBackup(ws.id, ws.name)}
                    disabled={backupLoading[ws.id]}
                    style={isPending ? {
                      background:   "#eff6ff",
                      borderColor:  "#bfdbfe",
                      color:        "#1d4ed8",
                      fontWeight:   700,
                      flex:         1,
                    } : { flex: 1 }}
                  >
                    {backupLoading[ws.id] ? "Preparing…" : "💾 Backup & Download"}
                  </button>
                </div>

                {/* Restore or Delete */}
                {isPending ? (
                  <button
                    className="secondary-btn"
                    style={{
                      background:  "#f0fdf4",
                      borderColor: "#bbf7d0",
                      color:       "#16a34a",
                      fontWeight:  700,
                      width:       "100%",
                      justifyContent: "center",
                      marginTop:   4,
                    }}
                    onClick={() => handleRestore(ws.id, ws.name)}
                  >
                    ↩️ Restore Workspace (cancel deletion)
                  </button>
                ) : (
                  <button
                    className="danger-btn"
                    onClick={() => del(ws.id, ws.name)}
                    style={{ marginTop: 4 }}
                  >
                    <Icon.Trash /> Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
