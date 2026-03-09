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
    const notesListEl = panel.querySelector('#bp-notes-list');
    const notesInput  = panel.querySelector('#bp-notes-input');
    const notesSend   = panel.querySelector('#bp-notes-send');
    const editingBar  = panel.querySelector('#bp-notes-editing-bar');
    const cancelEdit  = panel.querySelector('#bp-notes-cancel');
    const todoListEl  = panel.querySelector('#bp-todo-list');
    const todoInput   = panel.querySelector('#bp-todo-input');
    const todoSend    = panel.querySelector('#bp-todo-send');
    const todoPri     = panel.querySelector('#bp-todo-pri');
    const ringFill    = panel.querySelector('#bp-ring-fill');
    const todoPct     = panel.querySelector('#bp-todo-pct');
    const todoStat    = panel.querySelector('#bp-todo-stat');
    const genListEl   = panel.querySelector('#bp-general-list');
    const genInput    = panel.querySelector('#bp-general-input');
    const genSend     = panel.querySelector('#bp-general-send');
    const remListEl   = panel.querySelector('#bp-reminders-list');
    const remText     = panel.querySelector('#bp-rem-text');
    const remDt       = panel.querySelector('#bp-rem-dt');
    const remAdd      = panel.querySelector('#bp-rem-add');
    const selfAv      = panel.querySelector('#bp-self-av');
    const CIRC        = 2 * Math.PI * 30;

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
        notesListEl.innerHTML = `<div class="bp-empty">✏️<br>No notes yet.<br><small>Write your first note below</small></div>`;
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
        todoListEl.innerHTML = `<div class="bp-empty">✅<br>No tasks yet.</div>`;
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
    async function renderGeneral() {
      if (cache.general) paintGeneral(cache.general);
      try {
        const list = await apiJson(`${API}/api/general?${qs({ workspace: WORKSPACE })}`);
        cache.general = list;
        paintGeneral(list);
      } catch {
        if (!cache.general)
          genListEl.innerHTML = `<div class="bp-empty bp-err">Failed to load messages.</div>`;
      }
    }

    function paintGeneral(list) {
      genListEl.innerHTML = '';
      if (!list.length) {
        genListEl.innerHTML = `<div class="bp-empty">💬<br>No messages yet.<br><small>Start the conversation!</small></div>`;
        return;
      }
      const groups = groupByDate(list);
      Object.keys(groups).forEach(dk => {
        genListEl.appendChild(renderDateSep(fmtDate(groups[dk][0].createdAt)));
        groups[dk].forEach(m => {
          const isSelf  = m.userId === USER_ID;
          const display = isSelf ? 'You' : (m.userEmail ? m.userEmail : `member·${(m.userId || '').slice(0, 6)}`);
          const initial = (display[0] || '?').toUpperCase();
          const color   = isSelf ? bubbleColor : strColor(m.userId || display);
          const div = document.createElement('div');
          div.className = `bp-msg ${isSelf ? 'bp-msg-self' : 'bp-msg-other'}`;
          div.innerHTML = `
            ${!isSelf ? `<div class="bp-avatar-o" style="background:${color}">${initial}</div>` : ''}
            <div class="bp-bubble ${isSelf ? 'bp-bubble-self' : 'bp-bubble-other'}">
              ${!isSelf ? `<div class="bp-sender-name">${esc(display)}</div>` : ''}
              <div class="bp-msg-text">${esc(m.content)}</div>
              <div class="bp-msg-footer">
                <span class="bp-msg-time">${fmtTime(m.createdAt)}</span>
                ${isSelf ? `<span class="bp-msg-tick">✓✓</span>` : ''}
              </div>
            </div>`;
          genListEl.appendChild(div);
        });
      });
      genListEl.scrollTop = genListEl.scrollHeight;
    }

    async function sendGeneral() {
      const val = genInput.value.trim(); if (!val) return;
      try {
        await apiJson(`${API}/api/general`,
          jsonOpt('POST', { workspace: WORKSPACE, userId: USER_ID, userEmail: USER_EMAIL, content: val }));
        genInput.value = ''; genInput.style.height = 'auto';
        cache.general = null;
        renderGeneral();
      } catch {}
    }
    genSend.onclick = sendGeneral;
    genInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGeneral(); } });
    genInput.addEventListener('input', () => autoResize(genInput));

    setInterval(() => {
      if (panel.style.display !== 'none' && activeTab === 'general') {
        cache.general = null;
        renderGeneral();
      }
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

    /* ── APPEARANCE ── */
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

    async function initAppearance() {
      try {
        const cfg = await apiJson(`${API}/api/widget/config?${qs({ workspace: WORKSPACE })}`);
        applyAppearance(cfg); version = cfg.version || 0;
      } catch {}
    }
    async function longPoll() {
      while (true) {
        try {
          const res = await apiFetch(`${API}/api/widget/config/long?${qs({ workspace: WORKSPACE, since: version })}`);
          if (res.status === 200) {
            const cfg = await res.json();
            applyAppearance(cfg); version = cfg.version || version;
          }
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
      if (selfAv) {
        selfAv.textContent      = USER_INITIAL;
        selfAv.style.background = bubbleColor;
      }
      cache.notes     = null;
      cache.todo      = null;
      cache.general   = null;
      cache.reminders = null;
      btn.style.display = 'flex';
      checkReminders();
    };

    /* ✅ Full teardown on hide — resets boot flag for clean re-login */
    window.__bubble_hide = function () {
      panel.style.display = 'none';
      btn.style.display   = 'none';

      cache.notes     = null;
      cache.todo      = null;
      cache.general   = null;
      cache.reminders = null;
      window.BUBBLE_USER = null;

      // Remove DOM completely
      if (btn   && btn.parentNode)   btn.parentNode.removeChild(btn);
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);

      // ✅ Reset boot flag — widget will fully re-init on next login
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
