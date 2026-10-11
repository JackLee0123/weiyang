"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => EverlongSyncPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  serverUrl: "",
  apiKey: "",
  syncRoot: "",
  autoSync: true
};
var EverlongSyncPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.statusEl = this.addStatusBarItem();
    this.setStatus("Everlong: \u5C31\u7EEA");
    this.addRibbonIcon("cloud-upload", "Everlong\uFF1A\u7ACB\u5373\u5168\u91CF\u540C\u6B65", () => {
      void this.syncAll();
    });
    this.addCommand({
      id: "everlong-sync-all",
      name: "\u5168\u91CF\u540C\u6B65\u6240\u6709\u7B14\u8BB0\u5230\u7F51\u7AD9",
      callback: () => void this.syncAll()
    });
    this.addCommand({
      id: "everlong-sync-current",
      name: "\u540C\u6B65\u5F53\u524D\u7B14\u8BB0\u5230\u7F51\u7AD9",
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (file) void this.pushNote(file);
        else new import_obsidian.Notice("\u6CA1\u6709\u6253\u5F00\u7684\u7B14\u8BB0");
      }
    });
    const debouncedPush = (0, import_obsidian.debounce)((file) => void this.pushNote(file), 2e3, true);
    this.registerEvent(
      this.app.vault.on("modify", (f) => {
        if (this.settings.autoSync && f instanceof import_obsidian.TFile && this.inScope(f)) debouncedPush(f);
      })
    );
    this.registerEvent(
      this.app.vault.on("create", (f) => {
        if (this.settings.autoSync && f instanceof import_obsidian.TFile && this.inScope(f)) debouncedPush(f);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (f) => {
        if (this.settings.autoSync && f instanceof import_obsidian.TFile && f.extension === "md")
          void this.pushDelete(f.path);
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (f, oldPath) => {
        if (this.settings.autoSync && f instanceof import_obsidian.TFile && this.inScope(f))
          void this.pushRename(oldPath, f);
      })
    );
    this.addSettingTab(new EverlongSyncSettingTab(this.app, this));
    if (this.settings.autoSync && this.configured()) {
      window.setTimeout(() => void this.syncAll(true), 5e3);
    }
  }
  onunload() {
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  configured() {
    return !!this.settings.serverUrl && !!this.settings.apiKey;
  }
  inScope(file) {
    if (file.extension !== "md") return false;
    const root = this.settings.syncRoot.replace(/^\/+|\/+$/g, "");
    if (!root) return true;
    return file.path === root || file.path.startsWith(root + "/");
  }
  setStatus(text) {
    this.statusEl.setText(text);
  }
  async callApi(path, body, method = "POST") {
    var _a, _b;
    const base = this.settings.serverUrl.replace(/\/+$/, "");
    const res = await (0, import_obsidian.requestUrl)({
      url: `${base}/api/obsidian${path}`,
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Obsidian-Key": this.settings.apiKey
      },
      body: body === void 0 ? void 0 : JSON.stringify(body),
      throw: false
    });
    if (res.status >= 400) {
      let detail = `HTTP ${res.status}`;
      try {
        detail = (_b = (_a = res.json) == null ? void 0 : _a.detail) != null ? _b : detail;
      } catch (e) {
      }
      throw new Error(detail);
    }
    return res.json;
  }
  async pushNote(file) {
    if (!this.configured()) return;
    try {
      this.setStatus("Everlong: \u540C\u6B65\u4E2D\u2026");
      const content = await this.app.vault.cachedRead(file);
      const result = await this.callApi("/sync/note", { path: file.path, content });
      this.setStatus(result.updated ? "Everlong: \u5DF2\u540C\u6B65" : "Everlong: \u65E0\u53D8\u5316");
    } catch (e) {
      this.setStatus("Everlong: \u540C\u6B65\u5931\u8D25");
      new import_obsidian.Notice(`Everlong \u540C\u6B65\u5931\u8D25\uFF1A${e instanceof Error ? e.message : e}`);
    }
  }
  async pushDelete(path) {
    if (!this.configured()) return;
    try {
      await this.callApi("/sync/delete", { path });
      this.setStatus("Everlong: \u5DF2\u5220\u9664");
    } catch (e) {
      new import_obsidian.Notice(`Everlong \u5220\u9664\u540C\u6B65\u5931\u8D25\uFF1A${e instanceof Error ? e.message : e}`);
    }
  }
  async pushRename(oldPath, file) {
    if (!this.configured()) return;
    try {
      const content = await this.app.vault.cachedRead(file);
      await this.callApi("/sync/rename", { old_path: oldPath, new_path: file.path, content });
      this.setStatus("Everlong: \u5DF2\u540C\u6B65");
    } catch (e) {
      new import_obsidian.Notice(`Everlong \u91CD\u547D\u540D\u540C\u6B65\u5931\u8D25\uFF1A${e instanceof Error ? e.message : e}`);
    }
  }
  async syncAll(silent = false) {
    var _a, _b;
    if (!this.configured()) {
      if (!silent) new import_obsidian.Notice("\u8BF7\u5148\u5728\u63D2\u4EF6\u8BBE\u7F6E\u91CC\u586B\u670D\u52A1\u5668\u5730\u5740\u548C API \u5BC6\u94A5");
      return;
    }
    const root = this.settings.syncRoot.replace(/^\/+|\/+$/g, "");
    const files = this.app.vault.getMarkdownFiles().filter((f) => this.inScope(f));
    if (!files.length) {
      if (!silent) new import_obsidian.Notice("\u540C\u6B65\u76EE\u5F55\u4E0B\u6CA1\u6709 Markdown \u7B14\u8BB0");
      return;
    }
    this.setStatus(`Everlong: \u540C\u6B65 0/${files.length}`);
    const batchSize = 20;
    let updated = 0;
    let failed = 0;
    for (let i = 0; i < files.length; i += batchSize) {
      const slice = files.slice(i, i + batchSize);
      try {
        const notes = await Promise.all(
          slice.map(async (f) => ({ path: f.path, content: await this.app.vault.cachedRead(f) }))
        );
        const result = await this.callApi("/sync/batch", { notes });
        updated += (_a = result.updated) != null ? _a : 0;
        failed += ((_b = result.errors) != null ? _b : []).length;
      } catch (e) {
        failed += slice.length;
        console.error("Everlong sync batch failed", e);
      }
      this.setStatus(`Everlong: \u540C\u6B65 ${Math.min(i + batchSize, files.length)}/${files.length}`);
    }
    this.setStatus("Everlong: \u5C31\u7EEA");
    if (!silent || failed > 0) {
      new import_obsidian.Notice(`Everlong \u5168\u91CF\u540C\u6B65\u5B8C\u6210\uFF1A\u66F4\u65B0 ${updated} \u7BC7${failed ? `\uFF0C\u5931\u8D25 ${failed} \u7BC7` : ""}`);
    }
  }
};
var EverlongSyncSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Everlong Sync \u8BBE\u7F6E" });
    containerEl.createEl("p", {
      text: "\u670D\u52A1\u5668\u5730\u5740\u586B\u7F51\u7AD9\u6839\u5730\u5740\uFF08\u4F8B\u5982 https://plan.example.com\uFF0C\u672C\u5730\u5F00\u53D1\u586B http://127.0.0.1:8000\uFF09\uFF1BAPI \u5BC6\u94A5\u5728\u7F51\u7AD9\u300C\u7B14\u8BB0 \u2192 \u540C\u6B65\u8BBE\u7F6E\u300D\u91CC\u751F\u6210\u3002",
      cls: "setting-item-description"
    });
    new import_obsidian.Setting(containerEl).setName("\u670D\u52A1\u5668\u5730\u5740").setDesc("\u7F51\u7AD9\u7684\u6839\u5730\u5740\uFF0C\u4E0D\u8981\u5E26 /api \u540E\u7F00").addText(
      (text) => text.setPlaceholder("http://127.0.0.1:8000").setValue(this.plugin.settings.serverUrl).onChange(async (value) => {
        this.plugin.settings.serverUrl = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("API \u5BC6\u94A5").setDesc("\u5728\u7F51\u7AD9\u300C\u7B14\u8BB0 \u2192 \u540C\u6B65\u8BBE\u7F6E\u300D\u4E2D\u751F\u6210\uFF0C\u4EE5 obsk_ \u5F00\u5934").addText((text) => {
      text.setPlaceholder("obsk_\u2026").setValue(this.plugin.settings.apiKey).onChange(async (value) => {
        this.plugin.settings.apiKey = value.trim();
        await this.plugin.saveSettings();
      });
      text.inputEl.type = "password";
    });
    new import_obsidian.Setting(containerEl).setName("\u540C\u6B65\u76EE\u5F55").setDesc("\u53EA\u540C\u6B65\u8BE5\u76EE\u5F55\uFF08\u542B\u5B50\u76EE\u5F55\uFF09\u4E0B\u7684\u7B14\u8BB0\uFF1B\u7559\u7A7A\u8868\u793A\u6574\u4E2A\u5E93\u3002\u4F8B\u5982\uFF1A\u65E5\u8BB0").addText(
      (text) => text.setPlaceholder("\u7559\u7A7A = \u6574\u4E2A\u5E93").setValue(this.plugin.settings.syncRoot).onChange(async (value) => {
        this.plugin.settings.syncRoot = (0, import_obsidian.normalizePath)(value.trim().replace(/^\/+|\/+$/g, ""));
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u81EA\u52A8\u540C\u6B65").setDesc("\u4FDD\u5B58\u7B14\u8BB0\u540E\u81EA\u52A8\u63A8\u9001\uFF1B\u5173\u95ED\u540E\u53EA\u80FD\u7528\u624B\u52A8\u547D\u4EE4 / \u4FA7\u8FB9\u6309\u94AE\u540C\u6B65").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoSync).onChange(async (value) => {
        this.plugin.settings.autoSync = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u6D4B\u8BD5\u8FDE\u63A5").setDesc("\u9A8C\u8BC1\u670D\u52A1\u5668\u5730\u5740\u548C API \u5BC6\u94A5\u662F\u5426\u6709\u6548").addButton(
      (btn) => btn.setButtonText("\u6D4B\u8BD5").onClick(async () => {
        try {
          await this.plugin.callApi("/sync/check", {}, "GET");
          new import_obsidian.Notice("\u8FDE\u63A5\u6210\u529F\uFF0C\u5BC6\u94A5\u6709\u6548 \u2713");
        } catch (e) {
          new import_obsidian.Notice(`\u8FDE\u63A5\u5931\u8D25\uFF1A${e instanceof Error ? e.message : e}`);
        }
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u7ACB\u5373\u5168\u91CF\u540C\u6B65").setDesc("\u628A\u540C\u6B65\u76EE\u5F55\u4E0B\u6240\u6709\u7B14\u8BB0\u63A8\u9001\u5230\u7F51\u7AD9\uFF08\u5185\u5BB9\u6CA1\u53D8\u7684\u4F1A\u8DF3\u8FC7\uFF09").addButton(
      (btn) => btn.setButtonText("\u5168\u91CF\u540C\u6B65").setCta().onClick(() => void this.plugin.syncAll())
    );
  }
};
