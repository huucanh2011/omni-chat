import { useEffect } from "react";
import type { RefObject } from "react";
import type { Account } from "../types";
import { isElectronApp, resizeAccountWebview } from "../runtimeBridge";

type Args = {
  selectedAccount: Account | null;
  webviewHostRef: RefObject<HTMLDivElement | null>;
};

export function useWebviewResize({ selectedAccount, webviewHostRef }: Args) {
  useEffect(() => {
    const host = webviewHostRef.current;
    if (!host || !selectedAccount) return;

    const onResize = () => {
      const rect = host.getBoundingClientRect();
      const inset = isElectronApp() ? 10 : 2;
      void resizeAccountWebview(selectedAccount.id, {
        x: rect.left + inset,
        y: rect.top + inset,
        width: Math.max(0, rect.width - inset * 2),
        height: Math.max(0, rect.height - inset * 2)
      });
    };

    const observer = new ResizeObserver(onResize);
    observer.observe(host);
    window.addEventListener("resize", onResize);
    onResize();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [selectedAccount, webviewHostRef]);
}
