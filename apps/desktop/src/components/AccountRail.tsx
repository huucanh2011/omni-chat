import {
  ActionIcon,
  Divider,
  Input,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  IconEdit,
  IconMessage2,
  IconPlus,
  IconRefresh,
  IconRotateClockwise2,
  IconSettings,
} from "@tabler/icons-react";
import type { Account } from "../types";
import { platformChip, shortName } from "../constants";
import { vi } from "../i18n/vi";

type Props = {
  accounts: Account[];
  selectedAccountId: string | null;
  unreadByAccount: Record<string, number>;
  totalUnread: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onOpenSettings: () => void;
  onReload: () => void;
  onRecover: () => void;
  selectedAccountName: string;
  selectedAccountPlatform: Account["platform"] | null;
  appVersion: string;
  onSelect: (accountId: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onAdd: () => void;
  onEdit: () => void;
  canEdit: boolean;
};

export function AccountRail({
  accounts,
  selectedAccountId,
  unreadByAccount,
  totalUnread,
  searchValue,
  onSearchChange,
  onOpenSettings,
  onReload,
  onRecover,
  selectedAccountName,
  selectedAccountPlatform,
  appVersion,
  onSelect,
  onReorder,
  onAdd,
  onEdit,
  canEdit,
}: Props) {
  const platformLabel = (platform: Account["platform"]): string => {
    if (platform === "telegram") return vi.platform.telegram;
    if (platform === "zalo") return vi.platform.zalo;
    return vi.platform.teams;
  };

  return (
    <aside className="accounts-rail">
      <Stack justify="space-between" h="100%">
        <Stack gap={8} align="center">
          <div
            className="brand-wrap"
            title={
              totalUnread > 0
                ? "Có tin nhắn chưa đọc"
                : "Không có tin nhắn chưa đọc"
            }
          >
            <ThemeIcon
              size={40}
              radius="md"
              color="indigo"
              variant="filled"
              className="brand-icon"
            >
              <IconMessage2 size={22} />
            </ThemeIcon>
            {totalUnread > 0 ? <i className="brand-unread-dot" /> : null}
          </div>
          <Divider w="70%" color="rgba(255,255,255,0.12)" />
          <Input
            size="xs"
            value={searchValue}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            placeholder="Tìm..."
            className="rail-search-inline"
          />
          <Stack gap={8} align="center">
            {accounts.map((account) => (
              <UnstyledButton
                key={account.id}
                className={`rail-account rail-${account.platform} ${selectedAccountId === account.id ? "active" : ""}`}
                onClick={() => onSelect(account.id)}
                title={vi.rail.accountTitle(
                  account.displayName,
                  platformLabel(account.platform),
                )}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/account-id", account.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromId = e.dataTransfer.getData("text/account-id");
                  if (!fromId || fromId === account.id) return;
                  onReorder(fromId, account.id);
                }}
              >
                <span>
                  {shortName(account.displayName) ||
                    account.platform.slice(0, 1).toUpperCase()}
                </span>
                <small className="rail-platform-chip">
                  {platformChip(account.platform)}
                </small>
                {unreadByAccount[account.id] ? (
                  <i className="acc-unread-dot" />
                ) : null}
              </UnstyledButton>
            ))}
          </Stack>
          <ActionIcon
            size={30}
            radius="md"
            variant="subtle"
            color="gray"
            className="rail-add"
            onClick={onAdd}
            title={vi.rail.addAccount}
          >
            <IconPlus size={18} />
          </ActionIcon>
          <ActionIcon
            size={30}
            radius="md"
            variant="subtle"
            color="gray"
            className="rail-add"
            onClick={onEdit}
            disabled={!canEdit}
            title={vi.rail.editAccount}
          >
            <IconEdit size={17} />
          </ActionIcon>
        </Stack>
        <Stack gap={8} align="center">
          <Divider w="70%" color="rgba(255,255,255,0.10)" />
          <ActionIcon
            size={28}
            radius="md"
            variant="subtle"
            color="teal"
            className="rail-add"
            onClick={onReload}
            title={vi.header.reloadTitle}
          >
            <IconRefresh size={15} />
          </ActionIcon>
          <ActionIcon
            size={28}
            radius="md"
            variant="subtle"
            color="yellow"
            className="rail-add"
            onClick={onRecover}
            title={vi.header.recoverTitle}
          >
            <IconRotateClockwise2 size={15} />
          </ActionIcon>
          <ActionIcon
            size={28}
            radius="md"
            variant="subtle"
            color="gray"
            className="rail-add"
            onClick={onOpenSettings}
            title={vi.settings.title}
          >
            <IconSettings size={15} />
          </ActionIcon>
          <Text
            className={`rail-active-label ${selectedAccountPlatform ? `rail-active-${selectedAccountPlatform}` : ""}`}
            size="10px"
            ta="center"
            mt={-2}
            lineClamp={1}
            title={selectedAccountName}
          >
            {`${shortName(selectedAccountName) || "?"} · ${selectedAccountPlatform ? platformChip(selectedAccountPlatform) : "--"}`}
          </Text>
          <Text className="rail-version" size="9px" ta="center" title={`Version ${appVersion}`}>
            {`v${appVersion}`}
          </Text>
        </Stack>
      </Stack>
    </aside>
  );
}
