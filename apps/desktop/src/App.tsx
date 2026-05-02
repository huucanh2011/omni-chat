import { AppShell, Box } from "@mantine/core";
import { defaultServiceUrl } from "./constants";
import { AccountRail } from "./components/AccountRail";
import { AccountDrawer } from "./components/AccountDrawer";
import { SettingsModal } from "./components/SettingsModal";
import { ContentPane } from "./components/ContentPane";
import { useAppController } from "./hooks/useAppController";
import { vi } from "./i18n/vi";

function App() {
  const {
    settingsOpen,
    setSettingsOpen,
    statusText,
    launchOnStartup,
    unreadByAccount,
    totalUnread,
    appVersion,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    selectedServiceUrl,
    accountSearch,
    setAccountSearch,
    filteredAccounts,
    reorderAccounts,
    drawerOpen,
    drawerMode,
    platform,
    displayName,
    serviceUrl,
    muted,
    proxyUrl,
    userAgent,
    setPlatform,
    setDisplayName,
    setServiceUrl,
    setMuted,
    setProxyUrl,
    setUserAgent,
    openDrawer,
    openAddWithPlatform,
    closeDrawer,
    webviewHostRef,
    updateState,
    checkingUpdate,
    installingUpdate,
    checkUpdateNow,
    installUpdateNow,
    deleteAccountMutation,
    isSavingAccount,
    onSubmit,
    forceReload,
    clearSession,
    recoverCurrent,
    toggleLaunch,
  } = useAppController();

  return (
    <AppShell padding={0} className="ram-shell">
      <AppShell.Main>
        <Box className="ram-layout">
          <AccountRail
            accounts={filteredAccounts}
            selectedAccountId={selectedAccountId}
            unreadByAccount={unreadByAccount}
            totalUnread={totalUnread}
            searchValue={accountSearch}
            onSearchChange={setAccountSearch}
            onOpenSettings={() => setSettingsOpen(true)}
            onReload={() => void forceReload()}
            onRecover={() => void recoverCurrent()}
            selectedAccountName={
              selectedAccount?.displayName ?? vi.app.noAccountSelected
            }
            selectedAccountPlatform={selectedAccount?.platform ?? null}
            appVersion={appVersion}
            onSelect={setSelectedAccountId}
            onReorder={reorderAccounts}
            onAdd={() => void openAddWithPlatform()}
            onEdit={() => void openDrawer("edit")}
            canEdit={Boolean(selectedAccount)}
          />

          <ContentPane
            selectedAccount={selectedAccount}
            selectedServiceUrl={selectedServiceUrl}
            webviewHostRef={webviewHostRef}
            onAddAccount={(nextPlatform) =>
              void openAddWithPlatform(nextPlatform)
            }
          />
        </Box>

        <AccountDrawer
          opened={drawerOpen}
          mode={drawerMode}
          platform={platform}
          displayName={displayName}
          serviceUrl={serviceUrl}
          muted={muted}
          proxyUrl={proxyUrl}
          userAgent={userAgent}
          canDelete={drawerMode === "edit" && Boolean(selectedAccount)}
          busy={isSavingAccount}
          statusText={statusText}
          onClose={() => void closeDrawer()}
          onPlatformChange={(next) => {
            setPlatform(next);
            if (drawerMode === "add") setServiceUrl(defaultServiceUrl[next]);
          }}
          onDisplayNameChange={setDisplayName}
          onServiceUrlChange={setServiceUrl}
          onMutedChange={setMuted}
          onProxyUrlChange={setProxyUrl}
          onUserAgentChange={setUserAgent}
          onResetDefaultUrl={() => {
            if (selectedAccount)
              setServiceUrl(defaultServiceUrl[selectedAccount.platform]);
          }}
          onSubmit={onSubmit}
          onDelete={() => {
            if (selectedAccount)
              deleteAccountMutation.mutate(selectedAccount.id);
          }}
          onClearSession={() => void clearSession()}
        />

        <SettingsModal
          opened={settingsOpen}
          launchOnStartup={launchOnStartup}
          checkingUpdate={checkingUpdate}
          installingUpdate={installingUpdate}
          updateState={updateState}
          onClose={() => setSettingsOpen(false)}
          onToggleLaunch={(enabled) => void toggleLaunch(enabled)}
          onCheckUpdate={() => void checkUpdateNow()}
          onInstallUpdate={() => void installUpdateNow()}
        />
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
