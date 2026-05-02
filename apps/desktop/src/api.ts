import type { Account, Platform } from "./types";

let cachedApiBase: string | null = null;

async function getApiBase(): Promise<string> {
  if (cachedApiBase) return cachedApiBase;
  const base =
    (typeof window !== "undefined" && window.electronAPI
      ? await window.electronAPI.getGatewayBaseUrl().catch(() => "http://127.0.0.1:8787")
      : "http://127.0.0.1:8787") + "/api";
  cachedApiBase = base;
  return base;
}

export async function fetchAccounts(): Promise<Account[]> {
  const API_BASE = await getApiBase();
  const res = await fetch(`${API_BASE}/accounts`);
  if (!res.ok) throw new Error("Failed to load accounts");
  return (await res.json()) as Account[];
}

export async function createAccount(payload: {
  platform: Platform;
  displayName: string;
  serviceUrl?: string;
}): Promise<Account> {
  const API_BASE = await getApiBase();
  const res = await fetch(`${API_BASE}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error("Failed to create account");
  return (await res.json()) as Account;
}

export async function deleteAccount(accountId: string): Promise<void> {
  const API_BASE = await getApiBase();
  const res = await fetch(`${API_BASE}/accounts/${accountId}`, {
    method: "DELETE"
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete account");
}

export async function updateAccount(
  accountId: string,
  payload: { displayName?: string; serviceUrl?: string }
): Promise<Account> {
  const API_BASE = await getApiBase();
  const res = await fetch(`${API_BASE}/accounts/${accountId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to update account");
  return (await res.json()) as Account;
}
