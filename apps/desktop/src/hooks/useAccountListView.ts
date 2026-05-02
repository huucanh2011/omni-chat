import { useEffect, useMemo, useState } from "react";
import type { Account } from "../types";
import { vi } from "../i18n/vi";

function loadAccountOrder(): string[] {
  try {
    return JSON.parse(
      localStorage.getItem("account_order") ?? "[]",
    ) as string[];
  } catch {
    return [];
  }
}

type Args = {
  accounts: Account[] | undefined;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
};

export function useAccountListView({
  accounts,
  selectedAccountId,
  setSelectedAccountId,
}: Args) {
  const [accountSearch, setAccountSearch] = useState("");
  const [accountOrder, setAccountOrder] = useState<string[]>(loadAccountOrder);

  const sortedAccounts = useMemo(() => {
    const items = accounts ?? [];
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
  }, [accounts, accountOrder]);

  const filteredAccounts = useMemo(() => {
    const keyword = accountSearch.trim().toLowerCase();
    if (!keyword) return sortedAccounts;

    return sortedAccounts.filter((account) => {
      const platformLabel =
        account.platform === "telegram"
          ? vi.platform.telegram
          : account.platform === "zalo"
            ? vi.platform.zalo
            : vi.platform.teams;
      const haystack =
        `${account.displayName} ${account.platform} ${platformLabel}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [sortedAccounts, accountSearch]);

  useEffect(() => {
    localStorage.setItem("account_order", JSON.stringify(accountOrder));
  }, [accountOrder]);

  useEffect(() => {
    if (!filteredAccounts.length) return;
    if (!selectedAccountId) return;
    if (filteredAccounts.some((a) => a.id === selectedAccountId)) return;
    setSelectedAccountId(filteredAccounts[0].id);
  }, [filteredAccounts, selectedAccountId, setSelectedAccountId]);

  const reorderAccounts = (fromId: string, toId: string) => {
    const current = filteredAccounts.map((a) => a.id);
    const fromIndex = current.indexOf(fromId);
    const toIndex = current.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    const remaining = (accounts ?? [])
      .map((a) => a.id)
      .filter((id) => !next.includes(id));
    setAccountOrder([...next, ...remaining]);
  };

  return {
    accountSearch,
    setAccountSearch,
    filteredAccounts,
    reorderAccounts,
  };
}
