(function () {

  /* ══════════════════════════════════════════
     BOOT GUARD
  ══════════════════════════════════════════ */
  if (window.__BUBBLE_BOOTED__) {
    if (window.BUBBLE_USER && window.BUBBLE_USER.id) {
      if (window.__bubble_show) window.__bubble_show(window.BUBBLE_USER);
    }
    return;
  }
  window.__BUBBLE_BOOTED__ = true;

  function start() {
    const u = window.BUBBLE_USER || {};
    if (!u || !u.id) return;

    const WORKSPACE = u.workspace || 'default';
    const KEY       = u.key       || '';
    const API       = 'http://localhost:5013';

    let USER_ID      = u.id;
    let USER_EMAIL   = u.email || '';
    let USER_DISPLAY = USER_EMAIL || `user·${USER_ID.slice(0, 6)}`;
    let USER_INITIAL = (USER_DISPLAY[0] || '?').toUpperCase();

    /* ── CSS ── */
    if (!document.getElementById('bubble-css')) {
      const css = document.createElement('link');
      css.id   = 'bubble-css';
      css.rel  = 'stylesheet';
      css.href = 'http://localhost:3000/widget.css';
      document.head.appendChild(css);
    }

    /* ── API HELPERS ── */
    function apiFetch(url, opt = {}) {
      opt.headers = Object.assign({ 'X-Workspace-Key': KEY }, opt.headers || {});
      return fetch(url, opt);
    }
    async function apiJson(url, opt = {}) {
      const r = await apiFetch(url, opt);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (r.status === 204 || r.headers.get('content-length') === '0') return null;
      const text = await r.text();
      return text ? JSON.parse(text) : null;
    }
    function jsonOpt(method, body) {
      return {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      };
    }

    /* ── STATE ── */
    let activeTab     = 'notes';
    let bubbleColor   = '#5b8def';
    let version       = 0;
    let editingNoteId = null;
    let todoFetching  = false;
    let activePatches = 0;

    let genReplyTo    = null;
    let genEditTarget = null;
    let genMenuOpen   = null;

    let deletionWarningShown = false;
    let longPollAborted      = false;

    const cache = { notes: null, todo: null, general: null, reminders: null };
    let reminderTimeouts = [];

    if (document.getElementById('bubble-panel')) {
      document.getElementById('bubble-btn').style.display = 'flex';
      return;
    }

    /* ════════════════════════════════
       BUILD PANEL
    ════════════════════════════════ */
    const panel = document.createElement('div');
    panel.id = 'bubble-panel';
    panel.innerHTML = `
      <div class="bp-header">
        <div class="bp-header-left">
          <div class="bp-avatar-self" id="bp-self-av">${USER_INITIAL}</div>
          <div class="bp-header-info">
            <div class="bp-title">Bubble</div>
            <div class="bp-subtitle">${WORKSPACE}</div>
          </div>
        </div>
        <button class="bp-close" title="Close">✕</button>
      </div>

      <div class="bp-tabs">
        <button class="bp-tab active" data-tab="notes">📝<span>Notes</span></button>
        <button class="bp-tab"        data-tab="todo">✅<span>To-Do</span></button>
        <button class="bp-tab"        data-tab="general">💬<span>General</span></button>
        <button class="bp-tab"        data-tab="reminders">🔔<span>Reminders</span></button>
      </div>

      <!-- NOTES -->
      <div class="bp-pane active" id="bp-pane-notes">
        <div class="bp-messages" id="bp-notes-list"></div>
        <div class="bp-composer" id="bp-notes-editing-bar" style="display:none">
          <span class="bp-editing-label">✏️ Editing…</span>
          <button class="bp-cancel-edit" id="bp-notes-cancel">Cancel</button>
        </div>
        <div class="bp-composer">
          <textarea class="bp-input" id="bp-notes-input" placeholder="Write a note…" rows="1"></textarea>
          <button class="bp-send" id="bp-notes-send" title="Send">↑</button>
        </div>
      </div>

      <!-- TO-DO -->
      <div class="bp-pane" id="bp-pane-todo">
        <div class="bp-todo-hero">
          <div class="bp-ring-wrap">
            <svg class="bp-ring" viewBox="0 0 80 80">
              <circle class="ring-bg"   cx="40" cy="40" r="30"/>
              <circle class="ring-fill" cx="40" cy="40" r="30" id="bp-ring-fill"/>
            </svg>
            <div class="bp-ring-inner">
              <span id="bp-todo-pct">0%</span>
              <small id="bp-todo-stat">0 / 0</small>
            </div>
          </div>
          <div class="bp-todo-legend">
            <div class="bp-legend-row"><span class="bp-dot bp-p-high"></span>High</div>
            <div class="bp-legend-row"><span class="bp-dot bp-p-medium"></span>Medium</div>
            <div class="bp-legend-row"><span class="bp-dot bp-p-low"></span>Low</div>
          </div>
        </div>
        <div class="bp-todo-list" id="bp-todo-list"></div>
        <div class="bp-composer">
          <input  class="bp-input"   id="bp-todo-input" placeholder="Add a task…"/>
          <select class="bp-pri-sel" id="bp-todo-pri">
            <option value="high">🔴</option>
            <option value="medium" selected>🟡</option>
            <option value="low">🟢</option>
          </select>
          <button class="bp-send" id="bp-todo-send">+</button>
        </div>
      </div>

      <!-- GENERAL -->
      <div class="bp-pane" id="bp-pane-general">
        <div class="bp-general-banner">
          <span>🌐 Workspace-wide · visible to all members</span>
        </div>
        <div class="bp-messages" id="bp-general-list"></div>
        <div class="bp-reply-banner" id="bp-reply-banner" style="display:none">
          <div class="bp-reply-banner-inner">
            <span class="bp-reply-banner-label"  id="bp-reply-banner-label">Replying to @someone</span>
            <span class="bp-reply-banner-preview" id="bp-reply-banner-preview"></span>
          </div>
          <button class="bp-reply-banner-close" id="bp-reply-cancel">✕</button>
        </div>
        <div class="bp-composer">
          <textarea class="bp-input" id="bp-general-input" placeholder="Say something to the team…" rows="1"></textarea>
          <button class="bp-send"    id="bp-general-send">↑</button>
        </div>
      </div>

      <!-- REMINDERS -->
      <div class="bp-pane" id="bp-pane-reminders">
        <div class="bp-reminders-list" id="bp-reminders-list"></div>
        <div class="bp-reminder-form">
          <input class="bp-input"             id="bp-rem-text" placeholder="Reminder message…"/>
          <input class="bp-input bp-dt-input" id="bp-rem-dt"   type="datetime-local"/>
          <button class="bp-send bp-rem-add"  id="bp-rem-add">Set 🔔</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    panel.style.display = 'none';

    /* ── BUTTON ── */
    const btn = document.createElement('div');
    btn.id = 'bubble-btn';
    btn.style.display = 'none';
    btn.innerHTML = `
      <span class="bl-label">●</span>
      <span class="bl-notif" id="bl-notif" style="display:none">!</span>`;
    document.body.appendChild(btn);

    /* ── REFS ── */
    const notesListEl  = panel.querySelector('#bp-notes-list');
    const notesInput   = panel.querySelector('#bp-notes-input');
    const notesSend    = panel.querySelector('#bp-notes-send');
    const editingBar   = panel.querySelector('#bp-notes-editing-bar');
    const cancelEdit   = panel.querySelector('#bp-notes-cancel');
    const todoListEl   = panel.querySelector('#bp-todo-list');
    const todoInput    = panel.querySelector('#bp-todo-input');
    const todoSend     = panel.querySelector('#bp-todo-send');
    const todoPri      = panel.querySelector('#bp-todo-pri');
    const ringFill     = panel.querySelector('#bp-ring-fill');
    const todoPct      = panel.querySelector('#bp-todo-pct');
    const todoStat     = panel.querySelector('#bp-todo-stat');
    const genListEl    = panel.querySelector('#bp-general-list');
    const genInput     = panel.querySelector('#bp-general-input');
    const genSend      = panel.querySelector('#bp-general-send');
    const replyBanner  = panel.querySelector('#bp-reply-banner');
    const replyLabel   = panel.querySelector('#bp-reply-banner-label');
    const replyPreview = panel.querySelector('#bp-reply-banner-preview');
    const replyCancel  = panel.querySelector('#bp-reply-cancel');
    const remListEl    = panel.querySelector('#bp-reminders-list');
    const remText      = panel.querySelector('#bp-rem-text');
    const remDt        = panel.querySelector('#bp-rem-dt');
    const remAdd       = panel.querySelector('#bp-rem-add');
    const selfAv       = panel.querySelector('#bp-self-av');
    const CIRC         = 2 * Math.PI * 30;

    /* ── POSITION ── */
    const BTN = 56;
    let btnPos = { left: 0, top: 0 };
    let collapsed = false, collapseSide = 'right';
    let lastPos = { left: 0, top: 0 };

    function initPos() {
      btnPos = { left: window.innerWidth - BTN - 16, top: window.innerHeight - BTN - 16 };
      applyPos(); lastPos = { ...btnPos };
    }
    function applyPos() {
      btn.style.left = btnPos.left + 'px';
      btn.style.top  = btnPos.top  + 'px';
    }
    initPos();

    window.addEventListener('resize', () => {
      btnPos.left = Math.min(btnPos.left, window.innerWidth  - BTN);
      btnPos.top  = Math.min(btnPos.top,  window.innerHeight - BTN);
      applyPos(); placePanel();
    });

    /* ── DRAG ── */
    let dragging = false, moved = false, off = [0, 0];
    function dragStart(cx, cy) {
      dragging = true; moved = false;
      btn.classList.add('dragging');
      const r = btn.getBoundingClientRect();
      off = [cx - r.left, cy - r.top];
    }
    function dragMove(cx, cy) {
      if (!dragging) return; moved = true;
      btnPos.left = Math.max(0, Math.min(window.innerWidth  - BTN, cx - off[0]));
      btnPos.top  = Math.max(0, Math.min(window.innerHeight - BTN, cy - off[1]));
      applyPos(); lastPos = { ...btnPos }; placePanel();
    }
    function dragEnd() {
      if (!dragging) return; dragging = false;
      btn.classList.remove('dragging');
      btn.classList.add('release');
      setTimeout(() => btn.classList.remove('release'), 350);
    }
    btn.addEventListener('mousedown',  e => dragStart(e.clientX, e.clientY));
    document.addEventListener('mousemove', e => dragMove(e.clientX, e.clientY));
    document.addEventListener('mouseup', dragEnd);
    btn.addEventListener('touchstart', e => { const t = e.touches[0]; dragStart(t.clientX, t.clientY); }, { passive: true });
    document.addEventListener('touchmove',  e => { const t = e.touches[0]; dragMove(t.clientX, t.clientY); }, { passive: true });
    document.addEventListener('touchend', dragEnd);

    /* ── PANEL PLACEMENT ── */
    function placePanel() {
      if (panel.style.display === 'none') return;
      const PW = 340, PH = 500;
      const openLeft = btnPos.left + BTN + 8 + PW > window.innerWidth;
      const openUp   = btnPos.top  + PH          > window.innerHeight;
      panel.style.left = (openLeft ? btnPos.left - PW - 8 : btnPos.left + BTN + 8) + 'px';
      panel.style.top  = (openUp   ? btnPos.top  + BTN - PH : btnPos.top) + 'px';
    }

    /* ── COLLAPSE / EXPAND ── */
    function collapse() {
      collapsed = true;
      btnPos.left = collapseSide === 'right' ? window.innerWidth - 24 : -32;
      applyPos();
    }
    function expand() {
      collapsed = false; btnPos = { ...lastPos }; applyPos();
    }

    /* ── BURST ── */
    function burst() {
      panel.style.display = 'none';
      const r  = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      collapseSide = cx < window.innerWidth / 2 ? 'left' : 'right';

      const wave = document.createElement('div');
      wave.className = 'bubble-wave';
      wave.style.cssText = `left:${cx - 30}px;top:${cy - 30}px`;
      document.body.appendChild(wave);
      setTimeout(() => wave.remove(), 450);

      for (let i = 0; i < 12; i++) {
        const p = document.createElement('div');
        p.className = 'bubble-particle';
        const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 30;
        p.style.cssText = `left:${cx}px;top:${cy}px`;
        p.style.setProperty('--x', Math.cos(a) * d + 'px');
        p.style.setProperty('--y', Math.sin(a) * d + 'px');
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 450);
      }
      btn.classList.remove('burst'); void btn.offsetWidth; btn.classList.add('burst');
      setTimeout(() => {
        btn.classList.remove('burst'); collapse();
        btn.style.opacity = '1'; btn.style.transform = 'scale(1)';
      }, 200);
    }

    /* ── CLICK / DBLCLICK ── */
    let clickTimer = null;
    btn.addEventListener('click', () => {
      if (moved) { moved = false; return; }
      if (collapsed) { expand(); return; }
      if (clickTimer) return;
      clickTimer = setTimeout(() => {
        clickTimer = null;
        const open = panel.style.display === 'none';
        panel.style.display = open ? 'flex' : 'none';
        if (open) { placePanel(); renderTab(); checkReminders(); }
      }, 220);
    });
    btn.addEventListener('dblclick', e => {
      e.stopPropagation();
      if (moved) { moved = false; return; }
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      panel.style.display = 'none'; burst();
    });
    panel.querySelector('.bp-close').onclick = () => { panel.style.display = 'none'; };

    /* ── TABS ── */
    panel.querySelectorAll('.bp-tab').forEach(t => {
      t.onclick = () => {
        panel.querySelectorAll('.bp-tab' ).forEach(x => x.classList.remove('active'));
        panel.querySelectorAll('.bp-pane').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        panel.querySelector(`#bp-pane-${t.dataset.tab}`).classList.add('active');
        activeTab = t.dataset.tab;
        renderTab();
        updateTabAccent();
      };
    });

    function renderTab() {
      if      (activeTab === 'notes')     renderNotes();
      else if (activeTab === 'todo')      renderTodos();
      else if (activeTab === 'general')   renderGeneral();
      else if (activeTab === 'reminders') renderReminders();
    }

    /* ── UTILS ── */
    function qs(o) { return new URLSearchParams(o).toString(); }
    function esc(s) {
      return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function fmtTime(iso) {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    function fmtDate(iso) {
      const d = new Date(iso), t = new Date(), y = new Date(t);
      y.setDate(t.getDate() - 1);
      if (d.toDateString() === t.toDateString()) return 'Today';
      if (d.toDateString() === y.toDateString()) return 'Yesterday';
      return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    }
    function groupByDate(arr) {
      const g = {};
      arr.forEach(x => {
        const k = new Date(x.createdAt).toDateString();
        (g[k] = g[k] || []).push(x);
      });
      return g;
    }
    function strColor(s) {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
      return `hsl(${Math.abs(h) % 360},55%,44%)`;
    }
    function renderDateSep(label) {
      const d = document.createElement('div');
      d.className = 'bp-date-sep';
      d.innerHTML = `<span>${label}</span>`;
      return d;
    }
    function autoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 80) + 'px';
    }

    /* ════════════════════════════════
       NOTES
    ════════════════════════════════ */
    async function renderNotes() {
      if (cache.notes) paintNotes(cache.notes);
      else notesListEl.innerHTML = `<div class="bp-loading">Loading…</div>`;
      try {
        const raw = await apiJson(`${API}/api/notes?${qs({ workspace: WORKSPACE, userId: USER_ID })}`);
        cache.notes = [...raw].reverse();
        paintNotes(cache.notes);
      } catch {
        if (!cache.notes)
          notesListEl.innerHTML = `<div class="bp-empty bp-err">Failed to load notes.</div>`;
      }
    }

    function paintNotes(list) {
      notesListEl.innerHTML = '';
      if (!list.length) {
        notesListEl.innerHTML = `<div class="bp-empty"><br>No notes yet.<br><small>Write your first note below</small></div>`;
        return;
      }
      const groups = groupByDate(list);
      Object.keys(groups).forEach(dk => {
        notesListEl.appendChild(renderDateSep(fmtDate(groups[dk][0].createdAt)));
        groups[dk].forEach(n => {
          const div = document.createElement('div');
          div.className  = 'bp-msg bp-msg-self';
          div.dataset.id = n.id;
          div.innerHTML = `
            <div class="bp-bubble bp-bubble-self">
              <div class="bp-msg-text">${esc(n.content)}</div>
              <div class="bp-msg-footer">
                <span class="bp-msg-time">${fmtTime(n.createdAt)}</span>
                <span class="bp-msg-tick">✓✓</span>
              </div>
              <div class="bp-msg-hover-actions">
                <button class="bp-hact bp-edit-note" data-id="${n.id}" data-content="${esc(n.content)}" title="Edit">✏️</button>
                <button class="bp-hact bp-del-note"  data-id="${n.id}" title="Delete">🗑️</button>
              </div>
            </div>`;
          notesListEl.appendChild(div);
        });
      });
      notesListEl.scrollTop = notesListEl.scrollHeight;

      notesListEl.querySelectorAll('.bp-edit-note').forEach(b => {
        b.onclick = () => {
          editingNoteId    = b.dataset.id;
          notesInput.value = b.dataset.content;
          notesInput.focus(); autoResize(notesInput);
          editingBar.style.display = 'flex';
          notesSend.innerHTML = '✓';
        };
      });
      notesListEl.querySelectorAll('.bp-del-note').forEach(b => {
        b.onclick = async () => {
          b.closest('.bp-msg').style.opacity = '0.4';
          await apiFetch(
            `${API}/api/notes/${b.dataset.id}?${qs({ workspace: WORKSPACE, userId: USER_ID })}`,
            { method: 'DELETE' });
          cache.notes = null;
          renderNotes();
        };
      });
    }

    cancelEdit.onclick = () => {
      editingNoteId = null; notesInput.value = '';
      editingBar.style.display = 'none'; notesSend.innerHTML = '↑';
    };

    async function submitNote() {
      const val = notesInput.value.trim(); if (!val) return;
      notesSend.disabled = true;
      try {
        if (editingNoteId) {
          await apiJson(`${API}/api/notes/${editingNoteId}`,
            jsonOpt('PUT', { workspace: WORKSPACE, userId: USER_ID, content: val }));
          editingNoteId = null;
          editingBar.style.display = 'none';
          notesSend.innerHTML = '↑';
        } else {
          await apiJson(`${API}/api/notes`,
            jsonOpt('POST', { workspace: WORKSPACE, userId: USER_ID, content: val }));
        }
        notesInput.value = ''; notesInput.style.height = 'auto';
        cache.notes = null;
        renderNotes();
      } catch {}
      notesSend.disabled = false;
    }

    notesSend.onclick = submitNote;
    notesInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNote(); } });
    notesInput.addEventListener('input', () => autoResize(notesInput));

    /* ════════════════════════════════
       TO-DO
    ════════════════════════════════ */
    function updateRing(list) {
      const done = list.filter(t => t.done).length;
      const pct  = list.length ? Math.round(done / list.length * 100) : 0;
      todoPct.textContent  = pct + '%';
      todoStat.textContent = `${done} / ${list.length} done`;
      ringFill.style.strokeDasharray  = CIRC;
      ringFill.style.strokeDashoffset = CIRC - (pct / 100) * CIRC;
      ringFill.style.stroke = bubbleColor;
    }

    async function renderTodos(force = false) {
      if (activePatches > 0) return;
      if (cache.todo && !force) { paintTodos(cache.todo); return; }
      if (!cache.todo) todoListEl.innerHTML = `<div class="bp-loading">Loading…</div>`;
      if (todoFetching) return;
      todoFetching = true;
      try {
        const list = await apiJson(`${API}/api/todos?${qs({ workspace: WORKSPACE, userId: USER_ID })}`);
        if (activePatches > 0) { cache.todo = list; return; }
        cache.todo = list;
        paintTodos(list);
      } catch {
        if (!cache.todo)
          todoListEl.innerHTML = `<div class="bp-empty bp-err">Failed to load tasks.</div>`;
      } finally {
        todoFetching = false;
      }
    }

    function paintTodos(list) {
      if (activePatches > 0) return;
      updateRing(list);

      const order  = { high: 0, medium: 1, low: 2 };
      const sorted = [...list].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (order[a.priority] || 1) - (order[b.priority] || 1);
      });

      if (!sorted.length) {
        todoListEl.innerHTML = `<div class="bp-empty"><br>No tasks yet.</div>`;
        return;
      }

      const existing = todoListEl.querySelectorAll('.bp-todo-row');
      const sameIds  = existing.length === sorted.length &&
        [...existing].every((el, i) => el.dataset.id === sorted[i].id);

      if (sameIds) {
        sorted.forEach(t => {
          const row = todoListEl.querySelector(`.bp-todo-row[data-id="${t.id}"]`);
          if (!row) return;
          const chk = row.querySelector('.bp-chk');
          if (!chk || chk.dataset.busy === '1') return;
          const domDone = chk.dataset.done === 'true';
          if (domDone !== t.done) {
            chk.dataset.done = String(t.done);
            row.classList.toggle('td-done', t.done);
            chk.classList.toggle('chk-on', t.done);
            chk.innerHTML = t.done
              ? `<svg viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 5,9.5 10.5,2.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`
              : '';
          }
        });
        return;
      }

      todoListEl.innerHTML = sorted.map(t => `
        <div class="bp-todo-row ${t.done ? 'td-done' : ''}" data-id="${t.id}">
          <button class="bp-chk ${t.done ? 'chk-on' : ''}"
                  data-id="${t.id}" data-done="${t.done}" data-busy="0">
            ${t.done
              ? `<svg viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 5,9.5 10.5,2.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`
              : ''}
          </button>
          <div class="bp-td-body">
            <span class="bp-td-text">${esc(t.content)}</span>
          </div>
          <span class="bp-dot bp-p-${t.priority || 'medium'}"></span>
          <button class="bp-hact bp-td-del" data-id="${t.id}">×</button>
        </div>`).join('');

      attachTodoHandlers();
    }

    function attachTodoHandlers() {
      todoListEl.querySelectorAll('.bp-chk').forEach(b => {
        b.onclick = async () => {
          if (b.dataset.busy === '1') return;
          const id          = b.dataset.id;
          const currentDone = b.dataset.done === 'true';
          const newDone     = !currentDone;
          const row         = b.closest('.bp-todo-row');
          b.dataset.busy = '1';
          activePatches++;
          const item = cache.todo && cache.todo.find(x => x.id === id);
          if (item) item.done = newDone;
          b.dataset.done = String(newDone);
          row.classList.toggle('td-done', newDone);
          b.classList.toggle('chk-on', newDone);
          b.innerHTML = newDone
            ? `<svg viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 5,9.5 10.5,2.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`
            : '';
          if (cache.todo) updateRing(cache.todo);
          try {
            await apiJson(`${API}/api/todos/${id}`,
              jsonOpt('PATCH', { workspace: WORKSPACE, userId: USER_ID, done: newDone }));
          } catch {
            if (item) item.done = currentDone;
            b.dataset.done = String(currentDone);
            row.classList.toggle('td-done', currentDone);
            b.classList.toggle('chk-on', currentDone);
            b.innerHTML = currentDone
              ? `<svg viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 5,9.5 10.5,2.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`
              : '';
            if (cache.todo) updateRing(cache.todo);
          } finally {
            b.dataset.busy = '0';
            activePatches  = Math.max(0, activePatches - 1);
          }
        };
      });

      todoListEl.querySelectorAll('.bp-td-del').forEach(b => {
        b.onclick = async () => {
          if (activePatches > 0) return;
          const row = b.closest('.bp-todo-row');
          const id  = b.dataset.id;
          if (cache.todo) cache.todo = cache.todo.filter(x => x.id !== id);
          row.style.transition = 'opacity 0.15s';
          row.style.opacity    = '0';
          setTimeout(() => { row.remove(); if (cache.todo) updateRing(cache.todo); }, 150);
          try {
            await apiFetch(
              `${API}/api/todos/${id}?${qs({ workspace: WORKSPACE, userId: USER_ID })}`,
              { method: 'DELETE' });
          } catch {
            cache.todo = null;
            renderTodos(true);
          }
        };
      });
    }

    todoSend.onclick = async () => {
      const val = todoInput.value.trim(); if (!val) return;
      todoInput.value = '';
      try {
        await apiJson(`${API}/api/todos`,
          jsonOpt('POST', { workspace: WORKSPACE, userId: USER_ID, content: val, priority: todoPri.value, done: false }));
        cache.todo = null;
        renderTodos(true);
      } catch {}
    };
    todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') todoSend.click(); });

    /* ════════════════════════════════
       GENERAL
    ════════════════════════════════ */
    document.addEventListener('mousedown', e => {
      if (!e.target.closest('.bp-gen-menu')) closeGenMenu();
    });

    function closeGenMenu() {
      genMenuOpen = null;
      genListEl.querySelectorAll('.bp-gen-menu-dropdown').forEach(d => d.remove());
      genListEl.querySelectorAll('.bp-gen-menu-btn').forEach(b => b.classList.remove('active'));
    }

    replyCancel.onclick = () => clearReply();

    function setReply(msg) {
      genReplyTo = { id: msg.id, userId: msg.userId, userEmail: msg.userEmail, content: msg.content };
      replyLabel.textContent   = `Replying to @${msg.userEmail || 'member'}`;
      replyPreview.textContent = msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content;
      replyBanner.style.display = 'flex';
      genInput.placeholder      = `Reply to @${msg.userEmail || 'member'}…`;
      genInput.focus();
    }

    function clearReply() {
      genReplyTo                = null;
      replyBanner.style.display = 'none';
      genInput.placeholder      = 'Say something to the team…';
    }

    async function renderGeneral() {
      if (cache.general) paintGeneral(cache.general, true);
      else genListEl.innerHTML = `<div class="bp-loading">Loading…</div>`;
      try {
        const list = await apiJson(`${API}/api/general?${qs({ workspace: WORKSPACE })}`);
        cache.general = list;
        paintGeneral(list, true);
      } catch {
        if (!cache.general)
          genListEl.innerHTML = `<div class="bp-empty bp-err">Failed to load messages.</div>`;
      }
    }

    function paintGeneral(list, forceScroll = false) {
      const atBottom         = genListEl.scrollHeight - genListEl.scrollTop - genListEl.clientHeight < 60;
      const prevScrollTop    = genListEl.scrollTop;
      const prevScrollHeight = genListEl.scrollHeight;

      genListEl.innerHTML = '';
      if (!list.length) {
        genListEl.innerHTML = `<div class="bp-empty"><br>No messages yet.<br><small>Start the conversation!</small></div>`;
        return;
      }

      const groups = groupByDate(list);
      Object.keys(groups).forEach(dk => {
        genListEl.appendChild(renderDateSep(fmtDate(groups[dk][0].createdAt)));
        groups[dk].forEach(m => {
          const isSelf  = m.userId === USER_ID;
          const display = isSelf ? 'You' : (m.userEmail || `member·${(m.userId || '').slice(0, 6)}`);
          const initial = (display[0] || '?').toUpperCase();
          const color   = isSelf ? bubbleColor : strColor(m.userId || display);

          const div = document.createElement('div');
          div.className  = `bp-msg ${isSelf ? 'bp-msg-self' : 'bp-msg-other'}`;
          div.dataset.id = m.id;

          const replyQuoteHtml = m.replyToId ? `
            <div class="bp-gen-reply-quote">
              <span class="bp-gen-reply-mention">@${esc(m.replyToUserEmail || 'someone')}</span>
              <span class="bp-gen-reply-text">${esc(
                (m.replyToContent || '').length > 70
                  ? m.replyToContent.slice(0, 70) + '…'
                  : (m.replyToContent || '')
              )}</span>
            </div>` : '';

          const editedBadge = m.isEdited ? `<span class="bp-gen-edited">(edited)</span>` : '';

          div.innerHTML = `
            ${!isSelf ? `<div class="bp-avatar-o" style="background:${color}">${initial}</div>` : ''}
            <div class="bp-bubble ${isSelf ? 'bp-bubble-self' : 'bp-bubble-other'}">
              ${!isSelf ? `<div class="bp-sender-name">${esc(display)}</div>` : ''}
              ${replyQuoteHtml}
              <div class="bp-msg-text bp-gen-content" data-id="${m.id}">${esc(m.content)}</div>
              <div class="bp-msg-footer">
                <span class="bp-msg-time">${fmtTime(m.createdAt)}</span>
                ${editedBadge}
                ${isSelf ? `<span class="bp-msg-tick">✓✓</span>` : ''}
              </div>
            </div>
            <div class="bp-gen-menu" data-id="${m.id}">
              <button class="bp-gen-menu-btn" data-id="${m.id}" title="Actions">⋯</button>
            </div>`;

          genListEl.appendChild(div);
        });
      });

      if (forceScroll || atBottom) {
        genListEl.scrollTop = genListEl.scrollHeight;
      } else {
        genListEl.scrollTop = prevScrollTop + (genListEl.scrollHeight - prevScrollHeight);
      }

      attachGenHandlers();
    }

    function attachGenHandlers() {
      genListEl.querySelectorAll('.bp-gen-menu-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const id     = btn.dataset.id;
          const msg    = cache.general && cache.general.find(m => m.id === id);
          const isSelf = msg && msg.userId === USER_ID;

          if (genMenuOpen === id) { closeGenMenu(); return; }
          closeGenMenu();
          genMenuOpen = id;
          btn.classList.add('active');

          const dropdown = document.createElement('div');
          dropdown.className = 'bp-gen-menu-dropdown';
          dropdown.innerHTML = `
            <button class="bp-gen-menu-item" data-action="reply" data-id="${id}">↩ Reply</button>
            ${isSelf ? `
              <button class="bp-gen-menu-item" data-action="edit"   data-id="${id}">✏️ Edit</button>
              <button class="bp-gen-menu-item bp-gen-menu-danger" data-action="delete" data-id="${id}">🗑️ Delete</button>
            ` : ''}`;

          btn.closest('.bp-gen-menu').appendChild(dropdown);

          dropdown.querySelectorAll('.bp-gen-menu-item').forEach(item => {
            item.onclick = (ev) => {
              ev.stopPropagation();
              const action = item.dataset.action;
              const msgId  = item.dataset.id;
              const target = cache.general && cache.general.find(m => m.id === msgId);
              closeGenMenu();
              if (action === 'reply'  && target) handleGenReply(target);
              if (action === 'edit'   && target) handleGenEdit(target);
              if (action === 'delete' && target) handleGenDelete(msgId);
            };
          });
        };
      });
    }

    function handleGenReply(msg) { setReply(msg); }

    function handleGenEdit(msg) {
      genEditTarget = { id: msg.id };
      const contentEl = genListEl.querySelector(`.bp-gen-content[data-id="${msg.id}"]`);
      if (!contentEl) return;

      const editBox = document.createElement('div');
      editBox.className = 'bp-gen-edit-box';
      editBox.innerHTML = `
        <textarea class="bp-gen-edit-input" rows="2">${msg.content}</textarea>
        <div class="bp-gen-edit-actions">
          <button class="bp-gen-edit-save">Save</button>
          <button class="bp-gen-edit-cancel">Cancel</button>
        </div>`;
      contentEl.replaceWith(editBox);

      const ta    = editBox.querySelector('.bp-gen-edit-input');
      const saveB = editBox.querySelector('.bp-gen-edit-save');
      const cancB = editBox.querySelector('.bp-gen-edit-cancel');
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);

      async function saveEdit() {
        const newContent = ta.value.trim();
        if (!newContent) return;
        saveB.disabled = true;
        try {
          await apiJson(`${API}/api/general/${msg.id}`,
            jsonOpt('PUT', { workspace: WORKSPACE, userId: USER_ID, content: newContent }));
          if (cache.general) {
            const cached = cache.general.find(m => m.id === msg.id);
            if (cached) { cached.content = newContent; cached.isEdited = true; }
          }
          genEditTarget = null;
          paintGeneral(cache.general || []);
        } catch {
          saveB.disabled = false;
        }
      }

      function cancelEditInline() {
        genEditTarget = null;
        if (cache.general) paintGeneral(cache.general);
      }

      saveB.onclick = saveEdit;
      cancB.onclick = cancelEditInline;
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
        if (e.key === 'Escape') cancelEditInline();
      });
    }

    async function handleGenDelete(id) {
      const msgEl = genListEl.querySelector(`.bp-msg[data-id="${id}"]`);
      if (msgEl) { msgEl.style.transition = 'opacity 0.15s'; msgEl.style.opacity = '0'; }
      try {
        await apiFetch(
          `${API}/api/general/${id}?${qs({ workspace: WORKSPACE, userId: USER_ID })}`,
          { method: 'DELETE' });
        if (cache.general) cache.general = cache.general.filter(m => m.id !== id);
        setTimeout(() => { if (msgEl) msgEl.remove(); }, 150);
      } catch {
        if (msgEl) msgEl.style.opacity = '1';
        cache.general = null;
        renderGeneral();
      }
    }

    async function sendGeneral() {
      const val = genInput.value.trim();
      if (!val) return;

      const body = { workspace: WORKSPACE, userId: USER_ID, userEmail: USER_EMAIL, content: val };
      if (genReplyTo) {
        body.replyToId        = genReplyTo.id;
        body.replyToUserId    = genReplyTo.userId;
        body.replyToUserEmail = genReplyTo.userEmail;
        body.replyToContent   = genReplyTo.content;
      }

      try {
        const newMsg = await apiJson(`${API}/api/general`, jsonOpt('POST', body));
        genInput.value = '';
        genInput.style.height = 'auto';
        clearReply();
        if (newMsg && cache.general) {
          cache.general.push(newMsg);
          paintGeneral(cache.general, true);
        } else {
          cache.general = null;
          renderGeneral();
        }
      } catch {}
    }

    genSend.onclick = sendGeneral;
    genInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGeneral(); }
    });
    genInput.addEventListener('input', () => autoResize(genInput));

    setInterval(async () => {
      if (panel.style.display === 'none' || activeTab !== 'general' || genEditTarget) return;
      try {
        const list     = await apiJson(`${API}/api/general?${qs({ workspace: WORKSPACE })}`);
        const prevLen  = cache.general ? cache.general.length : -1;
        const prevLast = cache.general && cache.general.length ? cache.general[cache.general.length - 1].id : null;
        const newLast  = list.length ? list[list.length - 1].id : null;
        cache.general  = list;
        if (list.length !== prevLen || newLast !== prevLast) paintGeneral(list);
      } catch {}
    }, 6000);

    /* ════════════════════════════════
       REMINDERS
    ════════════════════════════════ */
    function setMinDt() {
      const n = new Date();
      n.setMinutes(n.getMinutes() - n.getTimezoneOffset());
      remDt.min = n.toISOString().slice(0, 16);
    }

    async function renderReminders() {
      setMinDt();
      if (cache.reminders) paintReminders(cache.reminders);
      try {
        const list = await apiJson(`${API}/api/reminders?${qs({ workspace: WORKSPACE, userId: USER_ID })}`);
        cache.reminders = list;
        paintReminders(list);
        scheduleReminderBadges(list);
      } catch {
        if (!cache.reminders)
          remListEl.innerHTML = `<div class="bp-empty bp-err">Failed to load reminders.</div>`;
      }
    }

    function paintReminders(list) {
      const now = new Date();
      if (!list.length) {
        remListEl.innerHTML = `<div class="bp-empty">🔔<br>No reminders set.</div>`; return;
      }
      const sorted = [...list].sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));
      remListEl.innerHTML = sorted.map(r => {
        const dt   = new Date(r.remindAt);
        const due  = !r.acknowledged && dt <= now;
        const past =  dt <= now;
        return `
          <div class="bp-rem-row ${due ? 'rem-due' : (past ? 'rem-past' : '')}" data-id="${r.id}">
            <div class="bp-rem-icon">${due ? '🔔' : past ? '⏰' : '🕐'}</div>
            <div class="bp-rem-body">
              <div class="bp-rem-text">${esc(r.content)}</div>
              <div class="bp-rem-when ${past ? 'rem-past-label' : ''}">
                ${dt.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${fmtTime(r.remindAt)}
              </div>
            </div>
            <div class="bp-rem-actions">
              ${due ? `<button class="bp-ack-btn" data-id="${r.id}" data-busy="0">✓</button>` : ''}
              <button class="bp-hact bp-rem-del" data-id="${r.id}">×</button>
            </div>
          </div>`;
      }).join('');

      remListEl.querySelectorAll('.bp-ack-btn').forEach(b => {
        b.onclick = async () => {
          if (b.dataset.busy === '1') return;
          b.dataset.busy = '1';
          const row = b.closest('.bp-rem-row');
          if (row) {
            row.classList.remove('rem-due');
            row.classList.add('rem-past');
            row.querySelector('.bp-rem-icon').textContent = '⏰';
            b.remove();
          }
          if (cache.reminders) {
            const r = cache.reminders.find(x => x.id === b.dataset.id);
            if (r) r.acknowledged = true;
          }
          try {
            await apiJson(`${API}/api/reminders/${b.dataset.id}/ack`,
              jsonOpt('PATCH', { workspace: WORKSPACE, userId: USER_ID }));
            cache.reminders = null;
            checkReminders();
          } catch {
            cache.reminders = null;
            renderReminders();
          }
        };
      });

      remListEl.querySelectorAll('.bp-rem-del').forEach(b => {
        b.onclick = async () => {
          const row = b.closest('.bp-rem-row');
          row.style.transition = 'opacity 0.15s'; row.style.opacity = '0';
          setTimeout(() => row.remove(), 150);
          if (cache.reminders) cache.reminders = cache.reminders.filter(x => x.id !== b.dataset.id);
          try {
            await apiFetch(
              `${API}/api/reminders/${b.dataset.id}?${qs({ workspace: WORKSPACE, userId: USER_ID })}`,
              { method: 'DELETE' });
            checkReminders();
          } catch {
            cache.reminders = null;
            renderReminders();
          }
        };
      });
    }

    remAdd.onclick = async () => {
      const text = remText.value.trim(), dt = remDt.value;
      if (!text || !dt) return;
      try {
        await apiJson(`${API}/api/reminders`,
          jsonOpt('POST', { workspace: WORKSPACE, userId: USER_ID, content: text, remindAt: new Date(dt).toISOString() }));
        remText.value = ''; remDt.value = '';
        cache.reminders = null;
        renderReminders(); checkReminders();
      } catch {}
    };

    /* ════════════════════════════════
       REMINDER BADGE
    ════════════════════════════════ */
    function scheduleReminderBadges(list) {
      reminderTimeouts.forEach(t => clearTimeout(t));
      reminderTimeouts = [];
      const now = Date.now();
      list.forEach(r => {
        if (r.acknowledged) return;
        const fireAt = new Date(r.remindAt).getTime();
        const delay  = fireAt - now;
        if (delay <= 0) return;
        const tid = setTimeout(() => {
          checkReminders();
          if (panel.style.display !== 'none' && activeTab === 'reminders') {
            cache.reminders = null;
            renderReminders();
          }
        }, delay);
        reminderTimeouts.push(tid);
      });
    }

    function updateBadge(due) {
      const nb = document.getElementById('bl-notif');
      if (!nb) return;
      if (due > 0) {
        nb.style.display = 'flex';
        nb.textContent   = due > 9 ? '9+' : String(due);
        btn.classList.add('has-notif');
      } else {
        nb.style.display = 'none';
        btn.classList.remove('has-notif');
      }
    }

    async function checkReminders() {
      try {
        const list = await apiJson(`${API}/api/reminders?${qs({ workspace: WORKSPACE, userId: USER_ID })}`);
        const now  = new Date();
        const due  = list.filter(r => !r.acknowledged && new Date(r.remindAt) <= now).length;
        updateBadge(due);
        scheduleReminderBadges(list);
      } catch {}
    }
    checkReminders();

    /* ════════════════════════════════════════════════════
       APPEARANCE + SOFT-DELETE HANDLING
    ════════════════════════════════════════════════════ */
    function updateTabAccent() {
      panel.querySelectorAll('.bp-tab.active').forEach(t => {
        t.style.color             = bubbleColor;
        t.style.borderBottomColor = bubbleColor;
      });
    }

    function applyAppearance(cfg) {
      if (!cfg) return;
      if (cfg.color && typeof cfg.color === 'string') {
        bubbleColor = cfg.color.trim();
        btn.style.setProperty('--bubble-color', bubbleColor);
        if (selfAv) selfAv.style.background = bubbleColor;
        ringFill.style.stroke = bubbleColor;
        updateTabAccent();
      }
      if (typeof cfg.text === 'string' && cfg.text.length > 0) {
        const lbl = btn.querySelector('.bl-label');
        if (lbl) lbl.textContent = cfg.text;
      }
    }

    /* ── Deletion warning banner ── */
    function buildWarningMsg(hoursLeft) {
      if (!hoursLeft || hoursLeft <= 0)
        return '⚠️ This workspace is pending permanent deletion. Contact your admin.';
      if (hoursLeft === 1)
        return '⚠️ This workspace deletes in ~1 hour — contact your admin immediately!';
      return `⚠️ This workspace will be deleted in ~${hoursLeft}h — contact your admin.`;
    }

    function showDeletionWarning(hoursLeft) {
      const existing = document.getElementById('bp-deletion-warning');
      if (existing) {
        const textEl = existing.querySelector('.bp-dw-text');
        if (textEl) textEl.textContent = buildWarningMsg(hoursLeft);
        const urgent = hoursLeft <= 6;
        existing.style.background   = urgent ? '#fef2f2' : '#fffbeb';
        existing.style.borderBottom = `1px solid ${urgent ? '#fecaca' : '#fde68a'}`;
        existing.style.color        = urgent ? '#dc2626' : '#92400e';
        const backupBtn = existing.querySelector('button');
        if (backupBtn) backupBtn.style.background = urgent ? '#dc2626' : '#92400e';
        return;
      }

      deletionWarningShown = true;
      const urgent = hoursLeft <= 6;
      const banner = document.createElement('div');
      banner.id    = 'bp-deletion-warning';
      banner.style.cssText = [
        'display:flex',
        'flex-direction:column',
        'gap:6px',
        'padding:8px 14px',
        `background:${urgent ? '#fef2f2' : '#fffbeb'}`,
        `border-bottom:1px solid ${urgent ? '#fecaca' : '#fde68a'}`,
        'font-size:12px',
        'font-weight:600',
        `color:${urgent ? '#dc2626' : '#92400e'}`,
        'flex-shrink:0',
        'line-height:1.5',
      ].join(';');

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:center;gap:8px';
      topRow.innerHTML =
        `<span style="font-size:15px;flex-shrink:0">${urgent ? '🔴' : '⏳'}</span>` +
        `<span class="bp-dw-text">${buildWarningMsg(hoursLeft)}</span>`;

      const backupBtn = document.createElement('button');
      backupBtn.textContent = '💾 Backup my data';
      backupBtn.style.cssText = [
        'align-self:flex-start',
        'margin-left:23px',
        'padding:4px 12px',
        'font-size:11px',
        'font-weight:700',
        'border:none',
        'border-radius:6px',
        `background:${urgent ? '#dc2626' : '#92400e'}`,
        'color:#fff',
        'cursor:pointer',
        'opacity:0.9',
      ].join(';');
      backupBtn.onmouseenter = () => backupBtn.style.opacity = '1';
      backupBtn.onmouseleave = () => backupBtn.style.opacity = '0.9';
      backupBtn.onclick      = downloadWidgetBackup;

      banner.appendChild(topRow);
      banner.appendChild(backupBtn);

      const tabs = panel.querySelector('.bp-tabs');
      if (tabs) panel.insertBefore(banner, tabs);
    }

    function clearDeletionWarning() {
      const el = document.getElementById('bp-deletion-warning');
      if (el) { el.remove(); deletionWarningShown = false; }
    }

    /* ════════════════════════════════════════════════════
       BACKUP — download as formatted Word .doc
       (Notes, Todos, Reminders only — General excluded)
    ════════════════════════════════════════════════════ */
    async function downloadWidgetBackup() {
      const backupBtn = document.querySelector('#bp-deletion-warning button');
      if (backupBtn) { backupBtn.textContent = '⏳ Preparing…'; backupBtn.disabled = true; }

      try {
        const res = await apiFetch(
          `${API}/api/widget/backup?${qs({ workspace: WORKSPACE, userId: USER_ID })}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const html = buildBackupDoc(data);

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `bubble-backup-${WORKSPACE}-${new Date().toISOString().slice(0, 10)}.doc`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

        if (backupBtn) backupBtn.textContent = '✅ Downloaded!';
        setTimeout(() => {
          if (backupBtn) { backupBtn.textContent = '💾 Backup my data'; backupBtn.disabled = false; }
        }, 3000);

      } catch {
        if (backupBtn) { backupBtn.textContent = '❌ Failed — retry'; backupBtn.disabled = false; }
      }
    }

    function buildBackupDoc(data) {
      const exportDate = new Date(data.exportedAt).toLocaleString();
      const priEmoji   = { high: '🔴', medium: '🟡', low: '🟢' };

      function section(title, emoji, rows) {
        if (!rows.length) return `
          <h2 style="color:#5b8def;border-bottom:2px solid #5b8def;padding-bottom:6px;margin-top:32px">
            ${emoji} ${title}
            <span style="font-size:13px;color:#94a3b8;font-weight:400">(0 items)</span>
          </h2>
          <p style="color:#94a3b8;font-style:italic;margin:8px 0 0 0">No ${title.toLowerCase()} found.</p>`;
        return `
          <h2 style="color:#5b8def;border-bottom:2px solid #5b8def;padding-bottom:6px;margin-top:32px">
            ${emoji} ${title}
            <span style="font-size:13px;color:#94a3b8;font-weight:400">(${rows.length} item${rows.length !== 1 ? 's' : ''})</span>
          </h2>
          ${rows.join('')}`;
      }

      function card(content) {
        return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #5b8def;
                            border-radius:6px;padding:12px 16px;margin:10px 0;font-size:13px;
                            line-height:1.6;color:#0f172a">${content}</div>`;
      }

      function meta(label, value) {
        return `<span style="font-size:11px;color:#64748b;margin-right:16px"><b>${label}:</b> ${value}</span>`;
      }

      function fmt(iso) {
        try { return new Date(iso).toLocaleString(); } catch { return iso; }
      }

      /* ── Notes ── */
      const noteRows = (data.notes || []).map(n => card(`
        <div style="margin-bottom:6px">${esc(n.content)}</div>
        <div>${meta('Created', fmt(n.createdAt))}</div>`));

      /* ── Todos ── */
      const todoRows = (data.todos || []).map(t => card(`
        <div style="margin-bottom:6px">
          ${t.done
            ? `<span style="color:#22c55e;font-weight:700">✓</span>`
            : `<span style="color:#94a3b8">○</span>`}
          <span style="margin-left:8px;${t.done ? 'text-decoration:line-through;color:#94a3b8' : ''}">
            ${esc(t.content)}
          </span>
        </div>
        <div>
          ${meta('Status',   t.done ? '✅ Done' : '⏳ Pending')}
          ${meta('Priority', `${priEmoji[t.priority] || '🟡'} ${t.priority || 'medium'}`)}
          ${meta('Created',  fmt(t.createdAt))}
        </div>`));

      /* ── Reminders ── */
      const remRows = (data.reminders || []).map(r => {
        const due = !r.acknowledged && new Date(r.remindAt) <= new Date();
        return card(`
          <div style="margin-bottom:6px">${esc(r.content)}</div>
          <div>
            ${meta('Remind At',    fmt(r.remindAt))}
            ${meta('Acknowledged', r.acknowledged ? '✅ Yes' : due ? '🔔 Due now!' : '⏳ Pending')}
            ${meta('Created',      fmt(r.createdAt))}
          </div>`);
      });

      return `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>Bubble Backup — ${esc(data.workspace || WORKSPACE)}</title>
  <!--[if gte mso 9]>
  <xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml>
  <![endif]-->
  <style>
    body  { font-family: Calibri, Arial, sans-serif; font-size: 13px;
            color: #0f172a; margin: 40px; line-height: 1.6; }
    h1    { color: #1e3a8a; font-size: 22px; margin-bottom: 4px; }
    h2    { font-size: 16px; page-break-inside: avoid; }
    table { border-collapse: collapse; width: 100%; margin-top: 8px; }
    td,th { padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 12px; }
    th    { background: #f1f5f9; font-weight: 600; }
  </style>
</head>
<body>

  <!-- COVER -->
  <div style="border-bottom:3px solid #5b8def;padding-bottom:20px;margin-bottom:8px">
    <h1>💬 Bubble — Data Backup</h1>
    <table style="border:none;width:auto;margin-top:12px">
      <tr>
        <td style="border:none;padding:3px 16px 3px 0;color:#64748b;font-size:12px"><b>Workspace</b></td>
        <td style="border:none;padding:3px 0;font-size:12px">${esc(data.workspace || WORKSPACE)}</td>
      </tr>
      <tr>
        <td style="border:none;padding:3px 16px 3px 0;color:#64748b;font-size:12px"><b>Slug</b></td>
        <td style="border:none;padding:3px 0;font-size:12px">${esc(data.slug || WORKSPACE)}</td>
      </tr>
      <tr>
        <td style="border:none;padding:3px 16px 3px 0;color:#64748b;font-size:12px"><b>User ID</b></td>
        <td style="border:none;padding:3px 0;font-size:12px">${esc(String(data.userId || USER_ID))}</td>
      </tr>
      <tr>
        <td style="border:none;padding:3px 16px 3px 0;color:#64748b;font-size:12px"><b>Exported At</b></td>
        <td style="border:none;padding:3px 0;font-size:12px">${exportDate}</td>
      </tr>
      <tr>
        <td style="border:none;padding:3px 16px 3px 0;color:#64748b;font-size:12px"><b>Total Items</b></td>
        <td style="border:none;padding:3px 0;font-size:12px">
          ${(data.notes     || []).length} notes ·
          ${(data.todos     || []).length} tasks ·
          ${(data.reminders || []).length} reminders
        </td>
      </tr>
    </table>
  </div>

  <!-- SECTIONS -->
  ${section('Notes',       '📝', noteRows)}
  ${section('To-Do Tasks', '✅', todoRows)}
  ${section('Reminders',   '🔔', remRows)}

  <!-- FOOTER -->
  <div style="margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;
              font-size:11px;color:#94a3b8;text-align:center">
    Generated by <b>Bubble</b> · ${exportDate} · workspace <b>${esc(data.slug || WORKSPACE)}</b>
  </div>

</body>
</html>`;
    }

    /* ── initAppearance ── */
    async function initAppearance() {
      try {
        const res = await apiFetch(`${API}/api/widget/config?${qs({ workspace: WORKSPACE })}`);

        if (res.status === 404 || res.status === 401) {
          longPollAborted = true;
          return;
        }
        if (res.status === 410) {
          try {
            const cfg = await res.json();
            applyAppearance(cfg);
            version = cfg.version || 0;
            showDeletionWarning(cfg.hoursLeft || 0);
          } catch {}
          return;
        }
        if (res.ok) {
          const cfg = await res.json();
          applyAppearance(cfg);
          version = cfg.version || 0;
        }
      } catch {}
    }

    /* ── longPoll ── */
    async function longPoll() {
      if (longPollAborted) return;

      while (true) {
        if (longPollAborted) return;
        try {
          const res = await apiFetch(
            `${API}/api/widget/config/long?${qs({ workspace: WORKSPACE, since: version })}`
          );

          if (res.status === 404 || res.status === 401) {
            longPollAborted     = true;
            panel.style.display = 'none';
            btn.style.display   = 'none';
            return;
          }

          if (res.status === 410) {
            try {
              const cfg = await res.json();
              version = cfg.version || version;
              applyAppearance(cfg);
              showDeletionWarning(cfg.hoursLeft || 0);
            } catch {}
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }

          if (res.status === 204) { continue; }

          if (res.ok) {
            const cfg = await res.json();
            applyAppearance(cfg);
            version = cfg.version || version;
            clearDeletionWarning();
            continue;
          }

          await new Promise(r => setTimeout(r, 5000));

        } catch {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    initAppearance().then(longPoll);

    /* ════════════════════════════════════════
       PUBLIC API
    ════════════════════════════════════════ */
    window.__bubble_show = function (user) {
      window.BUBBLE_USER = user;
      USER_ID      = user.id;
      USER_EMAIL   = user.email || '';
      USER_DISPLAY = USER_EMAIL || `user·${USER_ID.slice(0, 6)}`;
      USER_INITIAL = (USER_DISPLAY[0] || '?').toUpperCase();
      if (selfAv) { selfAv.textContent = USER_INITIAL; selfAv.style.background = bubbleColor; }
      cache.notes = null; cache.todo = null; cache.general = null; cache.reminders = null;
      btn.style.display = 'flex';
      checkReminders();
    };

    window.__bubble_hide = function () {
      panel.style.display = 'none';
      btn.style.display   = 'none';
      longPollAborted     = true;
      cache.notes = null; cache.todo = null; cache.general = null; cache.reminders = null;
      window.BUBBLE_USER = null;
      if (btn   && btn.parentNode)   btn.parentNode.removeChild(btn);
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      window.__BUBBLE_BOOTED__ = false;
      window.__bubble_show     = undefined;
      window.__bubble_hide     = undefined;
    };

    btn.style.display = 'flex';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
