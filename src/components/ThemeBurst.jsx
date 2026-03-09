import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ThemeBurst({ x, y, color, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 760);
    return () => clearTimeout(t);
  }, [onDone]);
  return createPortal(
    <div className="theme-burst" style={{ left: x, top: y, background: color }} />,
    document.body
  );
}
