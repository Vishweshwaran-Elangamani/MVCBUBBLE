import { useState, useEffect, useCallback } from "react";
import { apiCall }      from "../utils/api";
import { useToast }     from "../components/Toast";
import { Icon }         from "../components/Icons";
import ConfirmModal     from "../components/ConfirmModal";

export default function WorkspacesPage({ show, searchFilter = "" }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [name,       setName]       = useState("");
  const [loading,    setLoading]    = useState(false);
  const [confirm,    setConfirm]    = useState(null);
  const [toastEl,    showToast]     = useToast();

  const load = useCallback(async () => {
    try {
      const res = await apiCall("/api/workspaces");
      if (res.ok) setWorkspaces(await res.json());
      else showToast("Could not load workspaces — try refreshing.", "error");
    } catch {
      showToast("Cannot reach the server — check your connection.", "error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filter only when a search has been committed ──────────────
  const displayed = searchFilter.trim()
    ? workspaces.filter(ws =>
        ws.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ws.slug.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : workspaces;

  async function create() {
    const trimmed = name.trim();
    if (!trimmed)          { showToast("Please enter a workspace name.", "error"); return; }
    if (trimmed.length < 2){ showToast("Workspace name must be at least 2 characters.", "error"); return; }

    setLoading(true);
    try {
      const res = await apiCall("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setName("");
        await load();
        showToast(`Workspace "${trimmed}" created successfully!`, "success");
      } else if (res.status === 409) {
        showToast(`"${trimmed}" is already taken — choose a different name.`, "error");
      } else {
        showToast(`Failed to create "${trimmed}" (${res.status}) — please try again.`, "error");
      }
    } catch {
      showToast("Cannot reach the server — check your connection.", "error");
    }
    setLoading(false);
  }

  function del(id, wsName) { setConfirm({ id, name: wsName }); }

  async function handleConfirmDelete() {
    const { id, name: wsName } = confirm;
    setConfirm(null);
    try {
      const res = await apiCall(`/api/workspaces/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        await load();
        showToast(`"${wsName}" has been deleted.`, "success");
      } else {
        showToast(`Could not delete "${wsName}" — please try again.`, "error");
      }
    } catch {
      showToast("Cannot reach the server — check your connection.", "error");
    }
  }

  return (
    <>
      {toastEl}

      {confirm && (
        <ConfirmModal
          message={`You are about to delete the workspace "${confirm.name}". All associated configurations, snippets, and customizations will be permanently removed and cannot be recovered. Any services or integrations linked to this workspace will be disconnected and will stop functioning immediately.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirm(null)}
        />
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
          <button className="primary-btn" onClick={create} disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      {/* ── Search results label ── */}
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
            <p>No workspaces yet — create one above to get started.</p>
          </div>
        )}

        {displayed.map(ws => (
          <div className="workspace-card" key={ws.id}>
            <div>
              <h3>{ws.name}</h3>
              <p className="workspace-slug">slug: {ws.slug}</p>
            </div>
            <div className="workspace-actions">
              <div className="workspace-actions-row">
                <button className="secondary-btn" onClick={() => show("customize", ws)}>
                  <Icon.Customize /> Customize
                </button>
                <button className="secondary-btn" onClick={() => show("snippets", ws)}>
                  <Icon.Snippets /> Snippet
                </button>
              </div>
              <button className="danger-btn" onClick={() => del(ws.id, ws.name)}>
                <Icon.Trash /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
