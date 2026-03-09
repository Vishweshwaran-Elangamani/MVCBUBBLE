import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return createPortal(
    <div className={`toast ${type}`}>{msg}</div>,
    document.body
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = "success") => {
    setToast({ msg, type, key: Date.now() });
  }, []);
  const el = toast
    ? <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
    : null;
  return [el, show];
}
