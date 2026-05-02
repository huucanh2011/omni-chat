function parseBadgeLike(value) {
  const s = String(value || "").trim();
  if (!s) return 0;
  if (/^\d{1,3}$/.test(s)) return Number(s);
  const plusMatch = s.match(/^(\d{1,3})\+$/);
  if (plusMatch) return Number(plusMatch[1]);
  return 0;
}

function hasPositiveBadgeText(value) {
  return parseBadgeLike(value) > 0;
}

function parseUnreadFromTitle(title) {
  const raw = String(title || "").trim();
  if (!raw) return 0;
  const bracketMatch = raw.match(/[\(\[\{]\s*(\d{1,4})\s*[\)\]\}]/);
  return bracketMatch ? Number(bracketMatch[1] || 0) : 0;
}

async function runInDom(webContents, fnBody) {
  if (!webContents || webContents.isDestroyed()) return 0;
  try {
    const value = await webContents.executeJavaScript(`(${fnBody})()`, true);
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function hostOf(webContents) {
  try {
    const current = webContents.getURL();
    return new URL(current).hostname;
  } catch {
    return "";
  }
}

const zaloDetector = {
  id: "zalo",
  match: (host) => host.includes("chat.zalo.me"),
  detect: async (webContents) =>
    runInDom(
      webContents,
      function zaloDetect() {
        const parse = (v) => {
          const s = String(v || "").trim();
          if (!s) return 0;
          if (/^\d{1,3}$/.test(s)) return Number(s);
          const m = s.match(/^(\d{1,3})\+$/);
          return m ? Number(m[1]) : 0;
        };
        const isBadgeVisual = (el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return false;
          if (rect.width > 36 || rect.height > 28) return false;
          const style = getComputedStyle(el);
          if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity || "1") < 0.4) return false;
          const radius = parseFloat(style.borderRadius || "0");
          const hasRounded = Number.isFinite(radius) && radius >= 6;
          const hasBackground =
            style.backgroundColor &&
            style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
            style.backgroundColor !== "transparent";
          return hasRounded || hasBackground;
        };

        const tab = document.querySelector("[data-id='div_Main_TabMsg']");
        if (!tab) return 0;

        const container = tab.querySelector(".z-noti-badge-container");
        if (!container) return 0;

        const hasPositive = (v) => parse(v) > 0;

        const hasVisibleBadge = (root) => {
          const candidates = root.querySelectorAll(".z-noti-badge, .badge, [data-count], [data-unread], [data-badge], sup, span, div, i");
          for (const el of candidates) {
            if (!isBadgeVisual(el)) continue;
            const cls = String(el.className || "").toLowerCase();
            if (
              cls.includes("fa-message") ||
              cls.includes("internal-icon") ||
              cls.includes("mmi-icon") ||
              cls.includes("icon")
            ) {
              continue;
            }
            if (
              hasPositive(el.textContent) ||
              hasPositive(el.getAttribute?.("data-count")) ||
              hasPositive(el.getAttribute?.("data-unread")) ||
              hasPositive(el.getAttribute?.("data-badge"))
            ) {
              return true;
            }
            // Dot-only badge fallback: class hints + tiny visible bubble
            if (cls.includes("badge") || cls.includes("noti")) return true;
          }
          return false;
        };

        const attrs = ["data-count", "data-unread", "data-badge"];
        for (const attr of attrs) {
          if (hasPositive(container.getAttribute(attr))) return 1;
        }
        if (hasVisibleBadge(container)) return 1;

        // Badge can be sibling/overlay near icon, not necessarily direct child.
        const scope = tab;
        const nodes = scope.querySelectorAll(".z-noti-badge, .badge, [data-count], [data-unread], [data-badge], sup, span, div, i");
        const iconRect = container.getBoundingClientRect();
        const iconCx = iconRect.left + iconRect.width / 2;
        const iconCy = iconRect.top + iconRect.height / 2;
        let bestScore = Number.POSITIVE_INFINITY;

        for (const el of nodes) {
          if (el === container) continue;
          if (!isBadgeVisual(el)) continue;
          const rect = el.getBoundingClientRect();
          // Must be tiny bubble-like element.
          if (rect.width > 24 || rect.height > 24) continue;

          const hasValue =
            hasPositive((el.textContent || "").trim()) ||
            hasPositive(el.getAttribute?.("data-count")) ||
            hasPositive(el.getAttribute?.("data-unread")) ||
            hasPositive(el.getAttribute?.("data-badge"));
          const cls = String(el.className || "").toLowerCase();
          const badgeHint = cls.includes("badge") || cls.includes("noti") || cls.includes("count");
          if (!hasValue && !badgeHint) continue;

          for (const attr of attrs) {
            if (hasPositive(el.getAttribute?.(attr))) {
              // noop, accounted by hasValue
            }
          }
          // Prefer element closest to message icon bubble container.
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = cx - iconCx;
          const dy = cy - iconCy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const area = rect.width * rect.height;
          const score = dist + area * 0.15;
          if (score < bestScore) {
            bestScore = score;
          }
        }
        return Number.isFinite(bestScore) ? 1 : 0;
      }
    )
};

const telegramDetector = {
  id: "telegram",
  match: (host) => host.includes("web.telegram.org"),
  detect: async (webContents) => {
    const byTitle = parseUnreadFromTitle(webContents.getTitle());
    if (byTitle > 0) return 1;
    const n = await runInDom(
      webContents,
      function telegramDetect() {
        const parse = (v) => {
          const s = String(v || "").trim();
          if (!s) return 0;
          if (/^\d{1,3}$/.test(s)) return Number(s);
          const m = s.match(/^(\d{1,3})\+$/);
          return m ? Number(m[1]) : 0;
        };
        const items = document.querySelectorAll("[class*='badge' i], [class*='counter' i], [data-testid*='badge' i]");
        const nums = [];
        for (const el of items) {
          const n = parse(el.textContent);
          if (n) nums.push(n);
        }
        return nums.length ? Math.max(...nums) : 0;
      }
    );
    return n > 0 ? 1 : 0;
  }
};

const teamsDetector = {
  id: "teams",
  match: (host) => host.includes("teams.microsoft.com"),
  detect: async (webContents) => {
    const byTitle = parseUnreadFromTitle(webContents.getTitle());
    if (byTitle > 0) return 1;
    const n = await runInDom(
      webContents,
      function teamsDetect() {
        const parse = (v) => {
          const s = String(v || "").trim();
          if (!s) return 0;
          if (/^\d{1,3}$/.test(s)) return Number(s);
          const m = s.match(/^(\d{1,3})\+$/);
          return m ? Number(m[1]) : 0;
        };
        const items = document.querySelectorAll("[aria-label*='unread' i], [class*='badge' i], [data-tid*='badge' i]");
        const nums = [];
        for (const el of items) {
          const n1 = parse(el.textContent);
          const n2 = parse(el.getAttribute?.("aria-label"));
          if (n1) nums.push(n1);
          if (n2) nums.push(n2);
        }
        return nums.length ? Math.max(...nums) : 0;
      }
    );
    return n > 0 ? 1 : 0;
  }
};

const genericDetector = {
  id: "generic",
  match: () => true,
  detect: async (webContents) => (parseUnreadFromTitle(webContents.getTitle()) > 0 ? 1 : 0)
};

const registry = [zaloDetector, telegramDetector, teamsDetector, genericDetector];

async function detectUnreadForWebContents(webContents) {
  if (!webContents || webContents.isDestroyed()) return 0;
  const host = hostOf(webContents);
  const detector = registry.find((d) => d.match(host)) || genericDetector;
  return detector.detect(webContents);
}

module.exports = {
  detectUnreadForWebContents,
  parseUnreadFromTitle
};
