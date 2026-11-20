// Working offline and installing Dexna as an app. The service worker (coi-serviceworker.js) keeps a
// copy of everything Dexna loads; this shows when the connection is gone, offers to install Dexna
// where the browser allows it, and can clear the saved copy.

export function createOffline(API) {
  const chip = API.h("span", { class: "sb-item hidden", id: "sb-offline", title: "No connection. Everything you have used before still works. Online languages, installing packages and GitHub need a connection." }, "Offline");
  document.querySelector("#statusbar .left")?.append(chip);
  const update = () => chip.classList.toggle("hidden", navigator.onLine);
  addEventListener("online", () => { update(); API.toast("Back online", "ok", 2000); });
  addEventListener("offline", () => { update(); API.toast("You are offline. Everything you have used before still works.", "warn", 5000); });
  update();

  let installEvent = null;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvent = e; });
  addEventListener("appinstalled", () => { installEvent = null; API.toast("Dexna is installed. Open it from your apps like any other program.", "ok", 5000); });

  async function install() {
    if (matchMedia("(display-mode: standalone)").matches) return API.toast("You are already using the installed app", "info");
    if (!installEvent) return API.toast("Your browser does not offer installing here. In Chrome or Edge, use the install button in the address bar; in Safari, Share > Add to Dock or Add to Home Screen.", "info", 7000);
    installEvent.prompt();
    await installEvent.userChoice.catch(() => {});
    installEvent = null;
  }

  async function usage() {
    if (!("caches" in self)) return null;
    const c = await caches.open("dexna-offline-v1"), keys = await c.keys();
    const est = await navigator.storage?.estimate?.().catch(() => null);
    return { files: keys.length, bytes: est?.usageDetails?.caches ?? est?.usage ?? 0 };
  }
  async function info() {
    const u = await usage();
    if (!u) return API.toast("This browser cannot keep files for offline use", "warn");
    const mb = (u.bytes / 1e6).toFixed(u.bytes > 1e8 ? 0 : 1);
    API.toast(`Saved for offline use: ${u.files} files${u.bytes ? `, about ${mb} MB` : ""}. Anything you open or run is added.`, "info", 6000);
  }
  async function clear() {
    if (!(await API.confirmDialog({ title: "Clear the offline copy", message: "Dexna will download its files again as you use them. Your projects and settings are not touched.", okLabel: "Clear", danger: true }))) return;
    try { await caches.delete("dexna-offline-v1"); API.toast("Offline copy cleared", "ok"); } catch (e) { API.toast("Could not clear it: " + e.message, "error"); }
  }

  return {
    install, info, clear,
    commands: [
      { id: "app-install", label: "Install Dexna as an App", cat: "Help", run: install },
      { id: "offline-info", label: "Offline Storage: Show What Is Saved", cat: "Help", run: info },
      { id: "offline-clear", label: "Offline Storage: Clear", cat: "Help", run: clear },
    ],
  };
}
