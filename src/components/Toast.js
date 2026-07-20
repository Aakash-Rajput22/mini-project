import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

/**
 * App-wide toast notifications. Wrap the app once in <ToastProvider>,
 * then call useToast() anywhere to fire a toast instead of alert().
 *   const toast = useToast();
 *   toast.success("Profile saved!");
 *   toast.error("Something went wrong.");
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((message, type = "info", duration = 3500) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const api = {
    success: (msg, duration) => push(msg, "success", duration),
    error: (msg, duration) => push(msg, "error", duration),
    info: (msg, duration) => push(msg, "info", duration),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="kn-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={"kn-toast kn-toast--" + t.type} onClick={() => dismiss(t.id)}>
            <span className="kn-toast-icon">
              {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
            </span>
            <span className="kn-toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail safe rather than crash the page if a provider is missing.
    return { success: () => {}, error: () => {}, info: () => {} };
  }
  return ctx;
}