import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell, Box, Button, Modal, Stack, Switch, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAccount, deleteAccount, fetchAccounts, updateAccount } from "./api";
import {
  closeAccountWebview,
  isElectronApp,
  reloadAccountWebview,
  resizeAccountWebview,
  setAccountWebviewVisibility,
  switchAccountWebview
} from "./runtimeBridge";
import { useUiStore } from "./store";
import type { Account, Platform } from "./types";
import { defaultServiceUrl, isValidHttpUrl, normalizeServiceUrl } from "./constants";
import { AccountRail } from "./components/AccountRail";
import { AccountDrawer } from "./components/AccountDrawer";
import { EmptyState } from "./components/EmptyState";
import { useAccountMountSync } from "./hooks/useAccountMountSync";
import { useElectronBootstrap } from "./hooks/useElectronBootstrap";
import { useHealthMonitor } from "./hooks/useHealthMonitor";
import { useHotkeySwitch } from "./hooks/useHotkeySwitch";
import { useInitialAccountSelection } from "./hooks/useInitialAccountSelection";
import { useWebviewResize } from "./hooks/useWebviewResize";
import { vi } from "./i18n/vi";

type DrawerMode = "add" | "edit";
type AccountPrefs = Record<string, { muted?: boolean; proxyUrl?: string; userAgent?: string }>;
type UpdateState = { enabled: boolean; checking: boolean; available: boolean; downloaded: boolean; version: string; error: string };

function loadPrefs(): AccountPrefs {
  try {
    return JSON.parse(localStorage.getItem("account_prefs") ?? "{}") as AccountPrefs;
  } catch {
    return {};
  }
}

function loadAccountOrder(): string[] {
  try {
    return JSON.parse(localStorage.getItem("account_order") ?? "[]") as string[];
  } catch {
    return [];
  }
}

function App() {
  const queryClient = useQueryClient();
  const { selectedAccountId, setSelectedAccountId } = useUiStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("add");
  const [platform, setPlatform] = useState<Platform>("telegram");
  const [displayName, setDisplayName] = useState("");
  const [serviceUrl, setServiceUrl] = useState(defaultServiceUrl.telegram);
  const [statusText, setStatusText] = useState<string>(vi.app.ready);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [unreadByAccount, setUnreadByAccount] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [muted, setMuted] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountOrder, setAccountOrder] = useState<string[]>(loadAccountOrder);
  const [appVersion, setAppVersion] = useState(import.meta.env.VITE_APP_VERSION ?? "dev");
  const [updateState, setUpdateState] = useState<UpdateState>({ enabled: false, checking: false, available: false, downloaded: false, version: "", error: "" });
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const webviewHostRef = useRef<HTMLDivElement | null>(null);
  const syncTokenRef = useRef(0);
  const lastMountedKeyRef = useRef<string>("");
  const prefsRef = useRef<AccountPrefs>(loadPrefs());
  const lastDownloadedVersionRef = useRef("");

  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });

  const selectedAccount = useMemo(
    () => accountsQuery.data?.find((a) => a.id === selectedAccountId) ?? null,
    [accountsQuery.data, selectedAccountId]
  );

  const selectedServiceUrl = useMemo(() => {
    if (!selectedAccount) return "";
    const direct = selectedAccount.serviceUrl?.trim() ?? "";
    if (isValidHttpUrl(direct)) return normalizeServiceUrl(selectedAccount.platform, direct);
    return defaultServiceUrl[selectedAccount.platform];
  }, [selectedAccount]);

  const sortedAccounts = useMemo(() => {
    const items = accountsQuery.data ?? [];
    if (!items.length) return items;
    const orderIndex = new Map(accountOrder.map((id, idx) => [id, idx]));
    return [...items].sort((a, b) => {
      const ai = orderIndex.get(a.id);
      const bi = orderIndex.get(b.id);
      if (ai == null && bi == null) return 0;
      if (ai == null) return 1;
      if (bi == null) return -1;
      return ai - bi;
    });
  }, [accountsQuery.data, accountOrder]);

  const filteredAccounts = useMemo(() => {
    const items = sortedAccounts;
    const keyword = accountSearch.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((account) => {
      const platformLabel =
        account.platform === "telegram" ? vi.platform.telegram : account.platform === "zalo" ? vi.platform.zalo : vi.platform.teams;
      const haystack = `${account.displayName} ${account.platform} ${platformLabel}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [sortedAccounts, accountSearch]);

  const mountInHost = useCallback(async (account: Account) => {
    const resolvedUrl = isValidHttpUrl(account.serviceUrl)
      ? normalizeServiceUrl(account.platform, account.serviceUrl)
      : defaultServiceUrl[account.platform];
    if (!isValidHttpUrl(resolvedUrl)) return;
    const host = webviewHostRef.current;
    if (!host) return;

    const token = ++syncTokenRef.current;
    const rect = host.getBoundingClientRect();
    const inset = isElectronApp() ? 10 : 2;
    const bounds = {
      x: rect.left + inset,
      y: rect.top + inset,
      width: Math.max(0, rect.width - inset * 2),
      height: Math.max(0, rect.height - inset * 2)
    };

    try {
      const pref = prefsRef.current[account.id] ?? {};
      await switchAccountWebview({ ...account, serviceUrl: resolvedUrl }, bounds, pref);
      if (token !== syncTokenRef.current) return;
      await resizeAccountWebview(account.id, bounds);
    } catch {
      setStatusText(vi.status.switchFailed(account.displayName));
    }
  }, []);

  useInitialAccountSelection({
    accounts: accountsQuery.data,
    selectedAccountId,
    setSelectedAccountId
  });
  useAccountMountSync({
    selectedAccount,
    selectedServiceUrl,
    lastMountedKeyRef,
    mountInHost
  });
  useElectronBootstrap({
    setLaunchOnStartup,
    setUnreadByAccount,
    setTotalUnread
  });
  useWebviewResize({
    selectedAccount,
    webviewHostRef
  });
  useHotkeySwitch({
    accounts: accountsQuery.data,
    setSelectedAccountId
  });
  useHealthMonitor({
    selectedAccount,
    setStatusText
  });

  useEffect(() => {
    if (!selectedAccount) return;
    const pref = prefsRef.current[selectedAccount.id] ?? {};
    setMuted(Boolean(pref.muted));
    setProxyUrl(pref.proxyUrl ?? "");
    setUserAgent(pref.userAgent ?? "");
  }, [selectedAccount]);

  useEffect(() => {
    if (!filteredAccounts.length) return;
    if (!selectedAccountId) return;
    if (filteredAccounts.some((a) => a.id === selectedAccountId)) return;
    setSelectedAccountId(filteredAccounts[0].id);
  }, [filteredAccounts, selectedAccountId, setSelectedAccountId]);

  useEffect(() => {
    localStorage.setItem("account_order", JSON.stringify(accountOrder));
  }, [accountOrder]);

  useEffect(() => {
    if (!isElectronApp()) return;
    void window.electronAPI?.getVersion().then((v) => {
      if (v) setAppVersion(v);
    });
  }, []);

  useEffect(() => {
    if (!isElectronApp() || !window.electronAPI) return;

    void window.electronAPI.getUpdateState().then((state) => {
      if (state) setUpdateState(state);
    });

    const off = window.electronAPI.onUpdateState((state) => {
      setUpdateState(state);
    });

    return () => {
      off?.();
    };
  }, []);

  useEffect(() => {
    if (!updateState.downloaded) return;
    const v = updateState.version || "";
    if (lastDownloadedVersionRef.current === v) return;
    lastDownloadedVersionRef.current = v;
    notifications.show({
      color: "teal",
      title: vi.toast.updateDownloadedTitle,
      message: vi.toast.updateDownloadedBody(v || "bản mới"),
      autoClose: 7000
    });
  }, [updateState.downloaded, updateState.version]);


  const createAccountMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: async (account) => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedAccountId(account.id);
      setStatusText(vi.status.accountAdded(account.displayName));
      setDrawerOpen(false);
    },
    onError: () => setStatusText(vi.status.createFailed)
  });

  const updateAccountMutation = useMutation({
    mutationFn: (payload: { accountId: string; displayName: string; serviceUrl: string }) =>
      updateAccount(payload.accountId, { displayName: payload.displayName, serviceUrl: payload.serviceUrl }),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedAccountId(updated.id);
      lastMountedKeyRef.current = "";
      setStatusText(vi.status.accountUpdated(updated.displayName));
      setDrawerOpen(false);
    },
    onError: () => setStatusText(vi.status.updateFailed)
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      const currentId = selectedAccountId;
      if (currentId && isElectronApp()) await closeAccountWebview(currentId);
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      const latest = (queryClient.getQueryData(["accounts"]) as Account[] | undefined) ?? [];
      const next = latest.find((a) => a.id !== currentId) ?? null;
      setSelectedAccountId(next?.id ?? null);
      setStatusText(vi.status.accountDeleted);
      setDrawerOpen(false);
    },
    onError: () => setStatusText(vi.status.deleteFailed)
  });

  const openDrawer = async (mode: DrawerMode) => {
    setDrawerMode(mode);
    if (mode === "add") {
      setPlatform("telegram");
      setDisplayName("");
      setServiceUrl(defaultServiceUrl.telegram);
      setMuted(false);
      setProxyUrl("");
      setUserAgent("");
    } else if (selectedAccount) {
      setPlatform(selectedAccount.platform);
      setDisplayName(selectedAccount.displayName);
      setServiceUrl(selectedServiceUrl);
      const pref = prefsRef.current[selectedAccount.id] ?? {};
      setMuted(Boolean(pref.muted));
      setProxyUrl(pref.proxyUrl ?? "");
      setUserAgent(pref.userAgent ?? "");
    }

    if (selectedAccount && isElectronApp()) await setAccountWebviewVisibility(selectedAccount.id, false);
    setDrawerOpen(true);
  };

  const closeDrawer = async () => {
    setDrawerOpen(false);
    if (selectedAccount && isElectronApp()) await setAccountWebviewVisibility(selectedAccount.id, true);
  };

  const openAddWithPlatform = async (nextPlatform?: Platform) => {
    const targetPlatform = nextPlatform ?? "telegram";
    setDrawerMode("add");
    setPlatform(targetPlatform);
    setDisplayName("");
    setServiceUrl(defaultServiceUrl[targetPlatform]);
    setMuted(false);
    setProxyUrl("");
    setUserAgent("");

    if (selectedAccount && isElectronApp()) await setAccountWebviewVisibility(selectedAccount.id, false);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!selectedAccount || !isElectronApp()) return;
    void setAccountWebviewVisibility(selectedAccount.id, !settingsOpen);
  }, [settingsOpen, selectedAccount]);

  const onSubmit = () => {
    if (!displayName.trim() || !serviceUrl.trim()) {
      setStatusText(vi.app.requiredDisplayNameAndUrl);
      return;
    }

    if (drawerMode === "add") {
      createAccountMutation.mutate({ platform, displayName: displayName.trim(), serviceUrl: serviceUrl.trim() });
      return;
    }

    if (!selectedAccount) return;
    prefsRef.current = {
      ...prefsRef.current,
      [selectedAccount.id]: {
        muted,
        proxyUrl: proxyUrl.trim(),
        userAgent: userAgent.trim()
      }
    };
    localStorage.setItem("account_prefs", JSON.stringify(prefsRef.current));

    updateAccountMutation.mutate({
      accountId: selectedAccount.id,
      displayName: displayName.trim(),
      serviceUrl: serviceUrl.trim()
    });
  };

  const forceReload = async () => {
    if (!selectedAccount) return;
    if (isElectronApp()) await reloadAccountWebview(selectedAccount.id);
    else void mountInHost(selectedAccount);
    setStatusText(vi.status.reloaded(selectedAccount.displayName));
  };

  const clearSession = async () => {
    if (!selectedAccount || !isElectronApp()) return;
    await window.electronAPI?.clearAccountSession({ accountId: selectedAccount.id });
    lastMountedKeyRef.current = "";
    setStatusText(vi.status.sessionCleared);
  };

  const toggleLaunch = async (enabled: boolean) => {
    if (!isElectronApp()) return;
    const next = await window.electronAPI?.setLaunchOnStartup(enabled);
    setLaunchOnStartup(Boolean(next));
  };

  const recoverCurrent = async () => {
    if (!selectedAccount || !isElectronApp()) return;
    await window.electronAPI?.recoverAccount({ accountId: selectedAccount.id });
    setStatusText(vi.status.recoverTriggered);
  };

  const installUpdateNow = async () => {
    if (!isElectronApp() || !window.electronAPI) return;
    setInstallingUpdate(true);
    const ok = await window.electronAPI.quitAndInstallUpdate();
    if (!ok) {
      setInstallingUpdate(false);
      setStatusText(vi.settings.installFailed);
    }
  };

  const checkUpdateNow = async () => {
    if (!isElectronApp() || !window.electronAPI) return;
    setCheckingUpdate(true);
    try {
      const next = await window.electronAPI.checkForUpdates();
      if (next) setUpdateState(next);
      if (next?.downloaded) {
        setStatusText(vi.settings.updateReady);
        notifications.show({
          color: "teal",
          title: vi.toast.updateDownloadedTitle,
          message: vi.toast.updateDownloadedBody(next.version || "bản mới"),
          autoClose: 7000
        });
      } else if (next?.available) {
        setStatusText(vi.settings.updateAvailable);
        notifications.show({
          color: "blue",
          title: vi.toast.updateAvailableTitle,
          message: vi.toast.updateAvailableBody,
          autoClose: 6000
        });
      } else {
        setStatusText(vi.settings.upToDate);
        notifications.show({
          color: "green",
          title: vi.toast.updateUpToDateTitle,
          message: vi.toast.updateUpToDateBody,
          autoClose: 3500
        });
      }
    } catch {
      setStatusText(vi.settings.updateError);
      notifications.show({
        color: "red",
        title: vi.toast.updateErrorTitle,
        message: vi.settings.updateError,
        autoClose: 5000
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const reorderAccounts = (fromId: string, toId: string) => {
    const current = filteredAccounts.map((a) => a.id);
    const fromIndex = current.indexOf(fromId);
    const toIndex = current.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const remaining = (accountsQuery.data ?? []).map((a) => a.id).filter((id) => !next.includes(id));
    setAccountOrder([...next, ...remaining]);
  };

  return (
    <AppShell padding={0} className="ram-shell">
      <AppShell.Main>
        <Box className="ram-layout">
          <AccountRail
            accounts={filteredAccounts}
            selectedAccountId={selectedAccountId}
            unreadByAccount={unreadByAccount}
            totalUnread={totalUnread}
            searchValue={accountSearch}
            onSearchChange={setAccountSearch}
            onOpenSettings={() => setSettingsOpen(true)}
            onReload={() => void forceReload()}
            onRecover={() => void recoverCurrent()}
            selectedAccountName={selectedAccount?.displayName ?? vi.app.noAccountSelected}
            selectedAccountPlatform={selectedAccount?.platform ?? null}
            appVersion={appVersion}
            onSelect={setSelectedAccountId}
            onReorder={reorderAccounts}
            onAdd={() => void openAddWithPlatform()}
            onEdit={() => void openDrawer("edit")}
            canEdit={Boolean(selectedAccount)}
          />

          <section className="content-pane-dark">
            {selectedAccount ? (
              <Box className="content-body">
                {isValidHttpUrl(selectedServiceUrl) ? (
                  <Box className={`iframe-shell dark ${isElectronApp() ? "native-host" : ""}`} ref={webviewHostRef}>
                    {isElectronApp() ? null : <iframe src={selectedServiceUrl} title={selectedAccount.displayName} className="service-frame" />}
                  </Box>
                ) : (
                  <Box className="inline-hint"><Text size="sm">{vi.app.invalidServiceUrl}</Text></Box>
                )}
              </Box>
            ) : (
              <EmptyState onAddAccount={(nextPlatform) => void openAddWithPlatform(nextPlatform)} />
            )}
          </section>
        </Box>

        <AccountDrawer
          opened={drawerOpen}
          mode={drawerMode}
          platform={platform}
          displayName={displayName}
          serviceUrl={serviceUrl}
          muted={muted}
          proxyUrl={proxyUrl}
          userAgent={userAgent}
          canDelete={drawerMode === "edit" && Boolean(selectedAccount)}
          busy={createAccountMutation.isPending || updateAccountMutation.isPending}
          statusText={statusText}
          onClose={() => void closeDrawer()}
          onPlatformChange={(next) => {
            setPlatform(next);
            if (drawerMode === "add") setServiceUrl(defaultServiceUrl[next]);
          }}
          onDisplayNameChange={setDisplayName}
          onServiceUrlChange={setServiceUrl}
          onMutedChange={setMuted}
          onProxyUrlChange={setProxyUrl}
          onUserAgentChange={setUserAgent}
          onResetDefaultUrl={() => {
            if (selectedAccount) setServiceUrl(defaultServiceUrl[selectedAccount.platform]);
          }}
          onSubmit={onSubmit}
          onDelete={() => {
            if (selectedAccount) deleteAccountMutation.mutate(selectedAccount.id);
          }}
          onClearSession={() => void clearSession()}
        />

        <Modal
          opened={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          title={vi.settings.title}
          centered
          size={480}
          classNames={{
            content: "dark-modal-content",
            header: "dark-modal-header",
            title: "dark-modal-title",
            body: "dark-modal-body"
          }}
        >
          <Stack gap="xs" className="settings-stack">
            <div className="settings-row">
              <Switch
                size="md"
                label={vi.settings.launchOnStartup}
                checked={launchOnStartup}
                onChange={(event) => void toggleLaunch(event.currentTarget.checked)}
              />
            </div>
            <Text size="sm" c="#9fb0d8" className="settings-hint">{vi.settings.globalHint}</Text>
            <div className="settings-row">
              <Stack gap={8}>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => void checkUpdateNow()}
                  loading={checkingUpdate || updateState.checking}
                  disabled={!updateState.enabled}
                >
                  {checkingUpdate || updateState.checking ? vi.settings.checkingUpdate : vi.settings.checkUpdate}
                </Button>
                {!updateState.enabled ? (
                  <Text size="xs" c="#9fb0d8">{vi.settings.updateOnlyPackaged}</Text>
                ) : null}
                {updateState.downloaded ? (
                  <>
                    <Text size="sm" fw={700} c="#dce7ff">{vi.settings.updateReady}</Text>
                    <Text size="xs" c="#9fb0d8">{vi.settings.updateVersion(updateState.version || "")}</Text>
                    <Button size="xs" color="teal" onClick={() => void installUpdateNow()} loading={installingUpdate}>
                      {installingUpdate ? vi.settings.installing : vi.settings.installNow}
                    </Button>
                  </>
                ) : null}
                {updateState.error ? <Text size="xs" c="#ff9ca8">{updateState.error}</Text> : null}
              </Stack>
            </div>
          </Stack>
        </Modal>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
