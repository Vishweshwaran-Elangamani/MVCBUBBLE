export const API = "http://localhost:5013";

export function apiCall(path, opts = {}) {
  const token = localStorage.getItem("bubble_token");
  return fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
}

export function darkenHex(hex, amount = 0.28) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean.length === 3
    ? clean.split("").map(c => c + c).join("") : clean, 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8)  & 255) * (1 - amount)));
  const b = Math.max(0, Math.round(( n        & 255) * (1 - amount)));
  return `rgb(${r},${g},${b})`;
}
