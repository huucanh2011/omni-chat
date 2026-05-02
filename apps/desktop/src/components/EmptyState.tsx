import { Button, Group, Stack, Text, Title } from "@mantine/core";
import type { Platform } from "../types";
import { vi } from "../i18n/vi";

type EmptyStateProps = {
  onAddAccount: (platform?: Platform) => void;
};

const platformIconSrc = (platform: Platform): string => `/platforms/${platform}.png`;

function PlatformIcon({ platform, alt }: { platform: Platform; alt: string }) {
  return (
    <span className="empty-state-platform-icon-wrap">
      <img src={platformIconSrc(platform)} alt={alt} className="empty-state-platform-icon" loading="lazy" />
    </span>
  );
}

export function EmptyState({ onAddAccount }: EmptyStateProps) {
  return (
    <div className="empty-state-wrap">
      <Stack gap={14} align="center" className="empty-state-card">
        <Title order={2} c="#dce8ff" className="empty-state-title">
          {vi.emptyState.title}
        </Title>

        <Text size="sm" c="#96a8d6" ta="center" className="empty-state-desc">
          {vi.emptyState.description}
        </Text>

        <Group gap={8} justify="center" className="empty-state-actions">
          <Button
            size="xs"
            radius="xl"
            variant="light"
            leftSection={<PlatformIcon platform="telegram" alt={vi.emptyState.addTelegram} />}
            onClick={() => onAddAccount("telegram")}
          >
            {vi.emptyState.addTelegram}
          </Button>
          <Button
            size="xs"
            radius="xl"
            variant="light"
            leftSection={<PlatformIcon platform="zalo" alt={vi.emptyState.addZalo} />}
            onClick={() => onAddAccount("zalo")}
          >
            {vi.emptyState.addZalo}
          </Button>
          <Button
            size="xs"
            radius="xl"
            variant="light"
            leftSection={<PlatformIcon platform="teams" alt={vi.emptyState.addTeams} />}
            onClick={() => onAddAccount("teams")}
          >
            {vi.emptyState.addTeams}
          </Button>
        </Group>
      </Stack>
    </div>
  );
}
