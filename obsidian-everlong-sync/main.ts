import {
  App,
  debounce,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TAbstractFile,
  TFile,
  normalizePath,
  requestUrl,
} from 'obsidian'

/**
 * Everlong Sync —— 把笔记同步到未央 · Everlong 网站。
 *
 * 工作原理：
 *  - 监听 vault 的 create / modify / rename / delete，把 Markdown 原文
 *    POST 到网站后端；后端渲染成 HTML，网页端按富文本展示。
 *  - 保存后防抖 2 秒再上传，避免敲字时狂发请求。
 *  - 启动时做一次全量增量同步（内容哈希没变的服务端会跳过）。
 *  - 只同步 settings.syncRoot 目录下的 .md 文件；空字符串表示整个库。
 */

interface EverlongSyncSettings {
  serverUrl: string
  apiKey: string
  syncRoot: string
  autoSync: boolean
}

const DEFAULT_SETTINGS: EverlongSyncSettings = {
  serverUrl: '',
  apiKey: '',
  syncRoot: '',
  autoSync: true,
}

export default class EverlongSyncPlugin extends Plugin {
  settings!: EverlongSyncSettings
  private statusEl!: HTMLElement

  async onload() {
    await this.loadSettings()

    this.statusEl = this.addStatusBarItem()
    this.setStatus('Everlong: 就绪')

    this.addRibbonIcon('cloud-upload', 'Everlong：立即全量同步', () => {
      void this.syncAll()
    })

    this.addCommand({
      id: 'everlong-sync-all',
      name: '全量同步所有笔记到网站',
      callback: () => void this.syncAll(),
    })
    this.addCommand({
      id: 'everlong-sync-current',
      name: '同步当前笔记到网站',
      callback: () => {
        const file = this.app.workspace.getActiveFile()
        if (file) void this.pushNote(file)
        else new Notice('没有打开的笔记')
      },
    })

    // 保存 / 新建 → 防抖后上传
    const debouncedPush = debounce((file: TFile) => void this.pushNote(file), 2000, true)
    this.registerEvent(
      this.app.vault.on('modify', (f) => {
        if (this.settings.autoSync && f instanceof TFile && this.inScope(f)) debouncedPush(f)
      }),
    )
    this.registerEvent(
      this.app.vault.on('create', (f) => {
        if (this.settings.autoSync && f instanceof TFile && this.inScope(f)) debouncedPush(f)
      }),
    )
    this.registerEvent(
      this.app.vault.on('delete', (f) => {
        if (this.settings.autoSync && f instanceof TFile && f.extension === 'md')
          void this.pushDelete(f.path)
      }),
    )
    this.registerEvent(
      this.app.vault.on('rename', (f, oldPath) => {
        if (this.settings.autoSync && f instanceof TFile && this.inScope(f))
          void this.pushRename(oldPath, f)
      }),
    )

    this.addSettingTab(new EverlongSyncSettingTab(this.app, this))

    // 启动后 5 秒做一次静默全量同步
    if (this.settings.autoSync && this.configured()) {
      window.setTimeout(() => void this.syncAll(true), 5000)
    }
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  private configured(): boolean {
    return !!this.settings.serverUrl && !!this.settings.apiKey
  }

  private inScope(file: TFile): boolean {
    if (file.extension !== 'md') return false
    const root = this.settings.syncRoot.replace(/^\/+|\/+$/g, '')
    if (!root) return true
    return file.path === root || file.path.startsWith(root + '/')
  }

  private setStatus(text: string) {
    this.statusEl.setText(text)
  }

  async callApi(path: string, body: unknown, method = 'POST') {
    const base = this.settings.serverUrl.replace(/\/+$/, '')
    const res = await requestUrl({
      url: `${base}/api/obsidian${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Obsidian-Key': this.settings.apiKey,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      throw: false,
    })
    if (res.status >= 400) {
      let detail = `HTTP ${res.status}`
      try {
        detail = res.json?.detail ?? detail
      } catch {
        /* ignore */
      }
      throw new Error(detail)
    }
    return res.json
  }

  async pushNote(file: TFile) {
    if (!this.configured()) return
    try {
      this.setStatus('Everlong: 同步中…')
      const content = await this.app.vault.cachedRead(file)
      const result = await this.callApi('/sync/note', { path: file.path, content })
      this.setStatus(result.updated ? 'Everlong: 已同步' : 'Everlong: 无变化')
    } catch (e) {
      this.setStatus('Everlong: 同步失败')
      new Notice(`Everlong 同步失败：${e instanceof Error ? e.message : e}`)
    }
  }

  private async pushDelete(path: string) {
    if (!this.configured()) return
    try {
      await this.callApi('/sync/delete', { path })
      this.setStatus('Everlong: 已删除')
    } catch (e) {
      new Notice(`Everlong 删除同步失败：${e instanceof Error ? e.message : e}`)
    }
  }

  private async pushRename(oldPath: string, file: TFile) {
    if (!this.configured()) return
    try {
      const content = await this.app.vault.cachedRead(file)
      await this.callApi('/sync/rename', { old_path: oldPath, new_path: file.path, content })
      this.setStatus('Everlong: 已同步')
    } catch (e) {
      new Notice(`Everlong 重命名同步失败：${e instanceof Error ? e.message : e}`)
    }
  }

  async syncAll(silent = false) {
    if (!this.configured()) {
      if (!silent) new Notice('请先在插件设置里填服务器地址和 API 密钥')
      return
    }
    const root = this.settings.syncRoot.replace(/^\/+|\/+$/g, '')
    const files = this.app.vault.getMarkdownFiles().filter((f) => this.inScope(f))
    if (!files.length) {
      if (!silent) new Notice('同步目录下没有 Markdown 笔记')
      return
    }
    this.setStatus(`Everlong: 同步 0/${files.length}`)
    const batchSize = 20
    let updated = 0
    let failed = 0
    for (let i = 0; i < files.length; i += batchSize) {
      const slice = files.slice(i, i + batchSize)
      try {
        const notes = await Promise.all(
          slice.map(async (f) => ({ path: f.path, content: await this.app.vault.cachedRead(f) })),
        )
        const result = await this.callApi('/sync/batch', { notes })
        updated += result.updated ?? 0
        failed += (result.errors ?? []).length
      } catch (e) {
        failed += slice.length
        console.error('Everlong sync batch failed', e)
      }
      this.setStatus(`Everlong: 同步 ${Math.min(i + batchSize, files.length)}/${files.length}`)
    }
    this.setStatus('Everlong: 就绪')
    if (!silent || failed > 0) {
      new Notice(`Everlong 全量同步完成：更新 ${updated} 篇${failed ? `，失败 ${failed} 篇` : ''}`)
    }
    void root
  }
}

class EverlongSyncSettingTab extends PluginSettingTab {
  plugin: EverlongSyncPlugin

  constructor(app: App, plugin: EverlongSyncPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    containerEl.createEl('h2', { text: 'Everlong Sync 设置' })
    containerEl.createEl('p', {
      text: '服务器地址填网站根地址（例如 https://plan.example.com，本地开发填 http://127.0.0.1:8000）；API 密钥在网站「笔记 → 同步设置」里生成。',
      cls: 'setting-item-description',
    })

    new Setting(containerEl)
      .setName('服务器地址')
      .setDesc('网站的根地址，不要带 /api 后缀')
      .addText((text) =>
        text
          .setPlaceholder('http://127.0.0.1:8000')
          .setValue(this.plugin.settings.serverUrl)
          .onChange(async (value) => {
            this.plugin.settings.serverUrl = value.trim()
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('API 密钥')
      .setDesc('在网站「笔记 → 同步设置」中生成，以 obsk_ 开头')
      .addText((text) => {
        text
          .setPlaceholder('obsk_…')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim()
            await this.plugin.saveSettings()
          })
        text.inputEl.type = 'password'
      })

    new Setting(containerEl)
      .setName('同步目录')
      .setDesc('只同步该目录（含子目录）下的笔记；留空表示整个库。例如：日记')
      .addText((text) =>
        text
          .setPlaceholder('留空 = 整个库')
          .setValue(this.plugin.settings.syncRoot)
          .onChange(async (value) => {
            this.plugin.settings.syncRoot = normalizePath(value.trim().replace(/^\/+|\/+$/g, ''))
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('自动同步')
      .setDesc('保存笔记后自动推送；关闭后只能用手动命令 / 侧边按钮同步')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoSync).onChange(async (value) => {
          this.plugin.settings.autoSync = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl)
      .setName('测试连接')
      .setDesc('验证服务器地址和 API 密钥是否有效')
      .addButton((btn) =>
        btn.setButtonText('测试').onClick(async () => {
          try {
            await this.plugin.callApi('/sync/check', {}, 'GET')
            new Notice('连接成功，密钥有效 ✓')
          } catch (e) {
            new Notice(`连接失败：${e instanceof Error ? e.message : e}`)
          }
        }),
      )

    new Setting(containerEl)
      .setName('立即全量同步')
      .setDesc('把同步目录下所有笔记推送到网站（内容没变的会跳过）')
      .addButton((btn) =>
        btn
          .setButtonText('全量同步')
          .setCta()
          .onClick(() => void this.plugin.syncAll()),
      )
  }
}

// 让 TAbstractFile 引用被用上（类型层面），避免 noUnusedLocals 报错
export type { TAbstractFile }
