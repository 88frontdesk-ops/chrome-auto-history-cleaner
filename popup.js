const scheduleEnabled = document.getElementById("scheduleEnabled");
const interval = document.getElementById("interval");
const clearOnClose = document.getElementById("clearOnClose");
const save = document.getElementById("save");
const clearNow = document.getElementById("clearNow");
const status = document.getElementById("status");

function formatLastCleaned(value) {
  return value
    ? "Last cleanup: " + new Date(value).toLocaleString()
    : "No cleanup recorded yet.";
}

async function load() {
  const settings = await chrome.storage.local.get({
    scheduleEnabled: true,
    intervalMinutes: 60,
    clearOnClose: false,
    lastCleaned: null
  });

  scheduleEnabled.checked = settings.scheduleEnabled;
  interval.value = String(settings.intervalMinutes);
  clearOnClose.checked = settings.clearOnClose;
  status.textContent = formatLastCleaned(settings.lastCleaned);
}

save.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({
    type: "saveSettings",
    scheduleEnabled: scheduleEnabled.checked,
    intervalMinutes: Number(interval.value),
    clearOnClose: clearOnClose.checked
  });

  status.textContent = response.ok
    ? "Settings saved."
    : "Error: " + response.error;
});

clearNow.addEventListener("click", async () => {
  clearNow.disabled = true;
  const response = await chrome.runtime.sendMessage({ type: "clearNow" });
  const settings = await chrome.storage.local.get({ lastCleaned: null });
  status.textContent = response.ok
    ? formatLastCleaned(settings.lastCleaned)
    : "Unable to clear history.";
  clearNow.disabled = false;
});

load();
