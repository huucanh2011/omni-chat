import { isElectronApp, reloadAccountWebview } from "../runtimeBridge";
import type { Account } from "../types";
import { vi } from "../i18n/vi";

type Args = {
  selectedAccount: Account | null;
  mountInHost: (account: Account) => Promise<void>;
  setStatusText: (text: string) => void;
  resetMountedKey: () => void;
};

export function useAccountActions({
  selectedAccount,
  mountInHost,
  setStatusText,
  resetMountedKey,
}: Args) {
  const forceReload = async () => {
    if (!selectedAccount) return;
    if (isElectronApp()) await reloadAccountWebview(selectedAccount.id);
    else await mountInHost(selectedAccount);
    setStatusText(vi.status.reloaded(selectedAccount.displayName));
  };

  const clearSession = async () => {
    if (!selectedAccount || !isElectronApp()) return;
    await window.electronAPI?.clearAccountSession({
      accountId: selectedAccount.id,
    });
    resetMountedKey();
    setStatusText(vi.status.sessionCleared);
  };

  const recoverCurrent = async () => {
    if (!selectedAccount || !isElectronApp()) return;
    await window.electronAPI?.recoverAccount({ accountId: selectedAccount.id });
    setStatusText(vi.status.recoverTriggered);
  };

  return {
    forceReload,
    clearSession,
    recoverCurrent,
  };
}
