import { useEffect } from "react";
import type { Account } from "../types";
import { isElectronApp } from "../runtimeBridge";

type Args = {
  selectedAccount: Account | null;
  setStatusText: (text: string) => void;
};

export function useHealthMonitor({ selectedAccount, setStatusText }: Args) {
  useEffect(() => {
    if (!isElectronApp()) return;
    const timer = window.setInterval(async () => {
      const health = await window.electronAPI?.getAccountHealth();
      if (!health || !selectedAccount) return;
      const current = health.items.find((x) => x.accountId === selectedAccount.id);
      if (current && !current.healthy) setStatusText(`Health warning: ${selectedAccount.displayName} failed load`);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedAccount, setStatusText]);
}
