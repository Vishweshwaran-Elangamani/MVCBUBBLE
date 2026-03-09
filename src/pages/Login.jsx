import { useState } from "react";
import { apiCall }  from "../utils/api";
import { useToast } from "../components/Toast";
import bubbleLogo   from "../assets/bubble-logo.png";

const RULES = [
  { id: "len",   label: "At least 8 characters",         test: p => p.length >= 8            },
  { id: "upper", label: "At least one uppercase letter",  test: p => /[A-Z]/.test(p)         },
  { id: "lower", label: "At least one lowercase letter",  test: p => /[a-z]/.test(p)         },
  { id: "num",   label: "At least one number",            test: p => /[0-9]/.test(p)         },
  { id: "sym",   label: "At least one special character", test: p => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(p) {
  const score  = RULES.filter(r => r.test(p)).length;
  const levels = [
    { label: "Very Weak",   color: "#ef4444" },
    { label: "Very Weak",   color: "#ef4444" },
    { label: "Weak",        color: "#f97316" },
    { label: "Fair",        color: "#eab308" },
    { label: "Strong",      color: "#22c55e" },
    { label: "Very Strong", color: "#0d9488" },
  ];
  return { score, ...levels[score] };
}

function StrengthBar({ password }) {
  if (!password) return null;
  const { score, label, color } = getStrength(password);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {RULES.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 5, borderRadius: 4,
            background: i < score ? color : "#e2e8f0",
            transition: "background 0.25s",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{score}/{RULES.length} rules</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {RULES.map(rule => {
          const ok = rule.test(password);
          return (
            <div key={rule.id} style={{
              display: "flex", alignItems: "center", gap: 7,
              fontSize: 12, color: ok ? "#22c55e" : "#94a3b8",
              transition: "color 0.2s",
            }}>
              <span style={{ fontWeight: 700 }}>{ok ? "✓" : "○"}</span>
              {rule.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [toastEl,  showToast]   = useToast();

  const isRegister = mode === "register";

  async function submit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { showToast("Please enter your email address.", "error"); return; }
    if (!password)     { showToast("Please enter a password.", "error"); return; }

    if (isRegister) {
      for (const rule of RULES) {
        if (!rule.test(password)) {
          showToast(rule.label + " is required.", "error");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const res = await apiCall(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      if (!res.ok) {
        let msg;
        try { const b = await res.json(); msg = b?.message || b?.error; } catch {}
        if (!msg) {
          if      (res.status === 401) msg = `Wrong password for "${trimmedEmail}" — please try again.`;
          else if (res.status === 409) msg = `"${trimmedEmail}" is already registered — try logging in.`;
          else if (res.status === 500) msg = "Server error — make sure the API and MongoDB are running.";
          else                         msg = `Unexpected error (${res.status}) — please try again.`;
        }
        showToast(msg, "error");
        setLoading(false);
        return;
      }

      const data = await res.json();
      // ── KEY FIX: use bubble_token / bubble_email consistently ──
      localStorage.setItem("bubble_token", data.token);
      localStorage.setItem("bubble_email", data.adminEmail);
      onLogin(data.adminEmail);

    } catch {
      showToast("Cannot reach the API — is it running on http://localhost:5013?", "error");
      setLoading(false);
    }
  }

  return (
    <>
      {toastEl}
      <div className="login-wrapper">

        {/* Left panel */}
        <div className="login-left">
          <div className="login-left-inner">
            <div className="login-left-logo">
              <img src={bubbleLogo} alt="Bubble" className="login-logo-img" />
              <span>Bubble</span>
            </div>
            <h2 className="login-left-title">Your workspace,<br />your way.</h2>
            <p className="login-left-sub">
              Manage workspaces, customize your chat bubble, and embed it on any website in seconds.
            </p>
            <div className="login-bubbles">
              <div className="lb lb1" /><div className="lb lb2" />
              <div className="lb lb3" /><div className="lb lb4" />
            </div>
            <div className="login-mock-card">
              <div className="lmc-row"><div className="lmc-dot" style={{ background: "#6366f1" }} /><div className="lmc-line w60" /></div>
              <div className="lmc-row"><div className="lmc-dot" style={{ background: "#8b5cf6" }} /><div className="lmc-line w80" /></div>
              <div className="lmc-row"><div className="lmc-dot" style={{ background: "#ec4899" }} /><div className="lmc-line w50" /></div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="login-right">
          <div className="login-box">
            <div className="login-box-logo">
              <img src={bubbleLogo} alt="" className="login-box-logo-img" />
              <span>Bubble</span>
            </div>
            <p className="login-subtitle">Admin Dashboard</p>
            <p className="login-title">{isRegister ? "Create your account" : "Welcome back"}</p>

            <div style={{ display: "flex", gap: 6, marginBottom: 22, background: "#f1f5f9", padding: 4, borderRadius: 12 }}>
              {["login", "register"].map(m => (
                <button key={m} onClick={() => { setMode(m); setPassword(""); }} style={{
                  flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  background: mode === m ? "#6366f1" : "transparent",
                  color:      mode === m ? "#fff"    : "#64748b",
                  transition: "all 0.2s", textTransform: "capitalize",
                }}>
                  {m}
                </button>
              ))}
            </div>

            <div className="login-field">
              <label>Email</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && submit()} />
            </div>

            <div className="login-field">
              <label>Password</label>
              <input type="password"
                placeholder={isRegister ? "Min 8 chars, uppercase, number, symbol" : "••••••••"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && submit()} />
              {isRegister && <StrengthBar password={password} />}
            </div>

            <button className="login-btn-primary"
              style={{ width: "100%", marginTop: 14 }}
              onClick={submit} disabled={loading}>
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Login"}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
