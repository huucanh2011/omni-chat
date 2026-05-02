import { useCallback, useRef } from "react";
import {
  defaultServiceUrl,
  isValidHttpUrl,
  normalizeServiceUrl,
} from "../constants";
import {
  isElectronApp,
  resizeAccountWebview,
  switchAccountWebview,
} from "../runtimeBridge";
import type { Account } from "../types";

type PrefResolver = (accountId: string) => {
  muted?: boolean;
  proxyUrl?: string;
  userAgent?: string;
};

type Args = {
  onSwitchFailed: (account: Account) => void;
  resolvePrefs: PrefResolver;
};

export function useAccountWebviewHost({ onSwitchFailed, resolvePrefs }: Args) {
  const webviewHostRef = useRef<HTMLDivElement | null>(null);
  const syncTokenRef = useRef(0);

  const mountInHost = useCallback(
    async (account: Account) => {
      const resolvedUrl = isValidHttpUrl(account.serviceUrl)
        ? normalizeServiceUrl(account.platform, account.serviceUrl)
        : defaultServiceUrl[account.platform];
      if (!isValidHttpUrl(resolvedUrl)) return;

      const host = webviewHostRef.current;
      if (!host) return;

      const token = ++syncTokenRef.current;
      const rect = host.getBoundingClientRect();
      const inset = isElectronApp() ? 4 : 2;

      const bounds = {
        x: rect.left + inset,
        y: rect.top + inset,
        width: Math.max(0, rect.width - inset * 2),
        height: Math.max(0, rect.height - inset * 2),
      };

      try {
        const pref = resolvePrefs(account.id);
        await switchAccountWebview(
          { ...account, serviceUrl: resolvedUrl },
          bounds,
          pref,
        );
        if (token !== syncTokenRef.current) return;
        await resizeAccountWebview(account.id, bounds);
      } catch {
        onSwitchFailed(account);
      }
    },
    [onSwitchFailed, resolvePrefs],
  );

  return {
    webviewHostRef,
    mountInHost,
  };
}
