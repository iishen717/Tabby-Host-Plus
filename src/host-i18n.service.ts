/**
 * Host+ 国际化服务
 * 五级回退语言检测 + 中英双语翻译
 */
const translations: Record<string, Record<string, string>> = {
  'zh-CN': {
    'app.name': 'Host+',
    'app.title': 'SSH 主机管理',
    'app.search': '搜索主机...',
    'app.ungrouped': '未分组',
    'app.noresults': '没有匹配的主机',
    'app.pinned': '常用',
    'app.all_groups': '全部分组',

    'entry.title': 'Host+ — 拖拽移动，点击打开面板',
    'entry.disconnected': 'SSH 已断开',

    'panel.minimize': '最小化',
    'panel.close': '关闭',
    'panel.restore': '恢复面板',
    'panel.add': '新建主机',
    'panel.edit': '编辑',
    'panel.delete': '删除',
    'panel.delete_confirm': '确定删除 "{name}" 吗？',
    'panel.pin': '固定在快捷入口',
    'panel.unpin': '取消固定',
    'panel.hint.search': '搜索或添加新主机',
    'panel.connect': '点击连接',
    'panel.ssh_connect': 'SSH 连接',
    'panel.send_to_line': '发送 SSH 命令',
    'panel.copy': '复制地址',
    'panel.copy_host': '复制主机地址',
    'panel.copy_password': '复制密码',

    'panel.drag_reorder': '拖拽排序',
    'panel.drag_reorder_group': '拖拽排序分组',
    'panel.memory_on': '位置记忆已启用',
    'panel.memory_off': '启用位置记忆',
    'panel.port_forward': '端口转发',

    'pf.title': '端口转发',
    'pf.type': '转发类型',
    'pf.local': '本地转发',
    'pf.remote': '远程转发',
    'pf.dynamic': '动态转发',
    'pf.local_hint': '本地监听端口 → 远端目标',
    'pf.remote_hint': '远端监听端口 → 本地目标',
    'pf.dynamic_hint': '本地监听端口作为 SOCKS 代理',
    'pf.listen_host': '监听地址',
    'pf.listen_port': '监听端口',
    'pf.target_host': '目标地址',
    'pf.target_port': '目标端口',
    'pf.description': '描述（可选）',
    'pf.add': '添加规则',
    'pf.empty': '暂无转发规则',
    'pf.invalid': '请填写完整的地址和有效端口（1-65535）',
    'pf.socks': 'SOCKS 代理',

    'host.name': '名称',
    'host.host': '主机地址',
    'host.ip': 'IP 地址',
    'host.port': '端口',
    'host.username': '用户名',
    'host.password': '密码',
    'host.password_hint': 'SSH 登录密码（不会在主面板显示）',
    'host.auth_type': '认证方式',
    'host.auth_password': '密码',
    'host.auth_key': '私钥',
    'host.private_key': '私钥文件',
    'host.private_key_hint': '只保存路径，不复制私钥内容；加密私钥连接时会提示输入 passphrase。',
    'host.private_key_required': '请选择私钥文件',
    'host.private_key_missing': '私钥文件不存在：{path}',
    'host.browse': '浏览...',
    'host.remark': '备注',
    'host.group': '分组',
    'host.pinned': '固定',
    'host.usage_count': '连接次数',

    'settings.title': 'Host+',
    'settings.add_host': '添加主机',
    'settings.edit_host': '编辑主机',
    'settings.name': '名称',
    'settings.host': '主机地址',
    'settings.ip': 'IP 地址',
    'settings.port': '端口',
    'settings.username': '用户名',
    'settings.remark': '备注',
    'settings.group': '分组',
    'settings.pinned': '固定在快捷入口',
    'settings.usage_count': '连接次数',
    'settings.reset': '重置',
    'settings.save': '保存',
    'settings.cancel': '取消',
    'settings.ok': '确定',
    'settings.delete': '删除',
    'settings.export': '导出',
    'settings.import': '导入',
    'settings.clear': '清空数据',
    'settings.confirm_delete': '确定删除此主机？',
    'settings.confirm_clear': '确定清空所有主机数据？此操作不可撤销！',
    'settings.language': '界面语言',
    'settings.lang_auto': '自动',
    'settings.lang_zh': '中文',
    'settings.lang_en': 'English',
    'settings.data_management': '数据管理',

    'group.add': '新建分组',
    'group.name': '分组名称',
    'group.delete': '删除分组（主机移至未分组）',
    'group.rename': '重命名',
    'group.edit': '修改分组',
    'group.order': '排序',
    'group.manage': '管理分组',
    'group.delete_confirm': '确定删除分组 "{name}" 吗？分组内的主机将移至未分组。',

    'notify.connected': '已发起连接',
    'notify.copied': '地址已复制',
    'notify.import_ok': '导入成功',
    'notify.import_fail': '导入失败：数据格式无效',
    'notify.cleared': '数据已清空',
    'notify.no_ssh': '当前标签页不是 SSH 连接',
    'notify.ssh_command_sent': 'SSH 命令已发送',
  },
  'en-US': {
    'app.name': 'Host+',
    'app.title': 'SSH Host Manager',
    'app.search': 'Search hosts...',
    'app.ungrouped': 'Ungrouped',
    'app.noresults': 'No matching hosts',
    'app.pinned': 'Favorites',
    'app.all_groups': 'All groups',

    'entry.title': 'Host+ — drag to move, click to toggle',
    'entry.disconnected': 'SSH disconnected',

    'panel.minimize': 'Minimize',
    'panel.close': 'Close',
    'panel.restore': 'Restore panel',
    'panel.add': 'New host',
    'panel.edit': 'Edit',
    'panel.delete': 'Delete',
    'panel.delete_confirm': 'Delete "{name}"?',
    'panel.pin': 'Pin to quick entry',
    'panel.unpin': 'Unpin',
    'panel.hint.search': 'Search or add new host',
    'panel.connect': 'Click to connect',
    'panel.ssh_connect': 'SSH Connect',
    'panel.send_to_line': 'Send SSH command',
    'panel.copy': 'Copy address',
    'panel.copy_host': 'Copy host address',
    'panel.copy_password': 'Copy password',

    'panel.drag_reorder': 'Drag to reorder',
    'panel.drag_reorder_group': 'Drag to reorder group',
    'panel.memory_on': 'Position memory ON',
    'panel.memory_off': 'Enable position memory',
    'panel.port_forward': 'Port forwarding',

    'pf.title': 'Port Forwarding',
    'pf.type': 'Forwarding type',
    'pf.local': 'Local',
    'pf.remote': 'Remote',
    'pf.dynamic': 'Dynamic',
    'pf.local_hint': 'Local listening port → remote target',
    'pf.remote_hint': 'Remote listening port → local target',
    'pf.dynamic_hint': 'Local listening port acts as a SOCKS proxy',
    'pf.listen_host': 'Listen address',
    'pf.listen_port': 'Listen port',
    'pf.target_host': 'Target address',
    'pf.target_port': 'Target port',
    'pf.description': 'Description (optional)',
    'pf.add': 'Add rule',
    'pf.empty': 'No forwarding rules',
    'pf.invalid': 'Please fill in valid addresses and ports (1-65535).',
    'pf.socks': 'SOCKS proxy',

    'host.name': 'Name',
    'host.host': 'Host',
    'host.ip': 'IP',
    'host.port': 'Port',
    'host.username': 'User',
    'host.password': 'Password',
    'host.password_hint': 'SSH login password (hidden in main panel)',
    'host.auth_type': 'Authentication',
    'host.auth_password': 'Password',
    'host.auth_key': 'Private Key',
    'host.private_key': 'Private key file',
    'host.private_key_hint': 'Only the path is stored; encrypted keys prompt for a passphrase on connect.',
    'host.private_key_required': 'Please choose a private key file.',
    'host.private_key_missing': 'Private key file not found: {path}',
    'host.browse': 'Browse...',
    'host.remark': 'Remark',
    'host.group': 'Group',
    'host.pinned': 'Pinned',
    'host.usage_count': 'Connections',

    'settings.title': 'Host+',
    'settings.add_host': 'Add Host',
    'settings.edit_host': 'Edit Host',
    'settings.name': 'Name',
    'settings.host': 'Host',
    'settings.ip': 'IP Address',
    'settings.port': 'Port',
    'settings.username': 'Username',
    'settings.remark': 'Remark',
    'settings.group': 'Group',
    'settings.pinned': 'Pin to quick entry',
    'settings.usage_count': 'Connections',
    'settings.reset': 'Reset',
    'settings.save': 'Save',
    'settings.cancel': 'Cancel',
    'settings.ok': 'OK',
    'settings.delete': 'Delete',
    'settings.export': 'Export',
    'settings.import': 'Import',
    'settings.clear': 'Clear all data',
    'settings.confirm_delete': 'Delete this host?',
    'settings.confirm_clear': 'Clear all host data? This cannot be undone!',
    'settings.language': 'Language',
    'settings.lang_auto': 'Auto',
    'settings.lang_zh': '中文',
    'settings.lang_en': 'English',
    'settings.data_management': 'Data Management',

    'group.add': 'New Group',
    'group.name': 'Group Name',
    'group.order': 'Order',
    'group.delete': 'Delete group (hosts become ungrouped)',
    'group.rename': 'Rename',
    'group.edit': 'Edit Group',
    'group.manage': 'Manage Groups',
    'group.delete_confirm': 'Delete group "{name}"? Hosts inside will become ungrouped.',

    'notify.connected': 'Connection initiated',
    'notify.copied': 'Address copied',
    'notify.import_ok': 'Import successful',
    'notify.import_fail': 'Import failed: invalid data format',
    'notify.cleared': 'Data cleared',
    'notify.no_ssh': 'Current tab is not an SSH connection',
    'notify.ssh_command_sent': 'SSH command sent',
  },
}

export class HostI18nService {
  private locale: string = 'zh-CN'

  constructor() {
    this.detectLocale()
  }

  private detectLocale(): void {
    const saved = localStorage.getItem('hp-locale')
    if (saved && saved !== 'auto') {
      this.locale = saved === 'en-US' ? 'en-US' : 'zh-CN'
      return
    }
    const checks: (() => string | null)[] = [
      () => {
        const keys = ['locale', 'language', 'tabby-language', 'tabby-locale',
          'config', 'tabby-config', 'settings', 'tabby-settings', 'tabby-config.json']
        for (const key of keys) {
          const raw = localStorage.getItem(key)
          if (!raw) continue
          if (/^zh/i.test(raw)) return 'zh-CN'
          if (/^en/i.test(raw)) return 'en-US'
          try {
            const obj = JSON.parse(raw)
            const lang = obj?.appearance?.language || obj?.appearance?.locale
              || obj?.language || obj?.locale || obj?.app?.language || obj?.general?.language
            if (lang) return /^zh/i.test(String(lang)) ? 'zh-CN' : 'en-US'
          } catch {}
        }
        return null
      },
      () => {
        try {
          const e = (typeof process !== 'undefined' && process.env)
          if (e) {
            const lc = e.LC_ALL || e.LANG || e.LANGUAGE || ''
            if (/^zh/i.test(lc)) return 'zh-CN'
            if (/^en/i.test(lc)) return 'en-US'
          }
        } catch {}
        return null
      },
      () => {
        try {
          const dl = document.documentElement?.lang || ''
          if (/^zh/i.test(dl)) return 'zh-CN'
          if (/^en/i.test(dl)) return 'en-US'
        } catch {}
        return null
      },
      () => {
        try {
          const nl = navigator.languages || [navigator.language]
          for (const lang of nl) { if (lang.startsWith('zh')) return 'zh-CN' }
          for (const lang of nl) { if (lang.startsWith('en')) return 'en-US' }
        } catch {}
        return null
      },
    ]
    for (const check of checks) {
      const result = check()
      if (result) { this.locale = result; return }
    }
    this.locale = 'zh-CN'
  }

  t(key: string, params?: Record<string, string | number>): string {
    let text = translations[this.locale]?.[key] ?? translations['en-US']?.[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }

  setLocale(locale: string): void {
    localStorage.setItem('hp-locale', locale)
    if (locale === 'auto') {
      this.detectLocale()
    } else {
      this.locale = locale === 'en-US' ? 'en-US' : 'zh-CN'
    }
  }

  getLocale(): string {
    return this.locale
  }
}
