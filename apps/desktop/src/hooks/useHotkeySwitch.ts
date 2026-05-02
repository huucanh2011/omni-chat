import { useEffect } from "react";
import type { Account } from "../types";

type Args = {
  accounts: Account[] | undefined;
  setSelectedAccountId: (id: string | null) => void;
};

export function useHotkeySwitch({ accounts, setSelectedAccountId }: Args) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const acc = (accounts ?? [])[n - 1];
      if (acc) setSelectedAccountId(acc.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [accounts, setSelectedAccountId]);
}
