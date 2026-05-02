import { useEffect, useRef, useState } from "react";
import type { Account, Platform } from "../types";
import { defaultServiceUrl } from "../constants";
import { isElectronApp, setAccountWebviewVisibility } from "../runtimeBridge";

export type DrawerMode = "add" | "edit";
export type AccountPrefs = Record<
  string,
  { muted?: boolean; proxyUrl?: string; userAgent?: string }
>;

function loadPrefs(): AccountPrefs {
  try {
    return JSON.parse(
      localStorage.getItem("account_prefs") ?? "{}",
    ) as AccountPrefs;
  } catch {
    return {};
  }
}

type Args = {
  selectedAccount: Account | null;
  selectedServiceUrl: string;
};

export function useAccountForm({ selectedAccount, selectedServiceUrl }: Args) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("add");

  const [platform, setPlatform] = useState<Platform>("telegram");
  const [displayName, setDisplayName] = useState("");
  const [serviceUrl, setServiceUrl] = useState(defaultServiceUrl.telegram);
  const [muted, setMuted] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [userAgent, setUserAgent] = useState("");

  const prefsRef = useRef<AccountPrefs>(loadPrefs());

  useEffect(() => {
    if (!selectedAccount) return;
    const pref = prefsRef.current[selectedAccount.id] ?? {};
    setMuted(Boolean(pref.muted));
    setProxyUrl(pref.proxyUrl ?? "");
    setUserAgent(pref.userAgent ?? "");
  }, [selectedAccount]);

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

    if (selectedAccount && isElectronApp())
      await setAccountWebviewVisibility(selectedAccount.id, false);
    setDrawerOpen(true);
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

    if (selectedAccount && isElectronApp())
      await setAccountWebviewVisibility(selectedAccount.id, false);
    setDrawerOpen(true);
  };

  const closeDrawer = async () => {
    setDrawerOpen(false);
    if (selectedAccount && isElectronApp())
      await setAccountWebviewVisibility(selectedAccount.id, true);
  };

  const savePrefsForSelected = () => {
    if (!selectedAccount) return;
    prefsRef.current = {
      ...prefsRef.current,
      [selectedAccount.id]: {
        muted,
        proxyUrl: proxyUrl.trim(),
        userAgent: userAgent.trim(),
      },
    };
    localStorage.setItem("account_prefs", JSON.stringify(prefsRef.current));
  };

  return {
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
  };
}
