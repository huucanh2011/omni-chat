import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts } from "../api";
import { isElectronApp, setAccountWebviewVisibility } from "../runtimeBridge";
import { useUiStore } from "../store";
import {
  defaultServiceUrl,
  isValidHttpUrl,
  normalizeServiceUrl,
} from "../constants";
import { useAccountMountSync } from "./useAccountMountSync";
import { useElectronBootstrap } from "./useElectronBootstrap";
import { useHealthMonitor } from "./useHealthMonitor";
import { useHotkeySwitch } from "./useHotkeySwitch";
import { useInitialAccountSelection } from "./useInitialAccountSelection";
import { useWebviewResize } from "./useWebviewResize";
import { useAppUpdate } from "./useAppUpdate";
import { useAccountForm } from "./useAccountForm";
import { useAccountListView } from "./useAccountListView";
import { useAccountMutations } from "./useAccountMutations";
import { useAccountActions } from "./useAccountActions";
import { useAccountWebviewHost } from "./useAccountWebviewHost";
import { vi } from "../i18n/vi";

export function useAppController() {
  const { selectedAccountId, setSelectedAccountId } = useUiStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statusText, setStatusText] = useState<string>(vi.app.ready);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [unreadByAccount, setUnreadByAccount] = useState<
    Record<string, number>
  >({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [appVersion, setAppVersion] = useState(
    import.meta.env.VITE_APP_VERSION ?? "dev",
  );

  const lastMountedKeyRef = useRef<string>("");

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const selectedAccount = useMemo(
    () => accountsQuery.data?.find((a) => a.id === selectedAccountId) ?? null,
    [accountsQuery.data, selectedAccountId],
  );

  const selectedServiceUrl = useMemo(() => {
    if (!selectedAccount) return "";
    const direct = selectedAccount.serviceUrl?.trim() ?? "";
    if (isValidHttpUrl(direct))
      return normalizeServiceUrl(selectedAccount.platform, direct);
    return defaultServiceUrl[selectedAccount.platform];
  }, [selectedAccount]);

  const { accountSearch, setAccountSearch, filteredAccounts, reorderAccounts } =
    useAccountListView({
      accounts: accountsQuery.data,
      selectedAccountId,
      setSelectedAccountId,
    });

  const {
    drawerOpen,
    drawerMode,
    platform,
    displayName,
    serviceUrl,
    muted,
    proxyUrl,
    userAgent,
    setPlatform,
    setDisplayName,
    setServiceUrl,
    setMuted,
    setProxyUrl,
    setUserAgent,
    openDrawer,
    openAddWithPlatform,
    closeDrawer,
    savePrefsForSelected,
  } = useAccountForm({ selectedAccount, selectedServiceUrl });

  const resolveWebviewPrefs = useCallback(
    () => ({ muted, proxyUrl, userAgent }),
    [muted, proxyUrl, userAgent],
  );

  const { webviewHostRef, mountInHost } = useAccountWebviewHost({
    resolvePrefs: resolveWebviewPrefs,
    onSwitchFailed: (account) => {
      setStatusText(vi.status.switchFailed(account.displayName));
    },
  });

  useInitialAccountSelection({
    accounts: accountsQuery.data,
    selectedAccountId,
    setSelectedAccountId,
  });

  useAccountMountSync({
    selectedAccount,
    selectedServiceUrl,
    lastMountedKeyRef,
    mountInHost,
  });

  useElectronBootstrap({
    setLaunchOnStartup,
    setUnreadByAccount,
    setTotalUnread,
  });

  useWebviewResize({
    selectedAccount,
    webviewHostRef,
  });

  useHotkeySwitch({
    accounts: accountsQuery.data,
    setSelectedAccountId,
  });

  useHealthMonitor({
    selectedAccount,
    setStatusText,
  });

  const {
    updateState,
    checkingUpdate,
    installingUpdate,
    checkUpdateNow,
    installUpdateNow,
  } = useAppUpdate({
    setStatusText,
  });

  useEffect(() => {
    if (!isElectronApp()) return;
    void window.electronAPI?.getVersion().then((v) => {
      if (v) setAppVersion(v);
    });
  }, []);

  useEffect(() => {
    if (!selectedAccount || !isElectronApp()) return;
    void setAccountWebviewVisibility(selectedAccount.id, !settingsOpen);
  }, [settingsOpen, selectedAccount]);

  const { deleteAccountMutation, isSavingAccount, submitAccount } =
    useAccountMutations({
      selectedAccountId,
      selectedAccount,
      setSelectedAccountId,
      setStatusText,
      closeDrawer,
      resetMountedKey: () => {
        lastMountedKeyRef.current = "";
      },
    });

  const onSubmit = () => {
    submitAccount({
      drawerMode,
      platform,
      displayName,
      serviceUrl,
      beforeUpdate: savePrefsForSelected,
    });
  };

  const { forceReload, clearSession, recoverCurrent } = useAccountActions({
    selectedAccount,
    mountInHost,
    setStatusText,
    resetMountedKey: () => {
      lastMountedKeyRef.current = "";
    },
  });

  const toggleLaunch = async (enabled: boolean) => {
    if (!isElectronApp()) return;
    const next = await window.electronAPI?.setLaunchOnStartup(enabled);
    setLaunchOnStartup(Boolean(next));
  };

  return {
    settingsOpen,
    setSettingsOpen,
    statusText,
    launchOnStartup,
    unreadByAccount,
    totalUnread,
    appVersion,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    selectedServiceUrl,
    accountSearch,
    setAccountSearch,
    filteredAccounts,
    reorderAccounts,
    drawerOpen,
    drawerMode,
    platform,
    displayName,
    serviceUrl,
    muted,
    proxyUrl,
    userAgent,
    setPlatform,
    setDisplayName,
    setServiceUrl,
    setMuted,
    setProxyUrl,
    setUserAgent,
    openDrawer,
    openAddWithPlatform,
    closeDrawer,
    webviewHostRef,
    updateState,
    checkingUpdate,
    installingUpdate,
    checkUpdateNow,
    installUpdateNow,
    deleteAccountMutation,
    isSavingAccount,
    onSubmit,
    forceReload,
    clearSession,
    recoverCurrent,
    toggleLaunch,
  };
}
