/**
 * Host+ 终端装饰器
 * 功能描述：在终端注入入口按钮（浮动或工具栏），管理浮动面板的创建/销毁/最小化/恢复
 */
import { Injectable, Injector, ComponentFactoryResolver, ApplicationRef, NgZone } from '@angular/core'
import { TerminalDecorator } from 'tabby-terminal'
import { HostFloatingPanel } from './host-floating-panel.component'
import { HostDataService, PortForwardRule, OfficialSSHHost } from './host-data.service'
import { HostI18nService } from './host-i18n.service'
import { AppService, ProfilesService, ConfigService } from 'tabby-core'

/** 构造 SSH Profile：密码 / 私钥二选一 */
function buildSSHPartialProfile (
  sshHost: string,
  port: number,
  user: string,
  password: string,
  privateKeyPath: string,
  forwardedPorts: PortForwardRule[],
  skipBanner: boolean,
  reuseSession: boolean,
): any {
  const options: any = {
    host: sshHost,
    port,
    user,
    forwardedPorts: forwardedPorts || [],
    skipBanner: !!skipBanner,
    reuseSession: !!reuseSession,
  }
  if (privateKeyPath) {
    options.auth = 'publicKey'
    options.privateKeys = [privateKeyPath]
  } else {
    options.auth = password ? 'password' : null
    options.password = password || undefined
  }
  return {
    type: 'ssh',
    name: sshHost,
    options,
  }
}

/** 读取 Tabby 官方 SSH Profile，归一化为 Host+ 可写入的数据 */
async function loadOfficialSSHHosts (injector: Injector): Promise<OfficialSSHHost[]> {
  const profilesService = injector.get(ProfilesService)
  const configService = injector.get(ConfigService)
  const profiles = await profilesService.getProfiles()
  const groups = (configService.store?.groups || configService.store?.profileGroups || []) as any[]
  const groupNames = new Map<string, string>()
  for (const group of groups) {
    if (group && group.id) groupNames.set(group.id, group.name || '')
  }

  const result: OfficialSSHHost[] = []
  for (const profile of profiles) {
    if (!profile || profile.type !== 'ssh') continue
    const options = profile.options || {}
    const host = options.host || ''
    if (!host) continue

    const port = +(options.port || 22)
    const username = options.user || ''
    const privateKeys = Array.isArray(options.privateKeys) ? options.privateKeys : []
    const authType: 'password' | 'publicKey' =
      options.auth === 'publicKey' && privateKeys.length > 0 ? 'publicKey' : 'password'
    const groupId = profile.group || ''
    const groupName = groupId
      ? (groupNames.get(groupId) || (groups.find(g => g.name === groupId)?.name || ''))
      : ''
    const forwardedPorts: PortForwardRule[] = (Array.isArray(options.forwardedPorts) ? options.forwardedPorts : [])
      .map((fw: any): PortForwardRule => ({
        type: fw.type === 'Remote' ? 'Remote' : fw.type === 'Dynamic' ? 'Dynamic' : 'Local',
        host: fw.host || '127.0.0.1',
        port: +fw.port || 0,
        targetAddress: fw.targetAddress || '',
        targetPort: +fw.targetPort || 0,
        description: fw.description || '',
      }))

    result.push({
      id: profile.id || `${host}:${port}:${username}`,
      name: profile.name || (username ? `${username}@${host}` : host),
      host,
      port,
      username,
      authType,
      privateKeyPath: authType === 'publicKey' ? String(privateKeys[0] || '') : '',
      forwardedPorts,
      groupName,
    })
  }
  return result
}

@Injectable()
export class HostTerminalDecorator extends TerminalDecorator {
  /** 所有活跃终端入口的 rebuild 回调，供设置面板直接触发 */
  static rebuildRegistry = new Set<() => void>()

  constructor(
    private resolver: ComponentFactoryResolver,
    private appRef: ApplicationRef,
    private zone: NgZone,
    private injector: Injector,
  ) {
    super()
    this.applySavedTheme()
    console.log('[Host+] Decorator ready')
  }

  private applySavedTheme(): void {
    try {
      const root = document.documentElement
      const savedFontSize = localStorage.getItem('hp-font-size')
      if (savedFontSize && !root.style.getPropertyValue('--hp-font-size')) {
        root.style.setProperty('--hp-font-size', savedFontSize + 'px')
      }

      const theme = localStorage.getItem('hp-theme')
      if (!theme || theme === '') return

      const keys = ['primary', 'bg', 'text', 'border', 'surface', 'hover', 'input-bg', 'text-muted']
      let applied = false
      for (const k of keys) {
        const val = localStorage.getItem(`hp-color-${k}`)
        if (val && !root.style.getPropertyValue(`--hp-${k}`)) {
          root.style.setProperty(`--hp-${k}`, val)
          applied = true
        }
      }
      if (applied) console.log('[Host+] Color theme applied')
    } catch { /* ignore */ }
  }

  override attach(terminal: any): void {
    super.attach(terminal)
    console.log('[Host+] attach called')

    const entryI18n = new HostI18nService()
    const hpSvc = new HostDataService()

    const tryInsert = (): boolean => {
      try {
        const hostEl = terminal?.element?.nativeElement as HTMLElement | null
        if (!hostEl) return false

        if (hostEl.querySelector('[data-hp-entry="1"]')) return true

        const ssh = terminal?.sshSession ?? terminal?._session ?? null
        let profileId = terminal?.profile?.id || ''
        if (!profileId && ssh?.host) {
          profileId = 'ssh:' + ssh.host
        }

        this.buildEntry(hostEl, terminal, ssh, profileId, entryI18n, hpSvc)
        this.listenEntryModeChange(hostEl)

        console.log('[Host+] Entry button injected')

        // 从首页按钮触发的自动打开面板
        if (sessionStorage.getItem('hp-auto-open') === '1') {
          sessionStorage.removeItem('hp-auto-open')
          // 等待工具栏按钮完全渲染后自动点击
          setTimeout(() => {
            const entry = hostEl.querySelector('[data-hp-entry="1"]') as HTMLElement | null
            if (entry) entry.click()
          }, 600)
        }

        return true
      } catch (err) {
        console.warn('[Host+] tryInsert error', err)
        return false
      }
    }

    let attempts = 0
    const timer = setInterval(() => {
      attempts++
      if (tryInsert() || attempts > 20) {
        clearInterval(timer)
        if (attempts > 20) console.log('[Host+] No terminal found after 20 attempts')
      }
    }, 500)
    this.subscribeUntilDetached(terminal, { unsubscribe: () => clearInterval(timer) })
  }

  private buildEntry(hostEl: HTMLElement, terminal: any, ssh: any, profileId: string, i18n: HostI18nService, hpSvc: HostDataService): void {
    const entryMode: 'floating' | 'toolbar' = hpSvc.getEntryMode()
    let entry: HTMLElement

    if (entryMode === 'toolbar') {
      entry = this.createToolbarEntry(hostEl, i18n)
    } else {
      entry = this.createFloatingEntry(hostEl, hpSvc, profileId, i18n)
      this.setupFloatingDrag(entry, hostEl, hpSvc, profileId)
    }

    if (!entry) return
    entry.setAttribute('data-hp-entry', '1')

    this.setupEntryClick(entry, hostEl, terminal, i18n, entryMode)

    ;(hostEl as any).__hpEntry = entry
    ;(hostEl as any).__hpTerminal = terminal
    ;(hostEl as any).__hpProfileId = profileId
    this.setupSSHDisconnect(entry, terminal, ssh, i18n)
  }

  private listenEntryModeChange(hostEl: HTMLElement): void {
    if ((hostEl as any).__hpModeListener) return

    const rebuild = () => {
      const oldEntry = (hostEl as any).__hpEntry as HTMLElement | null
      if (oldEntry) {
        oldEntry.remove()
        delete (hostEl as any).__hpEntry
      }
      if ((hostEl as any).__hpPanelOpen) this.closePanel(hostEl)
      const terminal = (hostEl as any).__hpTerminal
      const ssh = terminal?.sshSession ?? terminal?._session ?? null
      let profileId = terminal?.profile?.id || ''
      if (!profileId && ssh?.host) profileId = 'ssh:' + ssh.host
      this.buildEntry(hostEl, terminal, ssh, profileId, new HostI18nService(), new HostDataService())
    }

    window.addEventListener('hp-entry-mode-changed', rebuild)
    hostEl.addEventListener('hp-mode-change', rebuild)
    HostTerminalDecorator.rebuildRegistry.add(rebuild)

    ;(hostEl as any).__hpModeListener = true
    ;(hostEl as any).__hpRebuildFn = rebuild

    const terminal = (hostEl as any).__hpTerminal
    if (terminal) {
      this.subscribeUntilDetached(terminal, {
        unsubscribe: () => {
          window.removeEventListener('hp-entry-mode-changed', rebuild)
          hostEl.removeEventListener('hp-mode-change', rebuild)
          HostTerminalDecorator.rebuildRegistry.delete(rebuild)
          delete (hostEl as any).__hpModeListener
          delete (hostEl as any).__hpRebuildFn
        }
      })
    }
  }

  static rebuildAll(): void {
    for (const fn of HostTerminalDecorator.rebuildRegistry) {
      try { fn() } catch {}
    }
  }

  private createFloatingEntry(hostEl: HTMLElement, hpSvc: HostDataService, profileId: string, i18n: HostI18nService): HTMLElement | null {
    const entry = document.createElement('div')
    entry.style.cssText = `
      position: absolute; z-index: 99997;
      cursor: move; user-select: none;
      display: flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 6px;
      background: var(--hp-surface, #45475a);
      border: 0.5px solid var(--hp-primary, #b4befe);
      font-size: var(--hp-font-size, 12px); color: var(--hp-primary, #b4befe);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.4;
      pointer-events: auto;
      transition: opacity 0.2s;
      opacity: 0.85;
    `
    entry.title = i18n.t('entry.title')
    entry.innerHTML = '@&nbsp;Host+ <span style="color:var(--hp-text-muted,#6c7086);font-size:calc(var(--hp-font-size,14px) - 1px);">&#x22EE;&#x22EE;</span>'

    const mem = profileId ? hpSvc.getPositionMemory(profileId) : null
    if (mem) {
      entry.style.left = mem.entryX + 'px'
      entry.style.top = mem.entryY + 'px'
    } else {
      const savedPos = hpSvc.getEntryPosition()
      const isDefault = savedPos.x === 20 && savedPos.y === 60
      if (isDefault) {
        entry.style.top = '60px'
        entry.style.right = '16px'
      } else {
        entry.style.left = savedPos.x + 'px'
        entry.style.top = savedPos.y + 'px'
      }
    }

    entry.addEventListener('mouseenter', () => { entry.style.opacity = '1' })
    entry.addEventListener('mouseleave', () => { entry.style.opacity = '0.85' })

    hostEl.style.position = 'relative'
    hostEl.appendChild(entry)
    return entry
  }

  private createToolbarEntry(hostEl: HTMLElement, i18n: HostI18nService): HTMLElement | null {
    const toolbar =
      hostEl.querySelector('.terminal-toolbar') ??
      hostEl.querySelector('terminal-toolbar') ??
      hostEl.querySelector('.btn-toolbar')

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn btn-sm btn-link me-2'
    btn.setAttribute('data-hp-entry', '1')
    btn.innerHTML = '@&nbsp;Host+'
    btn.title = i18n.t('entry.title')
    btn.style.pointerEvents = 'auto'

    if (toolbar) {
      btn.style.position = 'relative'
      btn.style.zIndex = '10'

      const allButtons = Array.from(toolbar.querySelectorAll('button'))
      const reconnectButton = allButtons.find(b => /reconnect|переподключ/i.test(`${b.textContent ?? ''} ${b.title ?? ''}`))
      if (reconnectButton?.parentElement) {
        reconnectButton.parentElement.insertBefore(btn, reconnectButton.nextSibling)
      } else {
        toolbar.appendChild(btn)
      }
    } else {
      hostEl.style.position = 'relative'

      // 无工具栏时放入共享 flex 容器，两个插件自然并排
      let container = hostEl.querySelector('[data-plugin-btns]') as HTMLElement | null
      if (!container) {
        container = document.createElement('div')
        container.setAttribute('data-plugin-btns', '1')
        container.style.cssText = 'position:absolute;top:8px;right:8px;z-index:99997;display:flex;gap:4px;'
        hostEl.appendChild(container)
      }

      btn.style.position = 'static'
      btn.style.border = '0.5px solid var(--hp-primary, #b4befe)'
      btn.style.borderRadius = '6px'
      btn.style.padding = '3px 8px'
      btn.style.background = 'var(--hp-surface, #45475a)'
      btn.style.color = 'var(--hp-primary, #b4befe)'
      btn.style.fontSize = 'var(--hp-font-size, 12px)'
      btn.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      btn.style.lineHeight = '1.4'
      btn.style.cursor = 'pointer'
      btn.style.opacity = '0.85'
      btn.style.transition = 'opacity 0.2s'
      btn.addEventListener('mouseenter', () => { btn.style.opacity = '1' })
      btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.85' })

      container.appendChild(btn)
    }

    return btn
  }

  private setupFloatingDrag(entry: HTMLElement, hostEl: HTMLElement, hpSvc: HostDataService, profileId: string): void {
    (entry as any).__hpWasDrag = false

    entry.addEventListener('mousedown', (ev: MouseEvent) => {
      ev.stopPropagation()
      ;(entry as any).__hpWasDrag = false
    })

    let dragging = false
    let offsetX = 0, offsetY = 0
    let entryStartX = 0, entryStartY = 0

    entry.addEventListener('mousedown', (ev: MouseEvent) => {
      if (ev.button !== 0) return
      const rect = entry.getBoundingClientRect()
      const hr = hostEl.getBoundingClientRect()
      offsetX = ev.clientX - rect.left
      offsetY = ev.clientY - rect.top
      entryStartX = ev.clientX
      entryStartY = ev.clientY
      dragging = false

      const onMove = (me: MouseEvent) => {
        me.preventDefault()
        if (Math.abs(me.clientX - entryStartX) > 4 || Math.abs(me.clientY - entryStartY) > 4) {
          dragging = true
          ;(entry as any).__hpWasDrag = true
        }
        if (!dragging) return
        let nl = me.clientX - hr.left - offsetX
        let nt = me.clientY - hr.top - offsetY
        const ew = entry.offsetWidth, eh = entry.offsetHeight
        nl = Math.max(0, Math.min(nl, hostEl.clientWidth - ew))
        nt = Math.max(0, Math.min(nt, hostEl.clientHeight - eh))
        entry.style.top = nt + 'px'
        entry.style.right = 'auto'
        entry.style.left = nl + 'px'
        me.stopPropagation()
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        if (dragging) {
          const x = parseInt(entry.style.left) || 0
          const y = parseInt(entry.style.top) || 0
          if (profileId && hpSvc.hasPositionMemory(profileId)) {
            hpSvc.savePositionMemory(profileId, { entryX: x, entryY: y })
          } else {
            hpSvc.saveEntryPosition({ x, y })
          }
        }
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
  }

  private setupEntryClick(entry: HTMLElement, hostEl: HTMLElement, terminal: any, i18n: HostI18nService, entryMode: string): void {
    const isButton = entry.tagName === 'BUTTON'
    entry.addEventListener('click', (ev: MouseEvent) => {
      ev.preventDefault()
      ev.stopPropagation()
      if ((entry as any).__hpWasDrag) {
        ;(entry as any).__hpWasDrag = false
        return
      }
      const ssh = terminal?.sshSession ?? terminal?._session ?? null
      if (ssh && (ssh.open === false || ssh.closed)) {
        entry.style.opacity = '0.3'
        if (isButton) (entry as HTMLButtonElement).disabled = true
        entry.title = i18n.t('entry.disconnected')
        return
      }
      this.togglePanel(hostEl)
    })
  }

  private setupSSHDisconnect(entry: HTMLElement, terminal: any, ssh: any, i18n: HostI18nService): void {
    if (!ssh) return
    const isButton = entry.tagName === 'BUTTON'
    const markDisconnected = () => {
      entry.style.opacity = '0.3'
      entry.style.cursor = 'not-allowed'
      if (isButton) (entry as HTMLButtonElement).disabled = true
      entry.title = i18n.t('entry.disconnected')
    }
    try {
      if (ssh?.closed$) {
        const sub = ssh.closed$.subscribe(markDisconnected)
        this.subscribeUntilDetached(terminal, { unsubscribe: () => { try { sub.unsubscribe() } catch {} } })
      } else if (typeof ssh?.closed?.then === 'function') {
        ssh.closed.then(markDisconnected).catch(() => {})
      }
    } catch { /* ignore */ }
  }

  private togglePanel(hostEl: HTMLElement): void {
    if ((hostEl as any).__hpPanelOpen && (hostEl as any).__hpMinimized) {
      this.restorePanel(hostEl)
      return
    }
    if ((hostEl as any).__hpPanelOpen) {
      this.closePanel(hostEl)
      return
    }

    this.zone.run(() => {
      try {
        const panelHost = document.createElement('div')
        panelHost.setAttribute('data-hp-panel-host', '1')
        hostEl.appendChild(panelHost)
        ;(hostEl as any).__hpPanelHost = panelHost
        ;(hostEl as any).__hpPanelOpen = true
        ;(hostEl as any).__hpMinimized = false

        const factory = this.resolver.resolveComponentFactory(HostFloatingPanel)
        const cmpRef = factory.create(this.injector, [], panelHost)
        const cmp = cmpRef.instance
        ;(hostEl as any).__hpCmpRef = cmpRef

        cmp.terminalRef = (hostEl as any).__hpTerminal
        cmp.profileId = (hostEl as any).__hpProfileId || ''

        this.positionPanelNearEntry(hostEl, cmp)

        cmp.onClose = () => {
          this.zone.run(() => { this.closePanel(hostEl) })
        }
        cmp.onMinimize = () => {
          this.zone.run(() => {
            const ph = (hostEl as any).__hpPanelHost as HTMLElement
            if (ph) ph.style.display = 'none'
            ;(hostEl as any).__hpMinimized = true
            cmp.minimized = true
          })
        }

        // 注入 Tabby 原生 SSH 连接能力（通过 ProfilesService 打开 SSH 标签页）
        const tryNativeSSH = (sshHost: string, port: number, user: string, password: string, privateKeyPath: string, forwardedPorts: PortForwardRule[], skipBanner: boolean, reuseSession: boolean): boolean => {
          const partialProfile = buildSSHPartialProfile(sshHost, port, user, password, privateKeyPath, forwardedPorts, skipBanner, reuseSession)

          // 路径 1：ProfilesService.openNewTabForProfile（Tabby 原生方式）
          try {
            const profilesService = this.injector.get(ProfilesService)
            if (profilesService?.openNewTabForProfile) {
              profilesService.openNewTabForProfile(partialProfile)
              console.log('[Host+] Native SSH via ProfilesService')
              return true
            }
          } catch (e1) { /* continue */ }

          // 路径 2：quickConnect（Tabby 快速连接 API，不支持私钥，私钥模式下跳过）
          try {
            const profilesService = this.injector.get(ProfilesService)
            if (!privateKeyPath && !(forwardedPorts && forwardedPorts.length) && profilesService?.quickConnect) {
              const query = port !== 22 ? `${user}@${sshHost}:${port}` : `${user}@${sshHost}`
              profilesService.quickConnect(query)
              console.log('[Host+] Native SSH via quickConnect:', query)
              return true
            }
          } catch (e2) { /* continue */ }

          // 路径 3：AppService.openNewTab（旧版兼容）
          try {
            const appService = this.injector.get(AppService)
            if (appService?.openNewTab) {
              const profilesService = this.injector.get(ProfilesService)
              profilesService.newTabParametersForProfile(partialProfile).then((params: any) => {
                if (params) {
                  appService.openNewTab(params)
                  console.log('[Host+] Native SSH via AppService + newTabParametersForProfile')
                }
              })
              return true
            }
          } catch (e3) { /* continue */ }

          // 路径 4：扫描 injector 层级
          try {
            let inj: any = this.injector
            while (inj) {
              if (typeof inj.get === 'function') {
                try {
                  const records = inj._records || inj.records || {}
                  for (const token of Object.values(records) as any[]) {
                    try {
                      const svc = inj.get(token.token || token)
                      if (svc && typeof svc.openNewTabForProfile === 'function') {
                        svc.openNewTabForProfile(partialProfile)
                        console.log('[Host+] Native SSH via injector scan')
                        return true
                      }
                    } catch {}
                  }
                } catch {}
              }
              inj = inj.parent
            }
          } catch (e4) { /* continue */ }

          return false
        }
        cmp.openSSHTab = tryNativeSSH
        cmp.syncOfficialHostsProvider = () => loadOfficialSSHHosts(this.injector)

        this.appRef.attachView(cmpRef.hostView)
        cmpRef.changeDetectorRef.detectChanges()

        cmp.applyPositionMemory()
        cmpRef.changeDetectorRef.detectChanges()

        panelHost.addEventListener('mousedown', (ev: MouseEvent) => ev.stopPropagation())
        panelHost.addEventListener('click', (ev: MouseEvent) => ev.stopPropagation())

        console.log('[Host+] Panel opened')
      } catch (e) {
        console.error('[Host+] Panel error', e)
      }
    })
  }

  private positionPanelNearEntry(hostEl: HTMLElement, cmp: HostFloatingPanel): void {
    const entry = (hostEl as any).__hpEntry as HTMLElement
    if (!entry) return

    const hostRect = hostEl.getBoundingClientRect()
    const entryRect = entry.getBoundingClientRect()

    const entryLeft = entryRect.left - hostRect.left
    const entryTop = entryRect.top - hostRect.top
    const entryW = entryRect.width
    const entryH = entryRect.height

    const hostW = hostEl.clientWidth
    const hostH = hostEl.clientHeight
    const panelW = 380
    const panelH = 420
    const gap = 4

    let px: number, py: number

    if (entryLeft + entryW / 2 < hostW / 2) {
      px = entryLeft + entryW + gap
    } else {
      px = entryLeft - panelW - gap
    }

    if (entryTop + entryH / 2 < hostH / 2) {
      py = entryTop
    } else {
      py = entryTop - panelH + entryH
    }

    px = Math.max(4, Math.min(px, hostW - panelW - 4))
    py = Math.max(4, Math.min(py, hostH - panelH - 4))

    cmp.panelX = Math.round(px)
    cmp.panelY = Math.round(py)
  }

  private closePanel(hostEl: HTMLElement): void {
    try {
      const cmpRef = (hostEl as any).__hpCmpRef
      if (cmpRef) { try { cmpRef.destroy() } catch {} }
      const ph = (hostEl as any).__hpPanelHost as HTMLElement
      if (ph) { try { ph.remove() } catch {} }
    } catch {}
    delete (hostEl as any).__hpPanelOpen
    delete (hostEl as any).__hpMinimized
    delete (hostEl as any).__hpPanelHost
    delete (hostEl as any).__hpCmpRef
  }

  private restorePanel(hostEl: HTMLElement): void {
    const ph = (hostEl as any).__hpPanelHost as HTMLElement
    const cmpRef = (hostEl as any).__hpCmpRef as any
    if (ph) {
      ph.style.display = ''
      ;(hostEl as any).__hpMinimized = false
      if (cmpRef?.instance) {
        cmpRef.instance.minimized = false
        this.positionPanelNearEntry(hostEl, cmpRef.instance)
      }
    }
  }

  /** 静态方法：在无终端的情况下独立弹出主机管理面板（用于首页按钮） */
  static openStandalonePanel(injector: Injector): void {
    // 防止重复弹出
    if (document.querySelector('[data-hp-standalone]')) return

    const resolver = injector.get(ComponentFactoryResolver)
    const appRef = injector.get(ApplicationRef)
    const zone = injector.get(NgZone)

    zone.run(() => {
      try {
        // 半透明遮罩
        const backdrop = document.createElement('div')
        backdrop.setAttribute('data-hp-standalone', 'backdrop')
        backdrop.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.35);'
        backdrop.addEventListener('click', () => {
          HostTerminalDecorator.closeStandalonePanel()
        })
        document.body.appendChild(backdrop)

        // 面板容器
        const panelHost = document.createElement('div')
        panelHost.setAttribute('data-hp-standalone', 'panel')
        panelHost.style.cssText = 'position:fixed;z-index:99999;'
        document.body.appendChild(panelHost)

        const factory = resolver.resolveComponentFactory(HostFloatingPanel)
        const cmpRef = factory.create(injector, [], panelHost)
        const cmp = cmpRef.instance

        // 面板居中
        const pw = cmp.panelWidth || 380
        cmp.panelX = Math.round((window.innerWidth - pw) / 2)
        cmp.panelY = Math.round((window.innerHeight - 420) / 2)
        cmp.terminalRef = null
        cmp.profileId = 'standalone'

        // SSH 连接回调
        cmp.openSSHTab = (sshHost: string, port: number, user: string, password: string, privateKeyPath: string, forwardedPorts: PortForwardRule[], skipBanner: boolean, reuseSession: boolean): boolean => {
          const partialProfile = buildSSHPartialProfile(sshHost, port, user, password, privateKeyPath, forwardedPorts, skipBanner, reuseSession)
          try {
            const ps = injector.get(ProfilesService)
            if (ps?.openNewTabForProfile) {
              ps.openNewTabForProfile(partialProfile)
              return true
            }
          } catch {}
          try {
            const ps = injector.get(ProfilesService)
            if (!privateKeyPath && !(forwardedPorts && forwardedPorts.length) && ps?.quickConnect) {
              const query = port !== 22 ? `${user}@${sshHost}:${port}` : `${user}@${sshHost}`
              ps.quickConnect(query)
              return true
            }
          } catch {}
          return false
        }

        cmp.syncOfficialHostsProvider = () => loadOfficialSSHHosts(injector)

        cmp.onClose = () => {
          HostTerminalDecorator.closeStandalonePanel()
        }

        appRef.attachView(cmpRef.hostView)
        cmpRef.changeDetectorRef.detectChanges()
        cmp.applyPositionMemory()
        cmpRef.changeDetectorRef.detectChanges()

        // 阻止面板内鼠标事件冒泡到遮罩
        panelHost.addEventListener('mousedown', (ev: MouseEvent) => ev.stopPropagation())
        panelHost.addEventListener('click', (ev: MouseEvent) => ev.stopPropagation())

        console.log('[Host+] Standalone panel opened')
      } catch (e) {
        console.error('[Host+] Standalone panel error', e)
      }
    })
  }

  /** 关闭独立面板 */
  static closeStandalonePanel(): void {
    try {
      const backdrops = document.querySelectorAll('[data-hp-standalone="backdrop"]')
      backdrops.forEach(b => b.remove())
      const panels = document.querySelectorAll('[data-hp-standalone="panel"]')
      panels.forEach(p => {
        // 销毁 Angular 组件（如果有的话）
        p.remove()
      })
    } catch {}
  }
}

;(window as any).__hpRebuildEntry = () => HostTerminalDecorator.rebuildAll()
