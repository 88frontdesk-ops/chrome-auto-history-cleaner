const ALARM_NAME = "scheduled-history-cleanup";
const VALID_INTERVALS = [10, 30, 60];

async function getSettings() {
  return chrome.storage.local.get({
    scheduleEnabled: true,
    intervalMinutes: 60,
    clearOnClose: false,
    lastCleaned: null
  });
}

async function clearHistory() {
  try {
    await chrome.history.deleteAll();
    await chrome.storage.local.set({ lastCleaned: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error("History cleanup failed:", error);
    return false;
  }
}

async function configureAlarm() {
  const settings = await getSettings();
  await chrome.alarms.clear(ALARM_NAME);

  if (
    settings.scheduleEnabled &&
    VALID_INTERVALS.includes(Number(settings.intervalMinutes))
  ) {
    await chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: Number(settings.intervalMinutes),
      periodInMinutes: Number(settings.intervalMinutes)
    });
  }
}

chrome.runtime.onInstalled.addListener(configureAlarm);
chrome.runtime.onStartup.addListener(configureAlarm);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const settings = await getSettings();
  if (settings.scheduleEnabled) {
    await clearHistory();
  }
});

// Best effort only: Chrome does not guarantee completion of async work
// during browser shutdown.
chrome.runtime.onSuspend.addListener(async () => {
  const settings = await getSettings();
  if (settings.clearOnClose) {
    await clearHistory();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "saveSettings") {
      const interval = Number(message.intervalMinutes);

      if (!VALID_INTERVALS.includes(interval)) {
        sendResponse({ ok: false, error: "Invalid interval." });
        return;
      }

      await chrome.storage.local.set({
        scheduleEnabled: Boolean(message.scheduleEnabled),
        intervalMinutes: interval,
        clearOnClose: Boolean(message.clearOnClose)
      });

      await configureAlarm();
      sendResponse({ ok: true });
    } else if (message.type === "clearNow") {
      const ok = await clearHistory();
      sendResponse({ ok });
    }
  })();

  return true;
});
