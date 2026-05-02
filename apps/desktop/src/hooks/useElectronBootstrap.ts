import { useEffect } from "react";
import { isElectronApp } from "../runtimeBridge";

type Args = {
  setLaunchOnStartup: (v: boolean) => void;
  setUnreadByAccount: (v: Record<string, number>) => void;
  setTotalUnread: (v: number) => void;
};

export function useElectronBootstrap({ setLaunchOnStartup, setUnreadByAccount, setTotalUnread }: Args) {
  useEffect(() => {
    if (!isElectronApp()) return;
    void window.electronAPI?.getLaunchOnStartup().then((v) => setLaunchOnStartup(Boolean(v)));
    const off = window.electronAPI?.onUnread((payload) => {
      setUnreadByAccount(payload.perAccount);
      setTotalUnread(payload.total);
    });
    return () => off?.();
  }, [setLaunchOnStartup, setUnreadByAccount, setTotalUnread]);
}
