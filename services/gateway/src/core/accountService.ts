import { nanoid } from "nanoid";
import { db } from "../db/client.js";
import type { Account, Platform } from "../types.js";

const defaultServiceUrl: Record<Platform, string> = {
  telegram: "https://web.telegram.org/",
  zalo: "https://chat.zalo.me/",
  teams: "https://teams.microsoft.com/v2/"
};

function normalizeServiceUrl(platform: Platform, serviceUrl: string | undefined): string {
  const raw = serviceUrl?.trim() ?? "";
  if (!raw) return defaultServiceUrl[platform];
  if (platform !== "teams") return raw;
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes("teams.microsoft.com")) return raw;
    if (parsed.pathname.startsWith("/v2")) return parsed.toString();
    return defaultServiceUrl.teams;
  } catch {
    return defaultServiceUrl.teams;
  }
}

function mapAccountRow(row: Record<string, string>): Account {
  return {
    id: row.id,
    platform: row.platform as Platform,
    displayName: row.display_name,
    serviceUrl: row.service_url,
    status: row.status as Account["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class AccountService {
  listAccounts(): Account[] {
    const rows = db.prepare("SELECT * FROM accounts ORDER BY updated_at DESC").all() as Record<string, string>[];
    return rows.map(mapAccountRow);
  }

  getAccount(accountId: string): Account | null {
    const row = db.prepare("SELECT * FROM accounts WHERE id = ?").get(accountId) as Record<string, string> | undefined;
    return row ? mapAccountRow(row) : null;
  }

  addAccount(platform: Platform, displayName: string, serviceUrl?: string): Account {
    const now = new Date().toISOString();
    const account: Account = {
      id: nanoid(),
      platform,
      displayName: displayName.trim(),
      serviceUrl: normalizeServiceUrl(platform, serviceUrl),
      status: "connected",
      createdAt: now,
      updatedAt: now
    };

    db.prepare(
      `INSERT INTO accounts (id, platform, display_name, service_url, status, created_at, updated_at)
       VALUES (@id, @platform, @displayName, @serviceUrl, @status, @createdAt, @updatedAt)`
    ).run(account);

    return account;
  }

  updateAccount(
    accountId: string,
    input: Partial<Pick<Account, "displayName" | "serviceUrl" | "status">>
  ): Account | null {
    const current = this.getAccount(accountId);
    if (!current) return null;

    const updated: Account = {
      ...current,
      displayName: input.displayName?.trim() || current.displayName,
      serviceUrl: normalizeServiceUrl(current.platform, input.serviceUrl ?? current.serviceUrl),
      status: input.status || current.status,
      updatedAt: new Date().toISOString()
    };

    db.prepare(
      `UPDATE accounts
       SET display_name = @displayName,
           service_url = @serviceUrl,
           status = @status,
           updated_at = @updatedAt
       WHERE id = @id`
    ).run(updated);

    return updated;
  }

  removeAccount(accountId: string): boolean {
    return db.prepare("DELETE FROM accounts WHERE id = ?").run(accountId).changes > 0;
  }
}
