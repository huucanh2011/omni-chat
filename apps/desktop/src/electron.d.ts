type WebviewPayload = {
  accountId: string;
  accountName?: string;
  serviceUrl?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  visible?: boolean;
  muted?: boolean;
  userAgent?: string;
  proxyUrl?: string;
};

interface ElectronApi {
  onUnread(callback: (payload: { total: number; perAccount: Record<string, number> }) => void): () => void;
  onUpdateState(callback: (payload: { enabled: boolean; checking: boolean; available: boolean; downloaded: boolean; version: string; error: string }) => void): () => void;
  switchAccountWebview(payload: WebviewPayload): Promise<void>;
  mountAccountWebview(payload: WebviewPayload): Promise<void>;
  resizeAccountWebview(payload: WebviewPayload): Promise<void>;
  setAccountWebviewVisibility(payload: WebviewPayload): Promise<void>;
  reloadAccountWebview(payload: WebviewPayload): Promise<void>;
  closeAccountWebview(payload: WebviewPayload): Promise<void>;
  getGatewayBaseUrl(): Promise<string>;
  getVersion(): Promise<string>;
  getUpdateState(): Promise<{ enabled: boolean; checking: boolean; available: boolean; downloaded: boolean; version: string; error: string }>;
  checkForUpdates(): Promise<{ enabled: boolean; checking: boolean; available: boolean; downloaded: boolean; version: string; error: string }>;
  quitAndInstallUpdate(): Promise<boolean>;
  setLaunchOnStartup(enabled: boolean): Promise<boolean>;
  getLaunchOnStartup(): Promise<boolean>;
  clearAccountSession(payload: { accountId: string }): Promise<void>;
  getAccountHealth(): Promise<{ items: Array<{ accountId: string; healthy: boolean; lastFail: string; unread: number }>; totalUnread: number }>;
  recoverAccount(payload: { accountId: string }): Promise<void>;
}

interface Window {
  electronAPI?: ElectronApi;
}
