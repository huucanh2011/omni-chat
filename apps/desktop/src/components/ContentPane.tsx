import { Box, Text } from "@mantine/core";
import { isValidHttpUrl } from "../constants";
import { isElectronApp } from "../runtimeBridge";
import { EmptyState } from "./EmptyState";
import { vi } from "../i18n/vi";
import type { Account } from "../types";

type MinimalAccount = {
  id: string;
  displayName: string;
  platform: Account["platform"];
};

type ContentPaneProps = {
  selectedAccount: MinimalAccount | null;
  selectedServiceUrl: string;
  webviewHostRef: React.RefObject<HTMLDivElement | null>;
  onAddAccount: (platform?: Account["platform"]) => void;
};

export function ContentPane({
  selectedAccount,
  selectedServiceUrl,
  webviewHostRef,
  onAddAccount,
}: ContentPaneProps) {
  return (
    <section className="content-pane-chat">
      {selectedAccount ? (
        <Box className="content-body">
          {isValidHttpUrl(selectedServiceUrl) ? (
            <Box
              className={`iframe-shell dark ${isElectronApp() ? "native-host" : ""}`}
              ref={webviewHostRef}
            >
              {isElectronApp() ? null : (
                <iframe
                  src={selectedServiceUrl}
                  title={selectedAccount.displayName}
                  className="service-frame"
                />
              )}
            </Box>
          ) : (
            <Box className="inline-hint">
              <Text size="sm">{vi.app.invalidServiceUrl}</Text>
            </Box>
          )}
        </Box>
      ) : (
        <EmptyState
          onAddAccount={(nextPlatform) => onAddAccount(nextPlatform)}
        />
      )}
    </section>
  );
}
