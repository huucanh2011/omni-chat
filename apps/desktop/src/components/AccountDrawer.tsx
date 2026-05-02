import { Box, Button, Drawer, NativeSelect, Stack, Switch, Text, TextInput } from "@mantine/core";
import { IconBrowser, IconRefresh, IconTrash } from "@tabler/icons-react";
import type { Platform } from "../types";
import { vi } from "../i18n/vi";

type DrawerMode = "add" | "edit";

type Props = {
  opened: boolean;
  mode: DrawerMode;
  platform: Platform;
  displayName: string;
  serviceUrl: string;
  muted: boolean;
  proxyUrl: string;
  userAgent: string;
  canDelete: boolean;
  busy: boolean;
  statusText: string;
  onClose: () => void;
  onPlatformChange: (v: Platform) => void;
  onDisplayNameChange: (v: string) => void;
  onServiceUrlChange: (v: string) => void;
  onMutedChange: (v: boolean) => void;
  onProxyUrlChange: (v: string) => void;
  onUserAgentChange: (v: string) => void;
  onResetDefaultUrl: () => void;
  onSubmit: () => void;
  onDelete: () => void;
  onClearSession: () => void;
};

const platformOptions = [
  { value: "telegram", label: vi.platform.telegram },
  { value: "zalo", label: vi.platform.zalo },
  { value: "teams", label: vi.platform.teams }
];

export function AccountDrawer(props: Props) {
  return (
    <Drawer
      opened={props.opened}
      onClose={props.onClose}
      position="left"
      size={360}
      title={props.mode === "add" ? vi.drawer.addAccountTitle : vi.drawer.editAccountTitle}
      classNames={{ content: "dark-modal-content", header: "dark-modal-header", title: "dark-modal-title", body: "dark-modal-body" }}
    >
      <Stack gap="sm">
        <NativeSelect
          label={vi.drawer.platform}
          value={props.platform}
          onChange={(e) => props.onPlatformChange(e.currentTarget.value as Platform)}
          data={platformOptions}
          disabled={props.mode === "edit"}
        />
        <TextInput label={vi.drawer.displayName} value={props.displayName} onChange={(e) => props.onDisplayNameChange(e.currentTarget.value)} />
        <TextInput label={vi.drawer.serviceUrl} leftSection={<IconBrowser size={14} />} value={props.serviceUrl} onChange={(e) => props.onServiceUrlChange(e.currentTarget.value)} />
        <Switch label={vi.drawer.muteNotificationsPerAccount} checked={props.muted} onChange={(e) => props.onMutedChange(e.currentTarget.checked)} />
        <TextInput label={vi.drawer.userAgentOptional} value={props.userAgent} onChange={(e) => props.onUserAgentChange(e.currentTarget.value)} />
        <TextInput label={vi.drawer.proxyUrlOptional} value={props.proxyUrl} onChange={(e) => props.onProxyUrlChange(e.currentTarget.value)} />

        {props.mode === "edit" && (
          <Button variant="light" leftSection={<IconRefresh size={14} />} onClick={props.onResetDefaultUrl}>
            {vi.drawer.resetDefaultUrl}
          </Button>
        )}

        <Button onClick={props.onSubmit} loading={props.busy}>{props.mode === "add" ? vi.drawer.addAccount : vi.drawer.saveChanges}</Button>

        {props.canDelete && (
          <Button variant="light" color="red" leftSection={<IconTrash size={14} />} onClick={props.onDelete}>
            {vi.drawer.deleteAccount}
          </Button>
        )}

        {props.canDelete && (
          <Button variant="light" color="orange" onClick={props.onClearSession}>
            {vi.drawer.clearAccountSession}
          </Button>
        )}

        <Box className="status-box">
          <Text size="xs" c="#9eb0d9">{vi.drawer.status}</Text>
          <Text size="sm" c="#dfe7ff">{props.statusText}</Text>
        </Box>
      </Stack>
    </Drawer>
  );
}
