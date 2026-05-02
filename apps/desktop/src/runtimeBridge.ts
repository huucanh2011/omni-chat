import type { Account } from "./types";

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type WebviewOptions = {
  muted?: boolean;
  userAgent?: string;
  proxyUrl?: string;
};

export function isElectronApp(): boolean {
  return typeof window !== "undefined" && typeof window.electronAPI !== "undefined";
}

export async function switchAccountWebview(account: Account, bounds: Bounds, options?: WebviewOptions): Promise<void> {
  if (isElectronApp()) {
    await window.electronAPI?.switchAccountWebview({
      accountId: account.id,
      accountName: account.displayName,
      serviceUrl: account.serviceUrl,
      muted: options?.muted,
      userAgent: options?.userAgent,
      proxyUrl: options?.proxyUrl,
      ...bounds
    });
    return;
  }
}

export async function mountAccountWebview(account: Account, bounds: Bounds): Promise<void> {
  if (isElectronApp()) {
    await window.electronAPI?.mountAccountWebview({
      accountId: account.id,
      accountName: account.displayName,
      serviceUrl: account.serviceUrl,
      ...bounds
    });
    return;
  }
}

export async function resizeAccountWebview(accountId: string, bounds: Bounds): Promise<void> {
  if (isElectronApp()) {
    await window.electronAPI?.resizeAccountWebview({
      accountId,
      ...bounds
    });
    return;
  }
}

export async function setAccountWebviewVisibility(accountId: string, visible: boolean): Promise<void> {
  if (isElectronApp()) {
    await window.electronAPI?.setAccountWebviewVisibility({ accountId, visible });
    return;
  }
}

export async function reloadAccountWebview(accountId: string): Promise<void> {
  if (isElectronApp()) {
    await window.electronAPI?.reloadAccountWebview({ accountId });
    return;
  }
}

export async function closeAccountWebview(accountId: string): Promise<void> {
  if (isElectronApp()) {
    await window.electronAPI?.closeAccountWebview({ accountId });
    return;
  }
}
