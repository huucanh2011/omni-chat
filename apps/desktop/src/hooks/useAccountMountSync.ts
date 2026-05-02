import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Account } from "../types";

type Args = {
  selectedAccount: Account | null;
  selectedServiceUrl: string;
  lastMountedKeyRef: MutableRefObject<string>;
  mountInHost: (account: Account) => Promise<void>;
};

export function useAccountMountSync({ selectedAccount, selectedServiceUrl, lastMountedKeyRef, mountInHost }: Args) {
  useEffect(() => {
    if (!selectedAccount) return;
    const key = `${selectedAccount.id}|${selectedServiceUrl}`;
    if (lastMountedKeyRef.current === key) return;
    lastMountedKeyRef.current = key;
    void mountInHost(selectedAccount);
  }, [selectedAccount, selectedServiceUrl, lastMountedKeyRef, mountInHost]);
}
