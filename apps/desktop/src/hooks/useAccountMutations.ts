import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAccount, deleteAccount, updateAccount } from "../api";
import { closeAccountWebview, isElectronApp } from "../runtimeBridge";
import type { Account, Platform } from "../types";
import { vi } from "../i18n/vi";

type Args = {
  selectedAccountId: string | null;
  selectedAccount: Account | null;
  setSelectedAccountId: (id: string | null) => void;
  setStatusText: (text: string) => void;
  closeDrawer: () => Promise<void> | void;
  resetMountedKey: () => void;
};

export function useAccountMutations({
  selectedAccountId,
  selectedAccount,
  setSelectedAccountId,
  setStatusText,
  closeDrawer,
  resetMountedKey,
}: Args) {
  const queryClient = useQueryClient();

  const createAccountMutation = useMutation({
    mutationFn: (payload: {
      platform: Platform;
      displayName: string;
      serviceUrl: string;
    }) => createAccount(payload),
    onSuccess: async (account) => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedAccountId(account.id);
      setStatusText(vi.status.accountAdded(account.displayName));
      await closeDrawer();
    },
    onError: () => setStatusText(vi.status.createFailed),
  });

  const updateAccountMutation = useMutation({
    mutationFn: (payload: {
      accountId: string;
      displayName: string;
      serviceUrl: string;
    }) =>
      updateAccount(payload.accountId, {
        displayName: payload.displayName,
        serviceUrl: payload.serviceUrl,
      }),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedAccountId(updated.id);
      resetMountedKey();
      setStatusText(vi.status.accountUpdated(updated.displayName));
      await closeDrawer();
    },
    onError: () => setStatusText(vi.status.updateFailed),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      const currentId = selectedAccountId;
      if (currentId && isElectronApp()) await closeAccountWebview(currentId);

      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      const latest =
        (queryClient.getQueryData(["accounts"]) as Account[] | undefined) ?? [];
      const next = latest.find((a) => a.id !== currentId) ?? null;
      setSelectedAccountId(next?.id ?? null);
      setStatusText(vi.status.accountDeleted);
      await closeDrawer();
    },
    onError: () => setStatusText(vi.status.deleteFailed),
  });

  const submitAccount = (payload: {
    drawerMode: "add" | "edit";
    platform: Platform;
    displayName: string;
    serviceUrl: string;
    beforeUpdate: () => void;
  }) => {
    if (!payload.displayName.trim() || !payload.serviceUrl.trim()) {
      setStatusText(vi.app.requiredDisplayNameAndUrl);
      return;
    }

    if (payload.drawerMode === "add") {
      createAccountMutation.mutate({
        platform: payload.platform,
        displayName: payload.displayName.trim(),
        serviceUrl: payload.serviceUrl.trim(),
      });
      return;
    }

    if (!selectedAccount) return;
    payload.beforeUpdate();

    updateAccountMutation.mutate({
      accountId: selectedAccount.id,
      displayName: payload.displayName.trim(),
      serviceUrl: payload.serviceUrl.trim(),
    });
  };

  const isSavingAccount =
    createAccountMutation.isPending || updateAccountMutation.isPending;

  return {
    deleteAccountMutation,
    isSavingAccount,
    submitAccount,
  };
}
