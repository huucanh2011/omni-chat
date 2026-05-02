import { useEffect } from "react";
import type { Account } from "../types";

type Args = {
  accounts: Account[] | undefined;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
};

export function useInitialAccountSelection({ accounts, selectedAccountId, setSelectedAccountId }: Args) {
  useEffect(() => {
    if (!selectedAccountId && accounts?.length) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId, setSelectedAccountId]);
}
