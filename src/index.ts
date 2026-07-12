/**
 * Host+ 插件入口
 * 功能描述：注册 TerminalDecorator（浮动入口）+ 浮动面板 + 设置页
 */
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgModule } from '@angular/core'
import TabbyCoreModule from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import { TerminalDecorator } from 'tabby-terminal'

import { HostTerminalDecorator } from './host-terminal-decorator'
import { HostFloatingPanel } from './host-floating-panel.component'
import { HostSettingsTabProvider, HostSettingsComponent } from './host-settings.component'

/** 启动时应用已保存的颜色主题（Host+ 独立 --hp-* 变量体系，不与 QuickCmd+ 共用） */
function applySavedTheme(): void {
  try {
    const theme = localStorage.getItem('hp-theme')
    const root = document.documentElement

    const presets: Record<string, Record<string, string>> = {
      'acrylic-light': { '--hp-primary':'#4f7dff','--hp-primary-rgb':'79,125,255','--hp-bg':'rgba(213,213,216,0.96)','--hp-bg-rgb':'213,213,216','--hp-text':'#162234','--hp-text-secondary':'#607188','--hp-text-muted':'#8c97ab','--hp-group-name':'#4a6080','--hp-border':'rgba(255,255,255,0.28)','--hp-surface':'rgba(255,255,255,0.34)','--hp-surface-rgb':'255,255,255','--hp-hover':'rgba(255,255,255,0.24)','--hp-input-bg':'rgba(255,255,255,0.52)','--hp-blur':'28px','--hp-saturate':'180%','--hp-shadow':'0 10px 38px rgba(0,0,0,0.16)' },
      'acrylic-dark':  { '--hp-primary':'#5b8def','--hp-primary-rgb':'91,141,239','--hp-bg':'rgba(20,20,20,0.52)','--hp-bg-rgb':'20,20,20','--hp-text':'#e8e8e8','--hp-text-secondary':'#b2b2b2','--hp-text-muted':'#8f8f8f','--hp-group-name':'#b2b2b2','--hp-border':'rgba(255,255,255,0.10)','--hp-surface':'rgba(45,45,45,0.42)','--hp-surface-rgb':'45,45,45','--hp-hover':'rgba(255,255,255,0.06)','--hp-input-bg':'rgba(255,255,255,0.08)','--hp-blur':'30px','--hp-saturate':'145%','--hp-shadow':'0 10px 38px rgba(0,0,0,0.40)' },
      'ocean':  { '--hp-primary':'#22d3ee','--hp-primary-rgb':'34,211,238','--hp-bg':'rgba(8,24,48,0.60)','--hp-bg-rgb':'8,24,48','--hp-text':'#e0f0ff','--hp-text-secondary':'#90b8e0','--hp-text-muted':'#5888b8','--hp-group-name':'#90b8e0','--hp-border':'rgba(100,180,240,0.14)','--hp-surface':'rgba(20,50,90,0.35)','--hp-surface-rgb':'20,50,90','--hp-hover':'rgba(100,160,220,0.08)','--hp-input-bg':'rgba(10,30,60,0.50)','--hp-blur':'26px','--hp-saturate':'170%','--hp-shadow':'0 10px 38px rgba(0,40,80,0.40)' },
      'forest': { '--hp-primary':'#34d399','--hp-primary-rgb':'52,211,153','--hp-bg':'rgba(8,28,16,0.58)','--hp-bg-rgb':'8,28,16','--hp-text':'#d8f8e0','--hp-text-secondary':'#80c898','--hp-text-muted':'#509868','--hp-group-name':'#80c898','--hp-border':'rgba(80,180,120,0.12)','--hp-surface':'rgba(16,50,28,0.35)','--hp-surface-rgb':'16,50,28','--hp-hover':'rgba(80,160,100,0.08)','--hp-input-bg':'rgba(8,30,16,0.48)','--hp-blur':'26px','--hp-saturate':'155%','--hp-shadow':'0 10px 38px rgba(0,30,10,0.40)' },
      'sunset': { '--hp-primary':'#fb923c','--hp-primary-rgb':'251,146,60','--hp-bg':'rgba(40,16,8,0.62)','--hp-bg-rgb':'40,16,8','--hp-text':'#ffe8d8','--hp-text-secondary':'#d0a088','--hp-text-muted':'#a07058','--hp-group-name':'#d0a088','--hp-border':'rgba(200,120,80,0.14)','--hp-surface':'rgba(60,24,12,0.38)','--hp-surface-rgb':'60,24,12','--hp-hover':'rgba(200,100,60,0.08)','--hp-input-bg':'rgba(30,10,4,0.50)','--hp-blur':'24px','--hp-saturate':'150%','--hp-shadow':'0 10px 38px rgba(40,10,0,0.40)' },
      'lavender': { '--hp-primary':'#a78bfa','--hp-primary-rgb':'167,139,250','--hp-bg':'rgba(22,14,36,0.58)','--hp-bg-rgb':'22,14,36','--hp-text':'#ece0fc','--hp-text-secondary':'#b098d0','--hp-text-muted':'#7a60a8','--hp-group-name':'#b098d0','--hp-border':'rgba(150,120,210,0.14)','--hp-surface':'rgba(36,22,58,0.38)','--hp-surface-rgb':'36,22,58','--hp-hover':'rgba(140,100,200,0.08)','--hp-input-bg':'rgba(18,10,30,0.50)','--hp-blur':'28px','--hp-saturate':'160%','--hp-shadow':'0 10px 38px rgba(20,10,30,0.40)' },
    }

    if (theme && presets[theme]) {
      const p = presets[theme]
      for (const [k, v] of Object.entries(p)) {
        root.style.setProperty(k, v)
      }
      console.log('[Host+] Preset theme applied:', theme)
      return
    }

    if (theme === 'custom') {
      const keys = [
        'primary','primary-rgb','bg','bg-rgb',
        'text','text-secondary','text-muted','group-name',
        'border','surface','surface-rgb',
        'hover','input-bg','blur','saturate','shadow'
      ]
      let applied = false
      for (const k of keys) {
        const val = localStorage.getItem(`hp-color-${k}`)
        if (val) { root.style.setProperty(`--hp-${k}`, val); applied = true }
      }
      if (applied) console.log('[Host+] Custom glass theme applied')
      return
    }

    const allVars = [
      '--hp-primary','--hp-primary-rgb','--hp-bg','--hp-bg-rgb',
      '--hp-text','--hp-text-secondary','--hp-text-muted','--hp-group-name',
      '--hp-border','--hp-surface','--hp-surface-rgb',
      '--hp-hover','--hp-input-bg','--hp-blur','--hp-saturate','--hp-shadow'
    ]
    allVars.forEach(v => root.style.removeProperty(v))
  } catch { /* ignore */ }
}
applySavedTheme()

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TabbyCoreModule,
  ],
  declarations: [
    HostFloatingPanel,
    HostSettingsComponent,
  ],
  providers: [
    { provide: TerminalDecorator, useClass: HostTerminalDecorator, multi: true },
    { provide: SettingsTabProvider, useClass: HostSettingsTabProvider, multi: true },
  ],
})
export default class HostPlusModule {
  constructor() {
    console.log('[Host+] Module loaded OK')
  }
}
