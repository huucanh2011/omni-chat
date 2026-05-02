import { useEffect, useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import { isElectronApp } from "../runtimeBridge";
import { vi } from "../i18n/vi";
import { isMacPlatform } from "../constants";

export type UpdateState = {
  enabled: boolean;
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  version: string;
  error: string;
};

const EMPTY_UPDATE_STATE: UpdateState = {
  enabled: false,
  checking: false,
  available: false,
  downloaded: false,
  version: "",
  error: "",
};

type UseAppUpdateArgs = {
  setStatusText: (text: string) => void;
};

export function useAppUpdate({ setStatusText }: UseAppUpdateArgs) {
  const isMac = isMacPlatform();
  const [updateState, setUpdateState] =
    useState<UpdateState>(EMPTY_UPDATE_STATE);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const lastDownloadedVersionRef = useRef("");

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
      autoClose: 7000,
    });
  }, [updateState.downloaded, updateState.version]);

  const installUpdateNow = async () => {
    if (!isElectronApp() || !window.electronAPI) return;
    if (isMac) {
      setStatusText(vi.settings.macManualUpdateHint);
      notifications.show({
        color: "yellow",
        title: vi.toast.updateManualTitle,
        message: vi.toast.updateManualBody,
        autoClose: 6000,
      });
      return;
    }
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
          autoClose: 7000,
        });
      } else if (next?.available) {
        setStatusText(isMac ? vi.settings.macManualUpdateHint : vi.settings.updateAvailable);
        notifications.show({
          color: isMac ? "yellow" : "blue",
          title: isMac ? vi.toast.updateManualTitle : vi.toast.updateAvailableTitle,
          message: isMac ? vi.toast.updateManualBody : vi.toast.updateAvailableBody,
          autoClose: 6000,
        });
      } else {
        setStatusText(vi.settings.upToDate);
        notifications.show({
          color: "green",
          title: vi.toast.updateUpToDateTitle,
          message: vi.toast.updateUpToDateBody,
          autoClose: 3500,
        });
      }
    } catch {
      setStatusText(vi.settings.updateError);
      notifications.show({
        color: "red",
        title: vi.toast.updateErrorTitle,
        message: vi.settings.updateError,
        autoClose: 5000,
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  return {
    updateState,
    checkingUpdate,
    installingUpdate,
    checkUpdateNow,
    installUpdateNow,
  };
}
