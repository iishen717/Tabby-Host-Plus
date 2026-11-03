/**
 * Host+ 主机数据服务
 * 功能描述：主机 CRUD + 分组管理 + localStorage 持久化
 */
export interface HostEntry {
  id: string
  name: string         // 名称
  host: string         // 主机地址（IP 或域名）
  ip: string           // IP 地址
  port: number         // 端口（默认 22）
  username: string     // 用户名
  password: string     // 密码（仅用于连接，不在主面板显示）
  authType?: 'password' | 'publicKey' // 认证方式：密码 / 私钥（旧数据缺省按密码处理）
  privateKeyPath?: string // 私钥文件路径（只保存路径，不保存私钥内容）
  remark: string       // 备注
  group: string        // 分组名，空字符串表示未分组
  color?: string       // 显示颜色（可选）
  pinned?: boolean     // 是否固定在快捷入口
  createdAt: number
  updatedAt: number
  usageCount: number   // 连接次数
}

export interface HostGroup {
  name: string
  color?: string
  expanded: boolean
  order: number
}

export interface PositionMemoryData {
  entryX: number
  entryY: number
  panelX: number
  panelY: number
  panelScrollTop: number
  filterGroup?: string
  groupExpanded?: Record<string, boolean>
}

const STORAGE_KEY = 'hp-hosts-v1'
const GROUP_KEY = 'hp-groups-v1'
const PINNED_ENTRY_POS_KEY = 'hp-entry-pos'
const PANEL_POS_KEY = 'hp-panel-pos'
const ENTRY_MODE_KEY = 'hp-entry-mode'

export class HostDataService {
  private hosts: HostEntry[] = []
  private groups: HostGroup[] = []

  constructor() {
    this.load()
  }

  /* ---- 持久化 ---- */
  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) this.hosts = JSON.parse(raw)
    } catch { this.hosts = [] }

    try {
      const raw = localStorage.getItem(GROUP_KEY)
      if (raw) this.groups = JSON.parse(raw)
    } catch { this.groups = [] }
  }

  reload(): void {
    this.load()
  }

  private saveHosts(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.hosts))
  }

  private saveGroups(): void {
    localStorage.setItem(GROUP_KEY, JSON.stringify(this.groups))
  }

  /* ---- 主机操作 ---- */
  getAll(): HostEntry[] {
    return [...this.hosts]
  }

  getByGroup(group: string): HostEntry[] {
    return this.hosts.filter(h => h.group === group).sort((a, b) => b.usageCount - a.usageCount)
  }

  getPinned(): HostEntry[] {
    return this.hosts.filter(h => h.pinned).slice(0, 3)
  }

  getById(id: string): HostEntry | undefined {
    return this.hosts.find(h => h.id === id)
  }

  add(entry: Omit<HostEntry, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): HostEntry {
    const now = Date.now()
    const newEntry: HostEntry = {
      ...entry,
      id: 'hp_' + now + '_' + Math.random().toString(36).slice(2, 8),
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    }
    this.hosts.push(newEntry)
    this.saveHosts()
    return newEntry
  }

  update(id: string, partial: Partial<HostEntry>): boolean {
    const idx = this.hosts.findIndex(h => h.id === id)
    if (idx === -1) return false
    this.hosts[idx] = { ...this.hosts[idx], ...partial, updatedAt: Date.now() }
    this.saveHosts()
    return true
  }

  remove(id: string): boolean {
    const idx = this.hosts.findIndex(h => h.id === id)
    if (idx === -1) return false
    this.hosts.splice(idx, 1)
    this.saveHosts()
    return true
  }

  incrementUsage(id: string): void {
    const host = this.hosts.find(h => h.id === id)
    if (host) {
      host.usageCount = (host.usageCount || 0) + 1
      this.saveHosts()
    }
  }

  reorder(ids: string[]): void {
    const map = new Map(this.hosts.map(h => [h.id, h]))
    const reordered: HostEntry[] = []
    const seen = new Set<string>()
    for (const id of ids) {
      const host = map.get(id)
      if (host && !seen.has(id)) {
        reordered.push(host)
        seen.add(id)
      }
    }
    for (const host of this.hosts) {
      if (!seen.has(host.id)) {
        reordered.push(host)
        seen.add(host.id)
      }
    }
    this.hosts = reordered
    this.saveHosts()
  }

  reorderGroups(names: string[]): void {
    const deduped: HostGroup[] = []
    const seen = new Set<string>()
    for (const g of this.groups) {
      if (!seen.has(g.name)) {
        deduped.push(g)
        seen.add(g.name)
      }
    }
    this.groups = deduped
    const map = new Map(this.groups.map(g => [g.name, g]))
    const reordered: HostGroup[] = []
    const seen2 = new Set<string>()
    for (const name of names) {
      const group = map.get(name)
      if (group && !seen2.has(name)) {
        reordered.push(group)
        seen2.add(name)
      }
    }
    for (const g of this.groups) {
      if (!seen2.has(g.name)) {
        reordered.push(g)
        seen2.add(g.name)
      }
    }
    this.groups = reordered
    this.saveGroups()
  }

  /* ---- 分组操作 ---- */
  getGroups(): HostGroup[] {
    const usedGroups = new Set(this.hosts.map(h => h.group).filter(Boolean))
    const merged: HostGroup[] = []
    const seen = new Set<string>()
    let hasUngrouped = false

    for (const g of this.groups) {
      if (seen.has(g.name)) continue
      seen.add(g.name)
      if (usedGroups.has(g.name)) {
        merged.push(g)
        usedGroups.delete(g.name)
      } else if (g.name && !usedGroups.has(g.name)) {
        merged.push(g)
      } else if (g.name === '' && !hasUngrouped) {
        hasUngrouped = true
        merged.push(g)
      }
    }
    for (const name of usedGroups) {
      merged.push({ name, expanded: true, order: merged.length })
    }
    if (!hasUngrouped) {
      const hasUncategorized = this.hosts.some(h => !h.group)
      if (hasUncategorized) {
        merged.push({ name: '', expanded: false, order: merged.length })
      }
    }

    if (JSON.stringify(merged) !== JSON.stringify(this.groups)) {
      this.groups = merged
      this.saveGroups()
    }

    this.groups.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    this.saveGroups()

    return this.groups
  }

  toggleGroupExpanded(name: string): void {
    const g = this.groups.find(gr => gr.name === name)
    if (g) g.expanded = !g.expanded
    else this.groups.push({ name, expanded: true, order: this.groups.length })
    this.saveGroups()
  }

  addGroup(name: string, order?: number): void {
    if (!name) return
    if (!this.groups.find(g => g.name === name)) {
      this.groups.push({ name, expanded: true, order: order ?? this.groups.length })
      this.saveGroups()
    }
  }

  updateGroupOrder(name: string, order: number): void {
    const g = this.groups.find(gr => gr.name === name)
    if (g) { g.order = order; this.saveGroups() }
  }

  removeGroup(name: string): void {
    this.hosts.forEach(h => {
      if (h.group === name) h.group = ''
    })
    this.saveHosts()
    const idx = this.groups.findIndex(g => g.name === name)
    if (idx !== -1) this.groups.splice(idx, 1)
    this.saveGroups()
  }

  renameGroup(oldName: string, newName: string): void {
    if (!newName || oldName === newName) return
    this.hosts.forEach(h => {
      if (h.group === oldName) h.group = newName
    })
    this.saveHosts()
    const g = this.groups.find(gr => gr.name === oldName)
    if (g) {
      g.name = newName
      this.saveGroups()
    }
  }

  /* ---- 入口位置 ---- */
  getEntryPosition(): { x: number; y: number } {
    try {
      const raw = localStorage.getItem(PINNED_ENTRY_POS_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return { x: 20, y: 60 }
  }

  saveEntryPosition(pos: { x: number; y: number }): void {
    localStorage.setItem(PINNED_ENTRY_POS_KEY, JSON.stringify(pos))
  }

  getPanelPosition(): { x: number; y: number } {
    try {
      const raw = localStorage.getItem(PANEL_POS_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return { x: 20, y: 60 }
  }

  savePanelPosition(pos: { x: number; y: number }): void {
    localStorage.setItem(PANEL_POS_KEY, JSON.stringify(pos))
  }

  /* ---- 按连接记忆位置 ---- */
  private posMemoryKey(profileId: string): string {
    return `hp-pos-memory-${profileId}`
  }

  getPositionMemory(profileId: string): PositionMemoryData | null {
    if (!profileId) return null
    try {
      const raw = localStorage.getItem(this.posMemoryKey(profileId))
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return null
  }

  savePositionMemory(profileId: string, data: Partial<PositionMemoryData>): void {
    if (!profileId) return
    const existing = this.getPositionMemory(profileId) || { entryX: 20, entryY: 60, panelX: 20, panelY: 60, panelScrollTop: 0 }
    const merged = { ...existing, ...data }
    localStorage.setItem(this.posMemoryKey(profileId), JSON.stringify(merged))
  }

  clearPositionMemory(profileId: string): void {
    if (!profileId) return
    localStorage.removeItem(this.posMemoryKey(profileId))
  }

  hasPositionMemory(profileId: string): boolean {
    if (!profileId) return false
    try {
      return localStorage.getItem(this.posMemoryKey(profileId)) !== null
    } catch { return false }
  }

  togglePositionMemory(profileId: string): boolean {
    if (this.hasPositionMemory(profileId)) {
      this.clearPositionMemory(profileId)
      return false
    }
    this.savePositionMemory(profileId, {})
    return true
  }

  /* ---- 入口模式 ---- */
  getEntryMode(): 'floating' | 'toolbar' {
    try {
      const raw = localStorage.getItem(ENTRY_MODE_KEY)
      if (raw === 'toolbar') return 'toolbar'
      if (raw === 'floating') return 'floating'
    } catch { /* ignore */ }
    return 'toolbar'
  }

  saveEntryMode(mode: 'floating' | 'toolbar'): void {
    localStorage.setItem(ENTRY_MODE_KEY, mode)
  }

  /* ---- 导入/导出 ---- */
  exportAll(): string {
    return JSON.stringify({ hosts: this.hosts, groups: this.groups }, null, 2)
  }

  importAll(json: string): boolean {
    try {
      const data = JSON.parse(json)
      if (!data || typeof data !== 'object') return false
      if (data.hosts) {
        if (!Array.isArray(data.hosts)) return false
        for (const h of data.hosts) {
          if (!h.id || !h.name) return false
        }
      }
      if (data.groups) {
        if (!Array.isArray(data.groups)) return false
        for (const g of data.groups) {
          if (g.name === undefined) return false
        }
      }
      if (data.hosts) this.hosts = data.hosts
      if (data.groups) this.groups = data.groups
      this.saveHosts()
      this.saveGroups()
      return true
    } catch { return false }
  }
}
