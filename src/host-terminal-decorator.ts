/**
 * Host+ 终端装饰器
 * 功能描述：在终端注入入口按钮（浮动或工具栏），管理浮动面板的创建/销毁/最小化/恢复
 */
import { Injectable, Injector, ComponentFactoryResolver, ApplicationRef, NgZone } from '@angular/core'
import { TerminalDecorator } from 'tabby-terminal'
import { HostFloatingPanel } from './host-floating-panel.component'
import { HostDataService } from './host-data.service'
import { HostI18nService } from './host-i18n.service'

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
      const savedFontSize = localStorage.getItem('hp-font-size') || localStorage.getItem('qc-plus-font-size')
      if (savedFontSize && !root.style.getPropertyValue('--qc-font-size')) {
        root.style.setProperty('--qc-font-size', savedFontSize + 'px')
      }

      const theme = localStorage.getItem('hp-theme') || localStorage.getItem('qc-plus-theme')
      if (!theme || theme === '') return

      const keys = ['primary', 'bg', 'text', 'border', 'surface', 'hover', 'input-bg', 'text-muted']
      let applied = false
      for (const k of keys) {
        const val = localStorage.getItem(`hp-color-${k}`) || localStorage.getItem(`qc-plus-color-${k}`)
        if (val && !root.style.getPropertyValue(`--qc-${k}`)) {
          root.style.setProperty(`--qc-${k}`, val)
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
      background: var(--qc-surface, #45475a);
      border: 0.5px solid var(--qc-primary, #b4befe);
      font-size: var(--qc-font-size, 12px); color: var(--qc-primary, #b4befe);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.4;
      pointer-events: auto;
      transition: opacity 0.2s;
      opacity: 0.85;
    `
    entry.title = i18n.t('entry.title')
    entry.innerHTML = '&#x1F5A5;&nbsp;Host+ <span style="color:var(--qc-text-muted,#6c7086);font-size:calc(var(--qc-font-size,14px) - 1px);">&#x22EE;&#x22EE;</span>'

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
    btn.innerHTML = '&#x1F5A5;&nbsp;Host+'
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
      btn.style.position = 'absolute'
      btn.style.top = '8px'
      btn.style.right = '8px'
      btn.style.zIndex = '99997'
      btn.style.border = '0.5px solid var(--qc-primary, #b4befe)'
      btn.style.borderRadius = '6px'
      btn.style.padding = '3px 8px'
      btn.style.background = 'var(--qc-surface, #45475a)'
      btn.style.color = 'var(--qc-primary, #b4befe)'
      btn.style.fontSize = 'var(--qc-font-size, 12px)'
      btn.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      btn.style.lineHeight = '1.4'
      btn.style.cursor = 'pointer'
      btn.style.opacity = '0.85'
      btn.style.transition = 'opacity 0.2s'
      btn.addEventListener('mouseenter', () => { btn.style.opacity = '1' })
      btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.85' })

      hostEl.style.position = 'relative'
      hostEl.appendChild(btn)
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
}

;(window as any).__hpRebuildEntry = () => HostTerminalDecorator.rebuildAll()
