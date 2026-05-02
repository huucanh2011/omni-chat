import { Button, Modal, Stack, Switch, Text } from "@mantine/core";
import type { UpdateState } from "../hooks/useAppUpdate";
import { vi } from "../i18n/vi";
import { isMacPlatform } from "../constants";

type SettingsModalProps = {
  opened: boolean;
  launchOnStartup: boolean;
  checkingUpdate: boolean;
  installingUpdate: boolean;
  updateState: UpdateState;
  onClose: () => void;
  onToggleLaunch: (enabled: boolean) => void;
  onCheckUpdate: () => void;
  onInstallUpdate: () => void;
  onOpenReleases: () => void;
};

export function SettingsModal(props: SettingsModalProps) {
  const isMac = isMacPlatform();

  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title={vi.settings.title}
      centered
      size={480}
      classNames={{
        content: "chat-modal-content",
        header: "chat-modal-header",
        title: "chat-modal-title",
        body: "chat-modal-body"
      }}
    >
      <Stack gap="xs" className="settings-stack">
        <div className="settings-row">
          <Switch
            size="md"
            label={vi.settings.launchOnStartup}
            checked={props.launchOnStartup}
            onChange={(event) => props.onToggleLaunch(event.currentTarget.checked)}
          />
        </div>

        <Text size="sm" c="#9fb0d8" className="settings-hint">
          {vi.settings.globalHint}
        </Text>

        <div className="settings-row">
          <Stack gap={8}>
            <Button
              size="xs"
              variant="light"
              onClick={props.onCheckUpdate}
              loading={props.checkingUpdate || props.updateState.checking}
              disabled={!props.updateState.enabled}
            >
              {props.checkingUpdate || props.updateState.checking ? vi.settings.checkingUpdate : vi.settings.checkUpdate}
            </Button>
            <Button size="xs" variant="subtle" onClick={props.onOpenReleases}>
              {vi.settings.openReleases}
            </Button>

            {!props.updateState.enabled ? (
              <Text size="xs" c="#9fb0d8">
                {vi.settings.updateOnlyPackaged}
              </Text>
            ) : null}

            {props.updateState.downloaded ? (
              <>
                <Text size="sm" fw={700} c="#dce7ff">
                  {vi.settings.updateReady}
                </Text>
                <Text size="xs" c="#9fb0d8">
                  {vi.settings.updateVersion(props.updateState.version || "")}
                </Text>
                {!isMac ? (
                  <Button size="xs" color="teal" onClick={props.onInstallUpdate} loading={props.installingUpdate}>
                    {props.installingUpdate ? vi.settings.installing : vi.settings.installNow}
                  </Button>
                ) : (
                  <Text size="xs" c="#f6d48a">
                    {vi.settings.macManualUpdateHint}
                  </Text>
                )}
              </>
            ) : null}

            {isMac && props.updateState.available && !props.updateState.downloaded ? (
              <Text size="xs" c="#f6d48a">
                {vi.settings.macManualUpdateHint}
              </Text>
            ) : null}

            {props.updateState.error ? (
              <Text size="xs" c="#ff9ca8">
                {props.updateState.error}
              </Text>
            ) : null}
          </Stack>
        </div>
      </Stack>
    </Modal>
  );
}
