const { ipcRenderer } = require("electron");

const arg = process.argv.find((x) => x.startsWith("--omni-account-id=")) || "";
const accountId = arg.split("=")[1] || "";

function emitUnreadSignal(kind) {
  if (!accountId) return;
  ipcRenderer.send("account:unread-signal", {
    accountId,
    kind,
    ts: Date.now()
  });
}

function patchNotification() {
  try {
    const NativeNotification = window.Notification;
    if (!NativeNotification) return;

    function WrappedNotification(title, options) {
      emitUnreadSignal("notification");
      return new NativeNotification(title, options);
    }

    WrappedNotification.requestPermission = (...args) => NativeNotification.requestPermission(...args);
    WrappedNotification.permission = NativeNotification.permission;
    WrappedNotification.prototype = NativeNotification.prototype;
    Object.setPrototypeOf(WrappedNotification, NativeNotification);
    window.Notification = WrappedNotification;
  } catch {}
}

function observeTitle() {
  try {
    const title = document.querySelector("title");
    if (!title) return;
    const obs = new MutationObserver(() => {
      emitUnreadSignal("title");
    });
    obs.observe(title, { childList: true, subtree: true, characterData: true });
  } catch {}
}

window.addEventListener("DOMContentLoaded", () => {
  patchNotification();
  observeTitle();
});
