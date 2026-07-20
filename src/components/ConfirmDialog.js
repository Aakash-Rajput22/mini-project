import { createContext, useCallback, useContext, useState } from "react";

const ConfirmContext = createContext(null);

/**
 * App-wide confirmation modal, replacing window.confirm(). Wrap the app
 * once in <ConfirmProvider>, then call useConfirm() anywhere:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: "Delete account?",
 *     message: "This can't be undone.",
 *     confirmLabel: "Delete",
 *     danger: true,
 *   });
 *   if (ok) { ...proceed... }
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, message, confirmLabel, cancelLabel, danger, resolve }

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        title: opts.title || "Are you sure?",
        message: opts.message || "",
        confirmLabel: opts.confirmLabel || "Confirm",
        cancelLabel: opts.cancelLabel || "Cancel",
        danger: !!opts.danger,
        resolve,
      });
    });
  }, []);

  const handle = (result) => {
    if (state) state.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="kn-confirm-backdrop" onClick={() => handle(false)}>
          <div className="kn-confirm-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="kn-confirm-title">{state.title}</h3>
            {state.message && <p className="kn-confirm-msg">{state.message}</p>}
            <div className="kn-confirm-actions">
              <button className="kn-confirm-cancel" onClick={() => handle(false)}>
                {state.cancelLabel}
              </button>
              <button
                className={"kn-confirm-ok " + (state.danger ? "kn-confirm-ok--danger" : "")}
                onClick={() => handle(true)}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fail safe: behaves like window.confirm would if a provider is missing.
    return async () => window.confirm("Are you sure?");
  }
  return ctx;
}