const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { URL } = require("node:url");
const { app, BrowserWindow, WebContentsView, ipcMain, Tray, Menu, nativeImage } = require("electron");
const { detectUnreadForWebContents, parseUnreadFromTitle } = require("./unread-detectors.cjs");
let autoUpdater = null;
try {
  ({ autoUpdater } = require("electron-updater"));
} catch {}

const APP_NAME = "OmniChat";
const GATEWAY_PORT = Number(process.env.GATEWAY_PORT || 8787);
const VITE_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5180";
const PRELOAD = path.join(__dirname, "electron-preload.cjs");
const WEBVIEW_PRELOAD = path.join(__dirname, "webview-preload.cjs");
const APP_ICON = path.join(__dirname, "public", "app-icon.png");
const RENDERER_INDEX = path.join(__dirname, "dist", "index.html");
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// WebContentsView + some Chromium GPU paths can spam "Invalid mailbox" on macOS.
// Prioritize stability for multi-webview chat container.
if (process.platform === "darwin") {
  app.disableHardwareAcceleration();
}

let mainWindow = null;
let splashWindow = null;
let tray = null;
let activeAccountId = null;
let unreadTotal = 0;
let unreadPollTimer = null;
let embeddedGatewayServer = null;
let gatewayBaseUrl = `http://127.0.0.1:${GATEWAY_PORT}`;
let updateState = {
  enabled: false,
  checking: false,
  available: false,
  downloaded: false,
  version: "",
  error: ""
};
// accountId -> { view, sourceUrl, muted, unread, lastFailAt }
const accountViews = new Map();

function resolveAppVersion() {
  try {
    const localPkgPath = path.join(__dirname, "package.json");
    const localPkg = JSON.parse(fs.readFileSync(localPkgPath, "utf8"));
    if (localPkg?.version) return String(localPkg.version);
  } catch {}
  return app.getVersion();
}

function ensureSingleInstance() {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return false;
  }
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  return true;
}

function publishUpdateState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("app:update-state", updateState);
}

function setupAutoUpdater() {
  if (!app.isPackaged || !autoUpdater) {
    updateState = {
      ...updateState,
      enabled: false,
      error: ""
    };
    return;
  }

  updateState.enabled = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = true;

  autoUpdater.on("checking-for-update", () => {
    updateState = { ...updateState, checking: true, error: "" };
    publishUpdateState();
  });
  autoUpdater.on("update-available", (info) => {
    updateState = {
      ...updateState,
      checking: false,
      available: true,
      downloaded: false,
      version: info?.version || ""
    };
    publishUpdateState();
  });
  autoUpdater.on("update-not-available", () => {
    updateState = {
      ...updateState,
      checking: false,
      available: false,
      downloaded: false,
      error: ""
    };
    publishUpdateState();
  });
  autoUpdater.on("update-downloaded", (info) => {
    updateState = {
      ...updateState,
      checking: false,
      available: true,
      downloaded: true,
      version: info?.version || updateState.version
    };
    publishUpdateState();
  });
  autoUpdater.on("error", (err) => {
    updateState = {
      ...updateState,
      checking: false,
      error: String(err?.message || err || "update error")
    };
    publishUpdateState();
  });
}

function gatewayDbPath() {
  const dir = path.join(app.getPath("userData"), "gateway");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "accounts.json");
}

function loadGatewayDb() {
  const dbPath = gatewayDbPath();
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ accounts: [] }, null, 2), "utf8");
  }
  const raw = fs.readFileSync(dbPath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.accounts) ? parsed : { accounts: [] };
}

function saveGatewayDb(db) {
  fs.writeFileSync(gatewayDbPath(), JSON.stringify(db, null, 2), "utf8");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function defaultServiceUrl(platform) {
  if (platform === "zalo") return "https://chat.zalo.me/";
  if (platform === "teams") return "https://teams.microsoft.com/v2/";
  return "https://web.telegram.org/";
}

function normalizeGatewayServiceUrl(platform, serviceUrl) {
  const raw = String(serviceUrl || "").trim();
  if (!raw) return defaultServiceUrl(platform);
  if (platform !== "teams") return raw;
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes("teams.microsoft.com")) return raw;
    if (parsed.pathname.startsWith("/v2")) return parsed.toString();
    return defaultServiceUrl("teams");
  } catch {
    return defaultServiceUrl("teams");
  }
}

function startEmbeddedGateway() {
  if (!app.isPackaged) {
    gatewayBaseUrl = `http://127.0.0.1:${GATEWAY_PORT}`;
    return Promise.resolve(gatewayBaseUrl);
  }
  if (embeddedGatewayServer) return Promise.resolve(gatewayBaseUrl);
  embeddedGatewayServer = http.createServer(async (req, res) => {
    const method = req.method || "GET";
    const pathname = new URL(req.url || "/", `http://127.0.0.1:${GATEWAY_PORT}`).pathname;

    if (method === "OPTIONS") return sendJson(res, 200, { ok: true });
    if (pathname === "/health") {
      return sendJson(res, 200, { ok: true, service: "gateway", embedded: true, now: new Date().toISOString() });
    }

    if (pathname === "/api/accounts" && method === "GET") {
      const db = loadGatewayDb();
      return sendJson(res, 200, db.accounts.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)));
    }

    if (pathname === "/api/accounts" && method === "POST") {
      const body = await readJsonBody(req).catch(() => null);
      if (!body?.platform || !body?.displayName) return sendJson(res, 400, { error: "Invalid payload" });
      if (!["telegram", "zalo", "teams"].includes(body.platform)) return sendJson(res, 400, { error: "Invalid platform" });
      const now = new Date().toISOString();
      const account = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        platform: body.platform,
        displayName: String(body.displayName).trim(),
        serviceUrl: normalizeGatewayServiceUrl(body.platform, body.serviceUrl),
        status: "connected",
        createdAt: now,
        updatedAt: now
      };
      const db = loadGatewayDb();
      db.accounts.push(account);
      saveGatewayDb(db);
      return sendJson(res, 201, account);
    }

    if (pathname.startsWith("/api/accounts/")) {
      const id = pathname.slice("/api/accounts/".length);
      const db = loadGatewayDb();
      const idx = db.accounts.findIndex((x) => x.id === id);
      if (idx < 0) return sendJson(res, 404, { error: "Account not found" });

      if (method === "DELETE") {
        db.accounts.splice(idx, 1);
        saveGatewayDb(db);
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
        });
        return res.end();
      }

      if (method === "GET") return sendJson(res, 200, db.accounts[idx]);

      if (method === "PATCH") {
        const body = await readJsonBody(req).catch(() => null);
        if (!body || (body.displayName == null && body.serviceUrl == null && body.status == null)) {
          return sendJson(res, 400, { error: "Invalid payload" });
        }
        const current = db.accounts[idx];
        const updated = {
          ...current,
          displayName: body.displayName ? String(body.displayName).trim() : current.displayName,
          serviceUrl: normalizeGatewayServiceUrl(current.platform, body.serviceUrl ?? current.serviceUrl),
          status: body.status || current.status,
          updatedAt: new Date().toISOString()
        };
        db.accounts[idx] = updated;
        saveGatewayDb(db);
        return sendJson(res, 200, updated);
      }
    }

    return sendJson(res, 404, { error: "Not found" });
  });

  return new Promise((resolve, reject) => {
    const listenOn = (port) => {
      embeddedGatewayServer.listen(port, "127.0.0.1", () => {
        const addr = embeddedGatewayServer.address();
        const picked = typeof addr === "object" && addr?.port ? addr.port : GATEWAY_PORT;
        gatewayBaseUrl = `http://127.0.0.1:${picked}`;
        console.log(`[embedded-gateway] listening on ${gatewayBaseUrl}`);
        resolve(gatewayBaseUrl);
      });
    };

    embeddedGatewayServer.once("error", (err) => {
      if (err?.code === "EADDRINUSE") {
        embeddedGatewayServer.removeAllListeners("error");
        embeddedGatewayServer.once("error", reject);
        listenOn(0);
        return;
      }
      reject(err);
    });

    listenOn(GATEWAY_PORT);
  });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 280,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    show: false,
    center: true,
    backgroundColor: "#0f1420"
  });
  splashWindow.loadURL(
    `data:text/html;charset=UTF-8,${encodeURIComponent(`
      <html><body style="margin:0;background:linear-gradient(135deg,#0f1420,#17243d);display:flex;align-items:center;justify-content:center;font-family:-apple-system,Segoe UI,sans-serif;color:#e6eeff;">
        <div style="text-align:center">
          <div style="font-size:28px;font-weight:700;letter-spacing:.4px">OmniChat</div>
          <div style="margin-top:10px;opacity:.7;font-size:13px">Đang khởi động...</div>
        </div>
      </body></html>
    `)}`
  );
  splashWindow.once("ready-to-show", () => splashWindow?.show());
}

function normalizeBounds(bounds) {
  const x = Math.max(0, Math.round(bounds?.x ?? 0));
  const y = Math.max(0, Math.round(bounds?.y ?? 0));
  const width = Math.max(1, Math.round(bounds?.width ?? 1));
  const height = Math.max(1, Math.round(bounds?.height ?? 1));
  return { x, y, width, height };
}

function normalizeServiceUrl(serviceUrl) {
  const raw = (serviceUrl || "").trim();
  if (!raw) return raw;
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes("teams.microsoft.com")) return raw;
    if (parsed.pathname.startsWith("/v2")) return parsed.toString();
    return "https://teams.microsoft.com/v2/";
  } catch {
    return raw;
  }
}

async function computeUnread(entry) {
  const wc = entry.view?.webContents;
  if (!wc || wc.isDestroyed()) return 0;

  // Avoid executeJavaScript while a page is loading; Electron internally queues
  // did-stop-loading listeners for these calls and can trigger MaxListeners warnings.
  if (wc.isLoading() || wc.isWaitingForResponse()) {
    return entry.unread || 0;
  }

  return detectUnreadForWebContents(wc);
}

function publishUnread() {
  unreadTotal = 0;
  for (const entry of accountViews.values()) unreadTotal += entry.unread || 0;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("accounts:unread", {
      total: unreadTotal,
      perAccount: Object.fromEntries([...accountViews.entries()].map(([id, e]) => [id, e.unread || 0]))
    });
  }
  if (process.platform === "darwin" && app.dock) {
    app.dock.setBadge(unreadTotal > 0 ? "●" : "");
  }
}

function startUnreadPolling() {
  if (unreadPollTimer) return;
  unreadPollTimer = setInterval(() => {
    void (async () => {
      let changed = false;
      for (const entry of accountViews.values()) {
        const next = await computeUnread(entry);
        if (next !== (entry.unread || 0)) {
          entry.unread = next;
          changed = true;
        }
      }
      if (changed) publishUnread();
    })();
  }, 1000);
}

function stopUnreadPolling() {
  if (!unreadPollTimer) return;
  clearInterval(unreadPollTimer);
  unreadPollTimer = null;
}

function ensureTray() {
  if (tray) return;
  const img = nativeImage.createFromPath(APP_ICON);
  tray = new Tray(img);
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show",
        click: () => {
          if (!mainWindow) return;
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: "Quit",
        click: () => app.quit()
      }
    ])
  );
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function ensureMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: APP_NAME,
    autoHideMenuBar: true,
    show: false,
    icon: APP_ICON,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: PRELOAD
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(RENDERER_INDEX);
  } else {
    mainWindow.loadURL(VITE_URL);
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
  });
  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on("closed", () => {
    accountViews.clear();
    mainWindow = null;
    activeAccountId = null;
  });
  return mainWindow;
}

function bindViewEvents(accountId, entry) {
  const view = entry.view;
  view.webContents.setUserAgent(entry.userAgent || DESKTOP_UA);
  view.webContents.setWindowOpenHandler(({ url }) => {
    const popup = new BrowserWindow({
      width: 980,
      height: 760,
      autoHideMenuBar: true,
      parent: mainWindow ?? undefined,
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    popup.loadURL(url);
    return { action: "deny" };
  });
  view.webContents.on("did-fail-load", (_event, code, description, url) => {
    entry.lastFailAt = Date.now();
    entry.lastFail = `${code}:${description}:${url}`;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("accounts:health", getHealthSnapshot());
    }
  });
  view.webContents.on("page-title-updated", (_e, title) => {
    entry.unread = parseUnreadFromTitle(title) > 0 ? 1 : 0;
    publishUnread();
  });
  view.webContents.on("did-finish-load", async () => {
    const current = view.webContents.getURL();
    if (!current.includes("teams.microsoft.com")) return;
    try {
      await view.webContents.executeJavaScript(
        `(() => { const all = Array.from(document.querySelectorAll("button,a")); const t = all.find(el => ((el.textContent||"").toLowerCase().includes("use teams on the web"))); if (t) t.click(); })();`,
        true
      );
    } catch {}
  });
}

function getOrCreateAccountView(accountId, serviceUrl, opts = {}) {
  const existing = accountViews.get(accountId);
  if (existing?.view && !existing.view.webContents.isDestroyed()) {
    existing.muted = Boolean(opts.muted);
    existing.userAgent = opts.userAgent || existing.userAgent || DESKTOP_UA;
    existing.view.webContents.setAudioMuted(existing.muted);
    existing.view.webContents.setUserAgent(existing.userAgent);
    return existing;
  }

  const view = new WebContentsView({
    webPreferences: {
      partition: `persist:account-${accountId}`,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      preload: WEBVIEW_PRELOAD,
      additionalArguments: [`--omni-account-id=${accountId}`],
      webSecurity: false,
      allowRunningInsecureContent: false
    }
  });

  const normalized = normalizeServiceUrl(serviceUrl);
  const entry = {
    view,
    sourceUrl: normalized,
    muted: Boolean(opts.muted),
    userAgent: opts.userAgent || DESKTOP_UA,
    proxyUrl: opts.proxyUrl || "",
    unread: 0,
    lastFailAt: 0,
    lastFail: ""
  };

  bindViewEvents(accountId, entry);
  view.webContents.setAudioMuted(entry.muted);

  accountViews.set(accountId, entry);
  view.webContents.loadURL(normalized);
  return entry;
}

function hideAllViews(window) {
  for (const entry of accountViews.values()) {
    const view = entry.view;
    try {
      window.contentView.removeChildView(view);
    } catch {}
    view.setVisible(false);
  }
}

function switchToAccount(payload) {
  const window = ensureMainWindow();
  const { accountId } = payload;
  const serviceUrl = normalizeServiceUrl(payload.serviceUrl);
  const bounds = normalizeBounds(payload);
  const entry = getOrCreateAccountView(accountId, serviceUrl, payload);
  const view = entry.view;

  hideAllViews(window);
  if (entry.sourceUrl !== serviceUrl) {
    entry.sourceUrl = serviceUrl;
    view.webContents.loadURL(serviceUrl);
  }

  view.setBounds(bounds);
  view.setVisible(true);
  window.contentView.addChildView(view);
  activeAccountId = accountId;
  if (entry.unread) {
    entry.unread = 0;
    publishUnread();
  }
}

function resizeAccount(payload) {
  const entry = accountViews.get(payload.accountId);
  if (!entry) return;
  entry.view.setBounds(normalizeBounds(payload));
}

function setVisibility(payload) {
  const { accountId, visible } = payload;
  const window = ensureMainWindow();
  const entry = accountViews.get(accountId);
  if (!entry) return;
  const view = entry.view;

  if (visible) {
    hideAllViews(window);
    view.setVisible(true);
    window.contentView.addChildView(view);
    activeAccountId = accountId;
    return;
  }
  try {
    window.contentView.removeChildView(view);
  } catch {}
  view.setVisible(false);
}

function reloadAccount(payload) {
  const entry = accountViews.get(payload.accountId);
  if (entry?.view && !entry.view.webContents.isDestroyed()) entry.view.webContents.reloadIgnoringCache();
}

function closeAccount(payload) {
  const entry = accountViews.get(payload.accountId);
  if (!entry) return;
  const window = ensureMainWindow();
  try {
    window.contentView.removeChildView(entry.view);
  } catch {}
  if (!entry.view.webContents.isDestroyed()) entry.view.webContents.close({ waitForBeforeUnload: false });
  accountViews.delete(payload.accountId);
  publishUnread();
}

async function clearSession(payload) {
  const accountId = payload.accountId;
  const partition = `persist:account-${accountId}`;
  const { session } = require("electron");
  const ses = session.fromPartition(partition);
  await ses.clearStorageData();
  await ses.clearCache();
  closeAccount({ accountId });
}

function getHealthSnapshot() {
  const now = Date.now();
  const items = [...accountViews.entries()].map(([id, entry]) => ({
    accountId: id,
    healthy: !entry.lastFailAt || now - entry.lastFailAt > 5000,
    lastFail: entry.lastFail || "",
    unread: entry.unread || 0
  }));
  return { items, totalUnread: unreadTotal };
}

function recoverAccount(payload) {
  const entry = accountViews.get(payload.accountId);
  if (!entry) return;
  entry.lastFail = "";
  entry.lastFailAt = 0;
  entry.view.webContents.reloadIgnoringCache();
}

app.setName(APP_NAME);
ensureSingleInstance();

app.whenReady().then(() => {
  createSplashWindow();
  void startEmbeddedGateway();
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(APP_ICON);
  }
  ensureMainWindow();
  setupAutoUpdater();
  if (updateState.enabled) {
    setTimeout(() => {
      void autoUpdater?.checkForUpdatesAndNotify();
    }, 7000);
  }
  ensureTray();
  startUnreadPolling();

  ipcMain.handle("webview:switch", async (_e, p) => switchToAccount(p));
  ipcMain.handle("webview:mount", async (_e, p) => switchToAccount(p));
  ipcMain.handle("webview:resize", async (_e, p) => resizeAccount(p));
  ipcMain.handle("webview:visibility", async (_e, p) => setVisibility(p));
  ipcMain.handle("webview:reload", async (_e, p) => reloadAccount(p));
  ipcMain.handle("webview:close", async (_e, p) => closeAccount(p));
  ipcMain.handle("app:setLaunchOnStartup", async (_e, enabled) => {
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle("app:getLaunchOnStartup", async () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle("app:getVersion", async () => resolveAppVersion());
  ipcMain.handle("app:getUpdateState", async () => updateState);
  ipcMain.handle("app:checkForUpdates", async () => {
    if (!updateState.enabled || !autoUpdater) return updateState;
    await autoUpdater.checkForUpdates();
    return updateState;
  });
  ipcMain.handle("app:quitAndInstallUpdate", async () => {
    if (!updateState.downloaded || !autoUpdater) return false;
    autoUpdater.quitAndInstall();
    return true;
  });
  ipcMain.handle("app:getGatewayBaseUrl", async () => gatewayBaseUrl);
  ipcMain.handle("account:clearSession", async (_e, p) => clearSession(p));
  ipcMain.handle("account:getHealth", async () => getHealthSnapshot());
  ipcMain.handle("account:recover", async (_e, p) => recoverAccount(p));
  ipcMain.on("account:unread-signal", (_e, payload) => {
    const accountId = payload?.accountId;
    if (!accountId) return;
    const entry = accountViews.get(accountId);
    if (!entry) return;
    if (activeAccountId === accountId) return;
    if (entry.unread !== 1) {
      entry.unread = 1;
      publishUnread();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) ensureMainWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on("before-quit", () => {
  app.isQuiting = true;
  stopUnreadPolling();
  if (embeddedGatewayServer) {
    embeddedGatewayServer.close();
    embeddedGatewayServer = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
