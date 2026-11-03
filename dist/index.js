/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/host-data.service.ts"
/*!**********************************!*\
  !*** ./src/host-data.service.ts ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HostDataService: () => (/* binding */ HostDataService)
/* harmony export */ });
const STORAGE_KEY = 'hp-hosts-v1';
const GROUP_KEY = 'hp-groups-v1';
const PINNED_ENTRY_POS_KEY = 'hp-entry-pos';
const PANEL_POS_KEY = 'hp-panel-pos';
const ENTRY_MODE_KEY = 'hp-entry-mode';
class HostDataService {
    constructor() {
        this.hosts = [];
        this.groups = [];
        this.load();
    }
    /* ---- 持久化 ---- */
    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw)
                this.hosts = JSON.parse(raw);
        }
        catch (_a) {
            this.hosts = [];
        }
        try {
            const raw = localStorage.getItem(GROUP_KEY);
            if (raw)
                this.groups = JSON.parse(raw);
        }
        catch (_b) {
            this.groups = [];
        }
    }
    reload() {
        this.load();
    }
    saveHosts() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.hosts));
    }
    saveGroups() {
        localStorage.setItem(GROUP_KEY, JSON.stringify(this.groups));
    }
    /* ---- 主机操作 ---- */
    getAll() {
        return [...this.hosts];
    }
    getByGroup(group) {
        return this.hosts.filter(h => h.group === group).sort((a, b) => b.usageCount - a.usageCount);
    }
    getPinned() {
        return this.hosts.filter(h => h.pinned).slice(0, 3);
    }
    getById(id) {
        return this.hosts.find(h => h.id === id);
    }
    add(entry) {
        const now = Date.now();
        const newEntry = {
            ...entry,
            id: 'hp_' + now + '_' + Math.random().toString(36).slice(2, 8),
            createdAt: now,
            updatedAt: now,
            usageCount: 0,
        };
        this.hosts.push(newEntry);
        this.saveHosts();
        return newEntry;
    }
    update(id, partial) {
        const idx = this.hosts.findIndex(h => h.id === id);
        if (idx === -1)
            return false;
        this.hosts[idx] = { ...this.hosts[idx], ...partial, updatedAt: Date.now() };
        this.saveHosts();
        return true;
    }
    remove(id) {
        const idx = this.hosts.findIndex(h => h.id === id);
        if (idx === -1)
            return false;
        this.hosts.splice(idx, 1);
        this.saveHosts();
        return true;
    }
    incrementUsage(id) {
        const host = this.hosts.find(h => h.id === id);
        if (host) {
            host.usageCount = (host.usageCount || 0) + 1;
            this.saveHosts();
        }
    }
    reorder(ids) {
        const map = new Map(this.hosts.map(h => [h.id, h]));
        const reordered = [];
        const seen = new Set();
        for (const id of ids) {
            const host = map.get(id);
            if (host && !seen.has(id)) {
                reordered.push(host);
                seen.add(id);
            }
        }
        for (const host of this.hosts) {
            if (!seen.has(host.id)) {
                reordered.push(host);
                seen.add(host.id);
            }
        }
        this.hosts = reordered;
        this.saveHosts();
    }
    reorderGroups(names) {
        const deduped = [];
        const seen = new Set();
        for (const g of this.groups) {
            if (!seen.has(g.name)) {
                deduped.push(g);
                seen.add(g.name);
            }
        }
        this.groups = deduped;
        const map = new Map(this.groups.map(g => [g.name, g]));
        const reordered = [];
        const seen2 = new Set();
        for (const name of names) {
            const group = map.get(name);
            if (group && !seen2.has(name)) {
                reordered.push(group);
                seen2.add(name);
            }
        }
        for (const g of this.groups) {
            if (!seen2.has(g.name)) {
                reordered.push(g);
                seen2.add(g.name);
            }
        }
        this.groups = reordered;
        this.saveGroups();
    }
    /* ---- 分组操作 ---- */
    getGroups() {
        const usedGroups = new Set(this.hosts.map(h => h.group).filter(Boolean));
        const merged = [];
        const seen = new Set();
        let hasUngrouped = false;
        for (const g of this.groups) {
            if (seen.has(g.name))
                continue;
            seen.add(g.name);
            if (usedGroups.has(g.name)) {
                merged.push(g);
                usedGroups.delete(g.name);
            }
            else if (g.name && !usedGroups.has(g.name)) {
                merged.push(g);
            }
            else if (g.name === '' && !hasUngrouped) {
                hasUngrouped = true;
                merged.push(g);
            }
        }
        for (const name of usedGroups) {
            merged.push({ name, expanded: true, order: merged.length });
        }
        if (!hasUngrouped) {
            const hasUncategorized = this.hosts.some(h => !h.group);
            if (hasUncategorized) {
                merged.push({ name: '', expanded: false, order: merged.length });
            }
        }
        if (JSON.stringify(merged) !== JSON.stringify(this.groups)) {
            this.groups = merged;
            this.saveGroups();
        }
        this.groups.sort((a, b) => { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 999) - ((_b = b.order) !== null && _b !== void 0 ? _b : 999); });
        this.saveGroups();
        return this.groups;
    }
    toggleGroupExpanded(name) {
        const g = this.groups.find(gr => gr.name === name);
        if (g)
            g.expanded = !g.expanded;
        else
            this.groups.push({ name, expanded: true, order: this.groups.length });
        this.saveGroups();
    }
    /** 关闭位置记忆时使用默认布局：所有分组折叠 */
    collapseAllGroups() {
        let changed = false;
        for (const g of this.groups) {
            if (g.expanded) {
                g.expanded = false;
                changed = true;
            }
        }
        if (changed)
            this.saveGroups();
    }
    addGroup(name, order) {
        if (!name)
            return;
        if (!this.groups.find(g => g.name === name)) {
            this.groups.push({ name, expanded: true, order: order !== null && order !== void 0 ? order : this.groups.length });
            this.saveGroups();
        }
    }
    updateGroupOrder(name, order) {
        const g = this.groups.find(gr => gr.name === name);
        if (g) {
            g.order = order;
            this.saveGroups();
        }
    }
    removeGroup(name) {
        this.hosts.forEach(h => {
            if (h.group === name)
                h.group = '';
        });
        this.saveHosts();
        const idx = this.groups.findIndex(g => g.name === name);
        if (idx !== -1)
            this.groups.splice(idx, 1);
        this.saveGroups();
    }
    renameGroup(oldName, newName) {
        if (!newName || oldName === newName)
            return;
        this.hosts.forEach(h => {
            if (h.group === oldName)
                h.group = newName;
        });
        this.saveHosts();
        const g = this.groups.find(gr => gr.name === oldName);
        if (g) {
            g.name = newName;
            this.saveGroups();
        }
    }
    /* ---- 入口位置 ---- */
    getEntryPosition() {
        try {
            const raw = localStorage.getItem(PINNED_ENTRY_POS_KEY);
            if (raw)
                return JSON.parse(raw);
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return { x: 20, y: 60 };
    }
    saveEntryPosition(pos) {
        localStorage.setItem(PINNED_ENTRY_POS_KEY, JSON.stringify(pos));
    }
    getPanelPosition() {
        try {
            const raw = localStorage.getItem(PANEL_POS_KEY);
            if (raw)
                return JSON.parse(raw);
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return { x: 20, y: 60 };
    }
    savePanelPosition(pos) {
        localStorage.setItem(PANEL_POS_KEY, JSON.stringify(pos));
    }
    /* ---- 按连接记忆位置 ---- */
    posMemoryKey(profileId) {
        return `hp-pos-memory-${profileId}`;
    }
    getPositionMemory(profileId) {
        if (!profileId)
            return null;
        try {
            const raw = localStorage.getItem(this.posMemoryKey(profileId));
            if (raw)
                return JSON.parse(raw);
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return null;
    }
    savePositionMemory(profileId, data) {
        if (!profileId)
            return;
        const existing = this.getPositionMemory(profileId) || { entryX: 20, entryY: 60, panelX: 20, panelY: 60, panelScrollTop: 0 };
        const merged = { ...existing, ...data };
        localStorage.setItem(this.posMemoryKey(profileId), JSON.stringify(merged));
    }
    clearPositionMemory(profileId) {
        if (!profileId)
            return;
        localStorage.removeItem(this.posMemoryKey(profileId));
    }
    hasPositionMemory(profileId) {
        if (!profileId)
            return false;
        try {
            return localStorage.getItem(this.posMemoryKey(profileId)) !== null;
        }
        catch (_a) {
            return false;
        }
    }
    togglePositionMemory(profileId) {
        if (this.hasPositionMemory(profileId)) {
            this.clearPositionMemory(profileId);
            return false;
        }
        this.savePositionMemory(profileId, {});
        return true;
    }
    /* ---- 入口模式 ---- */
    getEntryMode() {
        try {
            const raw = localStorage.getItem(ENTRY_MODE_KEY);
            if (raw === 'toolbar')
                return 'toolbar';
            if (raw === 'floating')
                return 'floating';
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return 'toolbar';
    }
    saveEntryMode(mode) {
        localStorage.setItem(ENTRY_MODE_KEY, mode);
    }
    /* ---- 导入/导出 ---- */
    exportAll() {
        return JSON.stringify({ hosts: this.hosts, groups: this.groups }, null, 2);
    }
    importAll(json) {
        try {
            const data = JSON.parse(json);
            if (!data || typeof data !== 'object')
                return false;
            if (data.hosts) {
                if (!Array.isArray(data.hosts))
                    return false;
                for (const h of data.hosts) {
                    if (!h.id || !h.name)
                        return false;
                }
            }
            if (data.groups) {
                if (!Array.isArray(data.groups))
                    return false;
                for (const g of data.groups) {
                    if (g.name === undefined)
                        return false;
                }
            }
            if (data.hosts)
                this.hosts = data.hosts;
            if (data.groups)
                this.groups = data.groups;
            this.saveHosts();
            this.saveGroups();
            return true;
        }
        catch (_a) {
            return false;
        }
    }
}


/***/ },

/***/ "./src/host-floating-panel.component.ts"
/*!**********************************************!*\
  !*** ./src/host-floating-panel.component.ts ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HostFloatingPanel: () => (/* binding */ HostFloatingPanel)
/* harmony export */ });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "@angular/core");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_angular_core__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _host_data_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./host-data.service */ "./src/host-data.service.ts");
/* harmony import */ var _host_i18n_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./host-i18n.service */ "./src/host-i18n.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/**
 * Host+ 浮动面板组件
 * 功能描述：浮动在终端上的主机管理面板，支持搜索/分组/SSH连接/最小化/拖拽
 */



let HostFloatingPanel = class HostFloatingPanel {
    constructor() {
        this.svc = new _host_data_service__WEBPACK_IMPORTED_MODULE_1__.HostDataService();
        this.i18n = new _host_i18n_service__WEBPACK_IMPORTED_MODULE_2__.HostI18nService();
        /** 由 TerminalDecorator 注入，用于调用 Tabby 原生 SSH 连接 */
        this.openSSHTab = null;
        this.destroyed = false;
        this.minimized = false;
        this.panelX = 20;
        this.panelY = 60;
        this.panelWidth = +(localStorage.getItem('hp-panel-width') || '380');
        this.panelHeight = +(localStorage.getItem('hp-panel-height') || '0');
        this.resizing = null;
        this.resizeMoveHandler = null;
        this.resizeUpHandler = null;
        this.searchText = '';
        this.filterGroup = '';
        this.showGroupDropdown = false;
        this.filterMenuX = 0;
        this.filterMenuY = 0;
        this.showEditGroupDropdown = false;
        this.editGroupMenuX = 0;
        this.editGroupMenuY = 0;
        this.highlightedId = '';
        this.hosts = [];
        this.groups = [];
        this.filteredHosts = [];
        this.pinnedHosts = [];
        this.sshHost = '';
        this.terminalRef = null;
        this.profileId = '';
        this.onClose = null;
        this.onMinimize = null;
        this.posMemoryOn = false;
        this.dragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragMoveHandler = null;
        this.dragUpHandler = null;
        this.onLocaleChanged = () => {
            this.i18n = new _host_i18n_service__WEBPACK_IMPORTED_MODULE_2__.HostI18nService();
            this.loadData();
        };
        this.onDataChanged = () => {
            this.loadData();
        };
        this.showEditModal = false;
        this.editHostEntry = { name: '', host: '', ip: '', port: 22, username: '', password: '', authType: 'password', privateKeyPath: '', remark: '' };
        this.showPassword = false;
        this.showPortForwardModal = false;
        this.pfHostId = '';
        this.pfHostName = '';
        this.pfType = 'Local';
        this.pfAllRules = [];
        this.pfNewRule = { type: 'Local', host: '127.0.0.1', port: 8000, targetAddress: '127.0.0.1', targetPort: 80, description: '' };
        this.showGroupRename = false;
        this.groupRenameIsNew = false;
        this.groupRenameOldName = '';
        this.groupRenameValue = '';
        this.groupRenameOrder = 0;
        this.dragHostId = null;
        this.listDropOver = false;
    }
    get allGroups() {
        return this.groups;
    }
    get displayGroups() {
        const groups = this.groups.filter(g => {
            if (this.filterGroup === '__ungrouped__') {
                if (g.name !== '')
                    return false;
            }
            else if (this.filterGroup) {
                if (g.name !== this.filterGroup)
                    return false;
            }
            if (this.searchText) {
                const hosts = this.getGroupHosts(g.name);
                return hosts.length > 0;
            }
            return true;
        });
        // 搜索时临时展开有命中的分组，不改动持久化的展开状态
        if (this.searchText && this.searchText.trim()) {
            return groups.map(g => ({ ...g, expanded: true }));
        }
        return groups;
    }
    get selectedCount() {
        return this.filteredHosts.length;
    }
    ngOnInit() {
        this.loadData();
        this.initTerminalInfo();
        window.addEventListener('hp-locale-changed', this.onLocaleChanged);
        window.addEventListener('hp-data-changed', this.onDataChanged);
    }
    applyPositionMemory() {
        this.initTerminalInfo();
        if (!this.profileId)
            this.profileId = 'default';
        this.posMemoryOn = this.svc.hasPositionMemory(this.profileId);
        this.loadData();
        if (this.posMemoryOn) {
            this.restorePosition();
        }
        else {
            // 关闭位置记忆：使用默认布局，不恢复位置/分组/筛选/滚动
            this.svc.collapseAllGroups();
            this.groups = this.svc.getGroups();
            this.filterGroup = '';
        }
        this.onSearch();
    }
    initTerminalInfo() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        if (this.terminalRef) {
            try {
                const ssh = (_d = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.sshSession) !== null && _b !== void 0 ? _b : (_c = this.terminalRef) === null || _c === void 0 ? void 0 : _c._session) !== null && _d !== void 0 ? _d : null;
                if (ssh) {
                    this.sshHost = ssh.host || ((_e = ssh.options) === null || _e === void 0 ? void 0 : _e.host) || '';
                    if (this.sshHost)
                        this.sshHost = '@' + this.sshHost;
                }
            }
            catch ( /* ignore */_m) { /* ignore */ }
        }
        if (!this.profileId && ((_g = (_f = this.terminalRef) === null || _f === void 0 ? void 0 : _f.profile) === null || _g === void 0 ? void 0 : _g.id)) {
            this.profileId = this.terminalRef.profile.id;
        }
        if (!this.profileId && this.terminalRef) {
            try {
                const ssh = (_l = (_j = (_h = this.terminalRef) === null || _h === void 0 ? void 0 : _h.sshSession) !== null && _j !== void 0 ? _j : (_k = this.terminalRef) === null || _k === void 0 ? void 0 : _k._session) !== null && _l !== void 0 ? _l : null;
                if (ssh === null || ssh === void 0 ? void 0 : ssh.host)
                    this.profileId = 'ssh:' + ssh.host;
            }
            catch ( /* ignore */_o) { /* ignore */ }
        }
    }
    ngOnDestroy() {
        this.destroyed = true;
        this.savePosMemory();
        window.removeEventListener('hp-locale-changed', this.onLocaleChanged);
        window.removeEventListener('hp-data-changed', this.onDataChanged);
        this.cleanDrag();
        this.cleanResize();
    }
    loadData() {
        this.svc.reload();
        this.hosts = this.svc.getAll();
        this.groups = this.svc.getGroups();
        this.pinnedHosts = this.svc.getPinned();
        if (this.filterGroup) {
            const valid = this.groups.some(g => this.filterGroup === '__ungrouped__' ? !g.name : g.name === this.filterGroup);
            if (!valid)
                this.filterGroup = '';
        }
        this.onSearch();
    }
    getFilterGroupLabel() {
        if (!this.filterGroup || this.filterGroup === '')
            return this.i18n.t('app.all_groups');
        if (this.filterGroup === '__ungrouped__')
            return this.i18n.t('app.ungrouped');
        return this.filterGroup;
    }
    toggleFilterDropdown(triggerEl) {
        if (this.showGroupDropdown) {
            this.showGroupDropdown = false;
            return;
        }
        const rect = triggerEl.getBoundingClientRect();
        this.filterMenuX = rect.left;
        this.filterMenuY = rect.bottom + 4;
        this.showGroupDropdown = true;
    }
    toggleEditGroupDropdown(triggerEl) {
        if (this.showEditGroupDropdown) {
            this.showEditGroupDropdown = false;
            return;
        }
        const rect = triggerEl.getBoundingClientRect();
        this.editGroupMenuX = rect.left;
        this.editGroupMenuY = rect.bottom + 4;
        this.showEditGroupDropdown = true;
    }
    onSearch() {
        let filtered = this.hosts;
        if (this.searchText) {
            const q = this.searchText.toLowerCase();
            filtered = filtered.filter(h => (h.name || '').toLowerCase().includes(q) ||
                (h.host || '').toLowerCase().includes(q) ||
                (h.ip || '').toLowerCase().includes(q) ||
                (h.username || '').toLowerCase().includes(q) ||
                (h.remark || '').toLowerCase().includes(q));
        }
        if (this.filterGroup === '__ungrouped__') {
            filtered = filtered.filter(h => !h.group);
        }
        else if (this.filterGroup) {
            filtered = filtered.filter(h => h.group === this.filterGroup);
        }
        this.filteredHosts = filtered;
    }
    getGroupHosts(groupName) {
        return this.filteredHosts.filter(h => (h.group || '') === (groupName || ''));
    }
    toggleGroup(name) {
        const target = this.groups.find(g => g.name === name);
        if (!target)
            return;
        const willExpand = !target.expanded;
        if (willExpand) {
            this.groups.forEach(g => { if (g.expanded && g.name !== name)
                this.svc.toggleGroupExpanded(g.name); });
        }
        this.svc.toggleGroupExpanded(name);
        this.groups = this.svc.getGroups();
    }
    connectFirst() {
        if (this.filteredHosts.length > 0) {
            this.connectToHost(this.filteredHosts[0]);
        }
    }
    onQuickBarWheel(event) {
        const el = event.currentTarget;
        if (!el)
            return;
        event.preventDefault();
        el.scrollLeft += event.deltaY;
    }
    /** 连接到主机 — 优先 Tabby 原生 SSH 新建标签页，回退 CLI ssh */
    connectToHost(host) {
        var _a;
        if (!host || this.destroyed)
            return;
        this.svc.incrementUsage(host.id);
        this.highlightedId = host.id;
        setTimeout(() => { this.highlightedId = ''; }, 1500);
        const targetHost = host.host || host.ip;
        const port = host.port || 22;
        const username = host.username || 'root';
        if (!targetHost)
            return;
        const authType = host.authType === 'publicKey' ? 'publicKey' : 'password';
        const privateKeyPath = authType === 'publicKey' ? (host.privateKeyPath || '').trim() : '';
        if (authType === 'publicKey' && !privateKeyPath) {
            alert(this.i18n.t('host.private_key_required'));
            return;
        }
        const password = authType === 'publicKey' ? '' : (host.password || '');
        const forwardedPorts = host.forwardedPorts || [];
        // 方式 1：Tabby 原生 SSH — 新建标签页（ProfilesService / AppService）
        if (this.openSSHTab) {
            const ok = this.openSSHTab(targetHost, port, username, password, privateKeyPath, forwardedPorts);
            if (ok)
                return;
        }
        // 方式 2：CLI 兜底 — 仅当原生方式不可用时
        const parts = ['ssh'];
        if (privateKeyPath)
            parts.push('-i', `"${privateKeyPath}"`);
        if (port !== 22)
            parts.push('-p', String(port));
        for (const fw of forwardedPorts) {
            if (fw.type === 'Dynamic') {
                parts.push('-D', `${fw.host}:${fw.port}`);
            }
            else {
                const flag = fw.type === 'Remote' ? '-R' : '-L';
                parts.push(flag, `${fw.host}:${fw.port}:${fw.targetAddress}:${fw.targetPort}`);
            }
        }
        parts.push(`${username}@${targetHost}`);
        const sshCmd = parts.join(' ');
        if (this.terminalRef) {
            this.sendToTerminal(sshCmd + '\n');
            return;
        }
        try {
            (_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText(sshCmd);
        }
        catch (_b) { }
    }
    /** 发送文本到终端 */
    sendToTerminal(text) {
        var _a, _b, _c, _d, _e, _f;
        try {
            let sent = false;
            if (typeof this.terminalRef.sendInput === 'function') {
                this.terminalRef.sendInput(text);
                sent = true;
            }
            else if (typeof this.terminalRef.write === 'function') {
                this.terminalRef.write(text);
                sent = true;
            }
            else {
                const ssh = (_d = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.sshSession) !== null && _b !== void 0 ? _b : (_c = this.terminalRef) === null || _c === void 0 ? void 0 : _c._session) !== null && _d !== void 0 ? _d : null;
                if (ssh && typeof ssh.write === 'function') {
                    ssh.write(text);
                    sent = true;
                }
            }
            if (!sent) {
                const hostEl = (_f = (_e = this.terminalRef) === null || _e === void 0 ? void 0 : _e.element) === null || _f === void 0 ? void 0 : _f.nativeElement;
                if (hostEl) {
                    const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input');
                    if (input) {
                        input.focus();
                        input.value = text;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        sent = true;
                    }
                }
            }
            if (sent)
                this.focusTerminal();
        }
        catch (e) {
            console.warn('[Host+] sendToTerminal error', e);
        }
    }
    focusTerminal() {
        var _a, _b;
        try {
            const hostEl = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.element) === null || _b === void 0 ? void 0 : _b.nativeElement;
            if (!hostEl)
                return;
            const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input');
            if (input)
                input.focus();
        }
        catch ( /* ignore */_c) { /* ignore */ }
    }
    get pfRules() {
        return this.pfAllRules.filter(rule => rule.type === this.pfType);
    }
    addHost() {
        this.editHostEntry = { name: '', host: '', ip: '', port: 22, username: '', password: '', authType: 'password', privateKeyPath: '', remark: '', group: '', pinned: false };
        this.showEditModal = true;
    }
    addHostToGroup(groupName) {
        this.editHostEntry = { name: '', host: '', ip: '', port: 22, username: '', password: '', authType: 'password', privateKeyPath: '', remark: '', group: groupName || '', pinned: false };
        this.showEditModal = true;
    }
    editHost(host) {
        this.editHostEntry = JSON.parse(JSON.stringify(host));
        if (!this.editHostEntry.authType) {
            this.editHostEntry.authType = this.editHostEntry.privateKeyPath ? 'publicKey' : 'password';
        }
        if (!this.editHostEntry.privateKeyPath)
            this.editHostEntry.privateKeyPath = '';
        this.showEditModal = true;
    }
    async browsePrivateKey(event) {
        event.stopPropagation();
        try {
            const remote = window.require('@electron/remote');
            const result = await remote.dialog.showOpenDialog({
                title: this.i18n.t('host.private_key'),
                properties: ['openFile'],
            });
            if (!result.canceled && result.filePaths && result.filePaths[0]) {
                this.editHostEntry.privateKeyPath = result.filePaths[0];
            }
        }
        catch (_a) {
            // 无法打开文件选择器时，允许用户手动输入路径
        }
    }
    openPortForward(host) {
        this.pfHostId = host.id;
        this.pfHostName = host.name || host.host;
        this.pfAllRules = JSON.parse(JSON.stringify(host.forwardedPorts || []));
        this.pfType = this.pfAllRules.length && this.pfAllRules[0].type ? this.pfAllRules[0].type : 'Local';
        this.resetPfNewRule();
        this.showPortForwardModal = true;
    }
    closePortForward() {
        this.showPortForwardModal = false;
        this.pfHostId = '';
        this.pfHostName = '';
        this.pfAllRules = [];
    }
    onPfTypeChange() {
        this.resetPfNewRule();
    }
    resetPfNewRule() {
        if (this.pfType === 'Dynamic') {
            this.pfNewRule = { type: 'Dynamic', host: '127.0.0.1', port: 1080, targetAddress: '', targetPort: 0, description: '' };
        }
        else {
            this.pfNewRule = { type: this.pfType, host: '127.0.0.1', port: 8000, targetAddress: '127.0.0.1', targetPort: 80, description: '' };
        }
    }
    addPortForwardRule() {
        const rule = this.pfNewRule;
        const port = +rule.port;
        if (!(rule.host || '').trim() || !port || port < 1 || port > 65535) {
            alert(this.i18n.t('pf.invalid'));
            return;
        }
        if (this.pfType !== 'Dynamic') {
            const targetPort = +rule.targetPort;
            if (!(rule.targetAddress || '').trim() || !targetPort || targetPort < 1 || targetPort > 65535) {
                alert(this.i18n.t('pf.invalid'));
                return;
            }
        }
        this.pfAllRules.push({
            type: this.pfType,
            host: rule.host.trim(),
            port,
            targetAddress: this.pfType === 'Dynamic' ? '' : rule.targetAddress.trim(),
            targetPort: this.pfType === 'Dynamic' ? 0 : +rule.targetPort,
            description: (rule.description || '').trim(),
        });
        this.resetPfNewRule();
    }
    removePortForwardRule(rule) {
        this.pfAllRules = this.pfAllRules.filter(item => item !== rule);
    }
    savePortForward() {
        if (!this.pfHostId)
            return;
        this.svc.update(this.pfHostId, { forwardedPorts: this.pfAllRules });
        this.closePortForward();
        this.loadData();
    }
    copyHost(host) {
        var _a;
        const addr = host.port && host.port !== 22
            ? `${host.host}:${host.port}`
            : host.host;
        try {
            (_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText(addr);
        }
        catch (_b) { }
    }
    copyPassword(host) {
        var _a;
        try {
            (_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText(host.password || '');
        }
        catch (_b) { }
    }
    onResetUsage() {
        var _a;
        if (!((_a = this.editHostEntry) === null || _a === void 0 ? void 0 : _a.id))
            return;
        this.svc.update(this.editHostEntry.id, { usageCount: 0 });
        this.editHostEntry.usageCount = 0;
    }
    saveEditHost() {
        if (!this.editHostEntry.name || !this.editHostEntry.name.trim())
            return;
        if (!this.editHostEntry.host && !this.editHostEntry.ip)
            return;
        const authType = this.editHostEntry.authType === 'publicKey' ? 'publicKey' : 'password';
        const privateKeyPath = (this.editHostEntry.privateKeyPath || '').trim();
        if (authType === 'publicKey' && !privateKeyPath) {
            alert(this.i18n.t('host.private_key_required'));
            return;
        }
        if (authType === 'publicKey') {
            try {
                const fs = window.require('fs');
                if (!fs.existsSync(privateKeyPath)) {
                    alert(this.i18n.t('host.private_key_missing', { path: privateKeyPath }));
                    return;
                }
            }
            catch ( /* 无法检查时交给 Tabby 连接时报错 */_a) { /* 无法检查时交给 Tabby 连接时报错 */ }
        }
        const updateData = {
            name: this.editHostEntry.name.trim(),
            host: (this.editHostEntry.host || '').trim(),
            ip: (this.editHostEntry.host || '').trim(),
            port: +(this.editHostEntry.port || 22),
            username: (this.editHostEntry.username || '').trim(),
            password: (this.editHostEntry.password || '').trim(),
            authType,
            privateKeyPath,
            remark: (this.editHostEntry.remark || '').trim(),
            group: this.editHostEntry.group || '',
            pinned: !!this.editHostEntry.pinned,
        };
        if (this.editHostEntry.id) {
            this.svc.update(this.editHostEntry.id, updateData);
        }
        else {
            this.svc.add(updateData);
        }
        this.showEditModal = false;
        this.searchText = '';
        this.loadData();
    }
    closeEditModal() { this.showEditModal = false; this.showEditGroupDropdown = false; this.showPassword = false; }
    onDragStart(event, host) {
        var _a;
        this.dragHostId = host.id;
        (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', host.id);
        event.dataTransfer.effectAllowed = 'move';
    }
    onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const el = event.currentTarget;
        const y = event.clientY - el.getBoundingClientRect().top;
        const dropBottom = y > el.offsetHeight / 2;
        document.querySelectorAll('.hp-host-row.drag-over, .hp-host-row.drag-over-bottom, .hp-group-header.drag-over').forEach(r => r.classList.remove('drag-over', 'drag-over-bottom'));
        el.classList.add(dropBottom ? 'drag-over-bottom' : 'drag-over');
    }
    onDragLeave(event) { event.currentTarget.classList.remove('drag-over', 'drag-over-bottom'); }
    onDrop(event, targetHost) {
        var _a;
        event.preventDefault();
        this.cleanDragStyles();
        const srcId = this.dragHostId || ((_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain'));
        if (!srcId || srcId === targetHost.id)
            return;
        const allHosts = this.hosts;
        const srcIdx = allHosts.findIndex(h => h.id === srcId);
        const tgtIdx = allHosts.findIndex(h => h.id === targetHost.id);
        if (srcIdx === -1 || tgtIdx === -1)
            return;
        const srcHost = allHosts[srcIdx];
        if ((srcHost.group || '') !== (targetHost.group || '')) {
            this.svc.update(srcHost.id, { group: targetHost.group || '' });
            srcHost.group = targetHost.group || '';
        }
        const el = event.currentTarget;
        const y = event.clientY - el.getBoundingClientRect().top;
        const dropAfter = y > el.offsetHeight / 2;
        const [moved] = allHosts.splice(srcIdx, 1);
        const adjustedTgt = tgtIdx > srcIdx ? tgtIdx - 1 : tgtIdx;
        const insertAt = dropAfter ? adjustedTgt + 1 : adjustedTgt;
        allHosts.splice(insertAt, 0, moved);
        this.svc.reorder(allHosts.map(h => h.id));
        this.loadData();
    }
    onDropToGroup(event, groupName) {
        var _a;
        event.preventDefault();
        this.cleanDragStyles();
        const srcId = this.dragHostId || ((_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain'));
        if (!srcId)
            return;
        const srcHost = this.hosts.find(h => h.id === srcId);
        if (!srcHost || (srcHost.group || '') === (groupName || ''))
            return;
        this.svc.update(srcHost.id, { group: groupName || '' });
        const allIds = this.hosts.map(h => h.id);
        const idx = allIds.indexOf(srcId);
        if (idx !== -1)
            allIds.splice(idx, 1);
        allIds.push(srcId);
        this.svc.reorder(allIds);
        this.loadData();
    }
    onDragEnd(event) { this.dragHostId = null; this.cleanDragStyles(); this.listDropOver = false; }
    onListDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        this.listDropOver = true;
    }
    onListDragLeave(event) {
        this.listDropOver = false;
    }
    onListDrop(event, groupName) {
        var _a;
        event.preventDefault();
        this.listDropOver = false;
        this.cleanDragStyles();
        const srcId = this.dragHostId || ((_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain'));
        if (!srcId)
            return;
        const srcHost = this.hosts.find(h => h.id === srcId);
        if (!srcHost)
            return;
        if ((srcHost.group || '') !== (groupName || '')) {
            this.svc.update(srcHost.id, { group: groupName || '' });
            srcHost.group = groupName || '';
        }
        const allIds = this.hosts.map(h => h.id);
        const idx = allIds.indexOf(srcId);
        if (idx !== -1)
            allIds.splice(idx, 1);
        allIds.push(srcId);
        this.svc.reorder(allIds);
        this.loadData();
    }
    cleanDragStyles() {
        document.querySelectorAll('.hp-host-row.dragging, .hp-host-row.drag-over, .hp-host-row.drag-over-bottom, .hp-group-header.drag-over')
            .forEach(el => el.classList.remove('dragging', 'drag-over', 'drag-over-bottom'));
    }
    showGroupRenameDialog(oldName) {
        var _a;
        this.groupRenameIsNew = false;
        this.groupRenameOldName = oldName;
        this.groupRenameValue = oldName;
        const g = this.svc.getGroups().find(gr => gr.name === oldName);
        this.groupRenameOrder = (_a = g === null || g === void 0 ? void 0 : g.order) !== null && _a !== void 0 ? _a : 0;
        this.showGroupRename = true;
    }
    deleteGroup(name) {
        if (name && !confirm(this.i18n.t('group.delete_confirm', { name })))
            return;
        this.svc.removeGroup(name);
        this.loadData();
    }
    deleteHost(host) {
        if (!confirm(this.i18n.t('panel.delete_confirm', { name: host.name })))
            return;
        this.svc.remove(host.id);
        this.loadData();
    }
    confirmGroupRename() {
        var _a;
        const newName = (_a = this.groupRenameValue) === null || _a === void 0 ? void 0 : _a.trim();
        if (this.groupRenameIsNew) {
            if (newName)
                this.svc.addGroup(newName, this.groupRenameOrder);
        }
        else {
            if (!newName || newName === this.groupRenameOldName) {
                this.svc.updateGroupOrder(this.groupRenameOldName, this.groupRenameOrder);
                this.closeGroupRename();
                this.loadData();
                return;
            }
            this.svc.renameGroup(this.groupRenameOldName, newName);
            this.svc.updateGroupOrder(newName, this.groupRenameOrder);
        }
        this.closeGroupRename();
        this.loadData();
    }
    closeGroupRename() { this.showGroupRename = false; this.groupRenameIsNew = false; this.groupRenameOldName = ''; this.groupRenameValue = ''; this.groupRenameOrder = 0; }
    addNewGroup() { this.groupRenameIsNew = true; this.groupRenameOldName = ''; this.groupRenameValue = ''; this.groupRenameOrder = 0; this.showGroupRename = true; }
    startDrag(event) {
        var _a, _b;
        if (event.button !== 0)
            return;
        this.dragging = true;
        this.dragOffsetX = event.clientX - this.panelX;
        this.dragOffsetY = event.clientY - this.panelY;
        const hostEl = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.element) === null || _b === void 0 ? void 0 : _b.nativeElement;
        this.dragMoveHandler = (ev) => {
            if (!this.dragging)
                return;
            let x = ev.clientX - this.dragOffsetX;
            let y = ev.clientY - this.dragOffsetY;
            if (hostEl) {
                const panelEl = hostEl.querySelector('.hp-panel');
                const ph = (panelEl === null || panelEl === void 0 ? void 0 : panelEl.offsetHeight) || 200;
                const pw = (panelEl === null || panelEl === void 0 ? void 0 : panelEl.offsetWidth) || 380;
                const maxX = Math.max(0, hostEl.clientWidth - pw - 4);
                const maxY = Math.max(0, hostEl.clientHeight - ph - 4);
                x = Math.max(0, Math.min(x, maxX));
                y = Math.max(0, Math.min(y, maxY));
            }
            this.panelX = x;
            this.panelY = y;
        };
        this.dragUpHandler = () => {
            this.dragging = false;
            if (this.posMemoryOn && this.profileId) {
                this.svc.savePositionMemory(this.profileId, { panelX: this.panelX, panelY: this.panelY });
            }
            this.cleanDrag();
        };
        document.addEventListener('mousemove', this.dragMoveHandler);
        document.addEventListener('mouseup', this.dragUpHandler);
    }
    cleanDrag() {
        if (this.dragMoveHandler) {
            document.removeEventListener('mousemove', this.dragMoveHandler);
            this.dragMoveHandler = null;
        }
        if (this.dragUpHandler) {
            document.removeEventListener('mouseup', this.dragUpHandler);
            this.dragUpHandler = null;
        }
    }
    /* ---- 面板大小调整 ---- */
    startResize(event, dir) {
        if (event.button !== 0)
            return;
        event.preventDefault();
        event.stopPropagation();
        const panelEl = event.currentTarget.closest('.hp-panel');
        const startH = this.panelHeight || (panelEl === null || panelEl === void 0 ? void 0 : panelEl.offsetHeight) || 420;
        this.resizing = { dir, startW: this.panelWidth, startH, lastX: event.clientX, lastY: event.clientY };
        this.resizeMoveHandler = (ev) => {
            var _a, _b;
            if (!this.resizing)
                return;
            const dx = ev.clientX - this.resizing.lastX;
            const dy = ev.clientY - this.resizing.lastY;
            this.resizing.lastX = ev.clientX;
            this.resizing.lastY = ev.clientY;
            const dir = this.resizing.dir;
            const hostEl = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.element) === null || _b === void 0 ? void 0 : _b.nativeElement;
            const maxW = hostEl ? hostEl.clientWidth : 9999;
            const maxH = hostEl ? hostEl.clientHeight : 9999;
            let newW = this.panelWidth;
            let newH = this.panelHeight || this.resizing.startH;
            if (dir.includes('e')) {
                const limit = maxW - this.panelX;
                newW = Math.max(300, Math.min(newW + dx, limit));
            }
            if (dir.includes('w')) {
                const maxShrink = newW - 300;
                const leftLimit = this.panelX;
                const dw = Math.max(Math.min(dx, maxShrink, leftLimit), -maxShrink);
                newW -= dw;
                this.panelX += dw;
            }
            if (dir.includes('s')) {
                const limit = maxH - this.panelY;
                newH = Math.max(400, Math.min(newH + dy, limit));
            }
            if (dir.includes('n')) {
                const maxShrink = newH - 400;
                const topLimit = this.panelY;
                const dh = Math.max(Math.min(dy, maxShrink, topLimit), -maxShrink);
                newH -= dh;
                this.panelY += dh;
            }
            this.panelWidth = Math.round(newW);
            this.panelHeight = Math.round(newH);
        };
        this.resizeUpHandler = () => {
            localStorage.setItem('hp-panel-width', String(this.panelWidth));
            localStorage.setItem('hp-panel-height', String(this.panelHeight || '0'));
            this.resizing = null;
            this.cleanResize();
        };
        document.addEventListener('mousemove', this.resizeMoveHandler);
        document.addEventListener('mouseup', this.resizeUpHandler);
    }
    cleanResize() {
        if (this.resizeMoveHandler) {
            document.removeEventListener('mousemove', this.resizeMoveHandler);
            this.resizeMoveHandler = null;
        }
        if (this.resizeUpHandler) {
            document.removeEventListener('mouseup', this.resizeUpHandler);
            this.resizeUpHandler = null;
        }
    }
    restorePosition() {
        if (this.posMemoryOn && this.profileId) {
            const mem = this.svc.getPositionMemory(this.profileId);
            if (mem) {
                this.panelX = Math.max(0, mem.panelX || 20);
                this.panelY = Math.max(0, mem.panelY || 60);
                if (mem.filterGroup !== undefined)
                    this.filterGroup = mem.filterGroup;
                if (this.filterGroup && this.filterGroup !== '__ungrouped__') {
                    if (!this.groups.some(g => g.name === this.filterGroup))
                        this.filterGroup = '';
                }
                if (mem.groupExpanded) {
                    this.groups.forEach(g => { if (mem.groupExpanded[g.name] !== undefined)
                        g.expanded = mem.groupExpanded[g.name]; });
                }
                if (mem.panelScrollTop > 0) {
                    setTimeout(() => { var _a; if ((_a = this.listRef) === null || _a === void 0 ? void 0 : _a.nativeElement)
                        this.listRef.nativeElement.scrollTop = mem.panelScrollTop; }, 50);
                }
                return;
            }
        }
        // 没有开启记忆：保留入口/居中定位的默认位置，只做边界修正
        setTimeout(() => {
            var _a, _b;
            const hostEl = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.element) === null || _b === void 0 ? void 0 : _b.nativeElement;
            if (hostEl) {
                const panelEl = hostEl.querySelector('.hp-panel');
                const ph = (panelEl === null || panelEl === void 0 ? void 0 : panelEl.offsetHeight) || 200;
                const pw = (panelEl === null || panelEl === void 0 ? void 0 : panelEl.offsetWidth) || 380;
                this.panelX = Math.max(0, Math.min(this.panelX, Math.max(0, hostEl.clientWidth - pw - 4)));
                this.panelY = Math.max(0, Math.min(this.panelY, Math.max(0, hostEl.clientHeight - ph - 4)));
            }
        }, 0);
    }
    savePosMemory() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!this.profileId && this.terminalRef) {
            try {
                const ssh = (_d = (_b = (_a = this.terminalRef) === null || _a === void 0 ? void 0 : _a.sshSession) !== null && _b !== void 0 ? _b : (_c = this.terminalRef) === null || _c === void 0 ? void 0 : _c._session) !== null && _d !== void 0 ? _d : null;
                if ((_f = (_e = this.terminalRef) === null || _e === void 0 ? void 0 : _e.profile) === null || _f === void 0 ? void 0 : _f.id)
                    this.profileId = this.terminalRef.profile.id;
                else if (ssh === null || ssh === void 0 ? void 0 : ssh.host)
                    this.profileId = 'ssh:' + ssh.host;
            }
            catch ( /* ignore */_j) { /* ignore */ }
        }
        if (this.posMemoryOn && this.profileId) {
            const scrollTop = ((_h = (_g = this.listRef) === null || _g === void 0 ? void 0 : _g.nativeElement) === null || _h === void 0 ? void 0 : _h.scrollTop) || 0;
            const groupExp = {};
            this.groups.forEach(g => { groupExp[g.name] = g.expanded; });
            this.svc.savePositionMemory(this.profileId, {
                panelScrollTop: scrollTop > 0 ? scrollTop : undefined,
                filterGroup: this.filterGroup, groupExpanded: groupExp,
            });
        }
    }
    togglePosMemory() {
        var _a, _b;
        if (!this.profileId)
            this.profileId = 'default';
        this.posMemoryOn = this.svc.togglePositionMemory(this.profileId);
        if (this.posMemoryOn) {
            const groupExp = {};
            this.groups.forEach(g => { groupExp[g.name] = g.expanded; });
            this.svc.savePositionMemory(this.profileId, {
                entryX: 0, entryY: 0, panelX: this.panelX, panelY: this.panelY,
                panelScrollTop: ((_b = (_a = this.listRef) === null || _a === void 0 ? void 0 : _a.nativeElement) === null || _b === void 0 ? void 0 : _b.scrollTop) || 0,
                filterGroup: this.filterGroup, groupExpanded: groupExp,
            });
        }
    }
    doClose() {
        if (!this.profileId)
            this.initTerminalInfo();
        this.savePosMemory();
        if (this.onClose)
            this.onClose();
    }
    noBubble(event) { event.stopPropagation(); }
    /** 快捷翻译方法（供模板使用） */
    t(zh, en) {
        return this.i18n.getLocale() === 'en-US' ? en : zh;
    }
};
__decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_0__.ViewChild)('listRef'),
    __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__.ElementRef)
], HostFloatingPanel.prototype, "listRef", void 0);
HostFloatingPanel = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_0__.Component)({
        selector: 'hp-floating-panel',
        template: `
    <!-- ====== 浮动面板主体 ====== -->
    <div class="hp-panel"
      [class.minimized]="minimized"
      [class.resizing]="resizing !== null"
      [style.left.px]="panelX"
      [style.top.px]="panelY"
      [style.width.px]="panelWidth"
      [style.height.px]="panelHeight || null"
      [style.max-height.px]="panelHeight ? null : 420"
      (mousedown)="noBubble($event)">

      <!-- 玻璃高光层 -->
      <div class="hp-glass-shine"></div>

      <!-- 标题栏 -->
      <div class="hp-titlebar" (mousedown)="startDrag($event)">
        <span class="hp-title-dot"></span>
        <span class="hp-title">{{ i18n.t('app.title') }}</span>
        <span class="hp-ssh-badge" *ngIf="sshHost">{{ sshHost }}</span>
        <div class="hp-title-spacer"></div>
        <span class="hp-title-btn hp-title-btn-mem"
              [title]="posMemoryOn ? i18n.t('panel.memory_on') : i18n.t('panel.memory_off')"
              [class.active]="posMemoryOn"
              (mousedown)="$event.stopPropagation()"
              (click)="togglePosMemory(); $event.stopPropagation()">&#x2605;</span>
        <span class="hp-title-btn hp-title-btn-close"
              [title]="i18n.t('panel.close')"
              (mousedown)="$event.stopPropagation()"
              (click)="doClose(); $event.stopPropagation()">&#x2715;</span>
      </div>

      <ng-container *ngIf="!minimized">
        <!-- 搜索栏 -->
        <div class="hp-search">
          <div class="hp-filter-dropdown" [class.open]="showGroupDropdown">
            <div class="hp-filter-trigger" #filterTrigger (click)="toggleFilterDropdown(filterTrigger); $event.stopPropagation()">
              <span class="hp-filter-label">{{ getFilterGroupLabel() }}</span>
              <span class="hp-filter-clear-btn" *ngIf="filterGroup" (click)="filterGroup = ''; onSearch(); $event.stopPropagation()" [title]="i18n.t('app.all_groups')">&#x2715;</span>
              <span class="hp-filter-arrow">{{ showGroupDropdown ? '&#x25B2;' : '&#x25BC;' }}</span>
            </div>
          </div>
          <div class="hp-search-input-wrap">
            <input class="hp-search-input" type="text"
              [placeholder]="i18n.t('app.search')"
              [(ngModel)]="searchText"
              (input)="onSearch()"
              (keydown.enter)="connectFirst()"
              (keydown.escape)="doClose()">
            <span class="hp-search-clear" *ngIf="searchText" (click)="searchText=''; onSearch()">&#x2715;</span>
          </div>
        </div>

        <!-- 快捷主机栏 -->
        <div class="hp-quick-bar" *ngIf="pinnedHosts.length > 0" (wheel)="onQuickBarWheel($event)">
          <div class="hp-quick-host" *ngFor="let phost of pinnedHosts"
            (click)="connectToHost(phost)" [title]="phost.host">
            <span class="hp-quick-icon">&#x2691;</span>
            <span class="hp-quick-name">{{ phost.name }}</span>
          </div>
        </div>

        <!-- 主机列表 -->
        <div class="hp-list" #listRef>
          <ng-container *ngFor="let group of displayGroups; let gi = index">
            <!-- 分组头 -->
            <div class="hp-group-header"
              (click)="toggleGroup(group.name)"
              dragover="event.preventDefault()"
              (drop)="onDropToGroup($event, group.name)"
              (dragleave)="onDragLeave($event)">
              <span class="hp-group-arrow">{{ group.expanded ? '&#x25BC;' : '&#x25B6;' }}</span>
              <span class="hp-group-icon">{{ group.expanded ? '&#x1F4C2;' : '&#x1F4C1;' }}</span>
              <span class="hp-group-name">{{ group.name || i18n.t('app.ungrouped') }}</span>
              <span class="hp-group-count">{{ getGroupHosts(group.name).length }}</span>
              <div class="hp-group-actions">
                <span class="hp-group-act" (click)="addHostToGroup(group.name); $event.stopPropagation()" [title]="i18n.t('panel.add')">+</span>
                <span class="hp-group-act" (click)="showGroupRenameDialog(group.name); $event.stopPropagation()" [title]="i18n.t('group.rename')">&#x270E;</span>
                <span class="hp-group-act hp-group-act-del" (click)="deleteGroup(group.name); $event.stopPropagation()" [title]="i18n.t('group.delete')">&#x2212;</span>
              </div>
            </div>

            <!-- 主机行 -->
            <div *ngIf="group.expanded" class="hp-host-group-body"
              (dragover)="onListDragOver($event)"
              (dragleave)="onListDragLeave($event)"
              (drop)="onListDrop($event, group.name)">
              <div *ngFor="let host of getGroupHosts(group.name)" class="hp-host-row"
                (click)="connectToHost(host)"
                (dblclick)="editHost(host)"
                [class.highlighted]="highlightedId === host.id"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event, host)">
                <span class="hp-host-drag" draggable="true"
                  (dragstart)="onDragStart($event, host)"
                  (dragend)="onDragEnd($event)" [title]="i18n.t('panel.drag_reorder')">&#x2261;</span>
                <div class="hp-host-body">
                  <span class="hp-host-name">{{ host.name }}</span>
                  <div class="hp-host-details">
                    <span class="hp-host-detail hp-host-addr" *ngIf="host.host" [title]="i18n.t('host.host')">{{ host.host }}<span class="hp-host-port">:{{ host.port || 22 }}</span></span>
                    <span class="hp-host-detail hp-host-user" *ngIf="host.username" [title]="i18n.t('host.username')">{{ host.username }}</span>
                  </div>
                  <span class="hp-host-remark" *ngIf="host.remark" [title]="host.remark">{{ host.remark }}</span>
                </div>
                <div class="hp-host-actions">
                  <span class="hp-host-act hp-host-act-copy" (click)="copyHost(host); $event.stopPropagation()" [title]="i18n.t('panel.copy_host')">&#x2750;</span>
                  <span class="hp-host-act hp-host-act-copy" *ngIf="host.password && host.authType !== 'publicKey'" (click)="copyPassword(host); $event.stopPropagation()" [title]="i18n.t('panel.copy_password')">&#x25A3;</span>
                  <span class="hp-host-act hp-host-act-connect" (click)="connectToHost(host); $event.stopPropagation()" [title]="i18n.t('panel.ssh_connect')">&#x23CE;</span>
                  <span class="hp-host-act" (click)="editHost(host); $event.stopPropagation()" [title]="i18n.t('panel.edit')">&#x270E;</span>
                  <span class="hp-host-act hp-host-act-forward" (click)="openPortForward(host); $event.stopPropagation()" [title]="i18n.t('panel.port_forward')">&#x21C4;</span>
                  <span class="hp-host-act hp-host-act-del" (click)="deleteHost(host); $event.stopPropagation()" [title]="i18n.t('panel.delete')">&#x2715;</span>
                </div>
              </div>
              <div class="hp-drop-end" [class.drag-over]="listDropOver"></div>
            </div>
          </ng-container>

          <div class="hp-empty" *ngIf="filteredHosts.length === 0 && searchText">
            <span class="hp-empty-icon">&#x1F50D;</span>
            <span>{{ i18n.t('app.noresults') }}</span>
          </div>
          <div class="hp-empty" *ngIf="filteredHosts.length === 0 && !searchText">
            <span class="hp-empty-icon">&#x2328;</span>
            <span>{{ i18n.t('panel.hint.search') }}</span>
          </div>
        </div>

        <!-- 底部栏 -->
        <div class="hp-footer">
          <span class="hp-footer-btn hp-footer-btn-primary" (click)="addHost()">+ {{ i18n.t('panel.add') }}</span>
          <span class="hp-footer-btn" (click)="addNewGroup()">+ {{ i18n.t('group.add') }}</span>
          <span class="hp-footer-count" *ngIf="selectedCount > 0">{{ selectedCount }} hosts</span>
        </div>
      </ng-container>

      <!-- 调整大小手柄 -->
      <div class="hp-rsz hp-rsz-e"  (mousedown)="startResize($event, 'e')"></div>
      <div class="hp-rsz hp-rsz-w"  (mousedown)="startResize($event, 'w')"></div>
      <div class="hp-rsz hp-rsz-s"  (mousedown)="startResize($event, 's')"></div>
      <div class="hp-rsz hp-rsz-n"  (mousedown)="startResize($event, 'n')"></div>
      <div class="hp-rsz hp-rsz-se" (mousedown)="startResize($event, 'se')"></div>
      <div class="hp-rsz hp-rsz-sw" (mousedown)="startResize($event, 'sw')"></div>
      <div class="hp-rsz hp-rsz-ne" (mousedown)="startResize($event, 'ne')"></div>
      <div class="hp-rsz hp-rsz-nw" (mousedown)="startResize($event, 'nw')"></div>
    </div>

    <!-- ====== 分组下拉 ====== -->
    <div class="hp-filter-backdrop" *ngIf="showGroupDropdown" (click)="showGroupDropdown = false; $event.stopPropagation()" (mousedown)="$event.stopPropagation()"></div>
    <div class="hp-filter-menu" *ngIf="showGroupDropdown" (mousedown)="$event.stopPropagation()"
      [style.left.px]="filterMenuX" [style.top.px]="filterMenuY">
      <div class="hp-filter-option" [class.active]="filterGroup === ''"
        (click)="filterGroup = ''; showGroupDropdown = false; onSearch()">
        <span class="hp-filter-opt-icon">&#x1F3F7;</span> {{ i18n.t('app.all_groups') }}
      </div>
      <div class="hp-filter-opt-divider"></div>
      <div class="hp-filter-option" *ngFor="let g of allGroups"
        [class.active]="filterGroup === (g.name || '__ungrouped__')"
        (click)="filterGroup = (g.name || '__ungrouped__'); showGroupDropdown = false; onSearch()">
        <span class="hp-filter-opt-icon">{{ (g.name ? '&#x1F4C1;' : '&#x1F4C4;') }}</span> {{ g.name || i18n.t('app.ungrouped') }}
      </div>
    </div>

    <!-- ====== 编辑主机弹窗 ====== -->
    <div class="hp-overlay" *ngIf="showEditModal" (click)="closeEditModal()"></div>
    <div class="hp-modal" *ngIf="showEditModal" (click)="$event.stopPropagation()">
      <div class="hp-modal-header">
        <span class="hp-modal-title">{{ editHostEntry?.id ? i18n.t('settings.edit_host') : i18n.t('panel.add') }}</span>
      </div>
      <div class="hp-modal-body">
        <div class="hp-field">
          <label class="hp-field-label">{{ i18n.t('host.name') }}</label>
          <input class="hp-field-input" type="text" [(ngModel)]="editHostEntry.name" (keydown.enter)="saveEditHost()" placeholder="e.g. Web Server">
        </div>
        <div class="hp-field">
          <label class="hp-field-label">{{ i18n.t('host.host') }}</label>
          <input class="hp-field-input" type="text" [(ngModel)]="editHostEntry.host" (keydown.enter)="saveEditHost()" placeholder="e.g. 192.168.1.100 or example.com">
        </div>
        <div class="hp-field-row">
          <div class="hp-field hp-field-half">
            <label class="hp-field-label">{{ i18n.t('host.port') }}</label>
            <input class="hp-field-input" type="number" min="1" max="65535" [(ngModel)]="editHostEntry.port" (keydown.enter)="saveEditHost()" placeholder="22">
          </div>
          <div class="hp-field hp-field-half">
            <label class="hp-field-label">{{ i18n.t('host.username') }}</label>
            <input class="hp-field-input" type="text" [(ngModel)]="editHostEntry.username" (keydown.enter)="saveEditHost()" placeholder="e.g. root">
          </div>
        </div>
        <div class="hp-field">
          <label class="hp-field-label">{{ i18n.t('host.auth_type') }}</label>
          <div class="hp-auth-row">
            <label class="hp-auth-option" [class.active]="editHostEntry.authType !== 'publicKey'">
              <input type="radio" name="hp-auth" value="password" [(ngModel)]="editHostEntry.authType">
              <span>{{ i18n.t('host.auth_password') }}</span>
            </label>
            <label class="hp-auth-option" [class.active]="editHostEntry.authType === 'publicKey'">
              <input type="radio" name="hp-auth" value="publicKey" [(ngModel)]="editHostEntry.authType">
              <span>{{ i18n.t('host.auth_key') }}</span>
            </label>
          </div>
        </div>
        <div class="hp-field" *ngIf="editHostEntry.authType !== 'publicKey'">
          <label class="hp-field-label">{{ i18n.t('host.password') }}</label>
          <div class="hp-password-wrap">
            <input class="hp-field-input hp-password-input" [type]="showPassword ? 'text' : 'password'" [(ngModel)]="editHostEntry.password" (keydown.enter)="saveEditHost()" [placeholder]="i18n.t('host.password_hint')">
            <span class="hp-password-eye" [class.active]="showPassword" (click)="showPassword = !showPassword; $event.stopPropagation()" [title]="showPassword ? t('隐藏密码', 'Hide') : t('显示密码', 'Show')">&#x25C9;</span>
          </div>
        </div>
        <div class="hp-field" *ngIf="editHostEntry.authType === 'publicKey'">
          <label class="hp-field-label">{{ i18n.t('host.private_key') }}</label>
          <div class="hp-key-wrap">
            <input class="hp-field-input hp-key-input" type="text" [(ngModel)]="editHostEntry.privateKeyPath" (keydown.enter)="saveEditHost()" placeholder="C:/Users/.../.ssh/id_rsa">
            <span class="hp-key-browse" (click)="browsePrivateKey($event)">{{ i18n.t('host.browse') }}</span>
          </div>
          <p class="hp-field-hint">{{ i18n.t('host.private_key_hint') }}</p>
        </div>
        <div class="hp-field">
          <label class="hp-field-label">{{ i18n.t('host.remark') }}</label>
          <input class="hp-field-input" type="text" [(ngModel)]="editHostEntry.remark" (keydown.enter)="saveEditHost()" placeholder="e.g. 生产环境 Web 服务器">
        </div>
        <div class="hp-field">
          <label class="hp-field-label">{{ i18n.t('host.group') }}</label>
          <div class="hp-filter-dropdown" [class.open]="showEditGroupDropdown">
            <div class="hp-filter-trigger" #editGroupTrigger (click)="toggleEditGroupDropdown(editGroupTrigger); $event.stopPropagation()">
              <span class="hp-filter-label">{{ editHostEntry.group || i18n.t('app.ungrouped') }}</span>
              <span class="hp-filter-arrow">{{ showEditGroupDropdown ? '&#x25B2;' : '&#x25BC;' }}</span>
            </div>
          </div>
        </div>
        <div class="hp-check-row">
          <label class="hp-check"><input type="checkbox" [(ngModel)]="editHostEntry.pinned"><span>{{ i18n.t('host.pinned') }}</span></label>
        </div>
        <div class="hp-usage-row" *ngIf="editHostEntry?.id && editHostEntry?.usageCount !== undefined">
          <span class="hp-usage-label">{{ i18n.t('host.usage_count') }}: <strong>{{ editHostEntry.usageCount || 0 }}</strong></span>
          <span class="hp-usage-reset" (click)="onResetUsage()">{{ i18n.t('settings.reset') }}</span>
        </div>
      </div>
      <div class="hp-modal-footer">
        <button class="hp-btn hp-btn-ghost" (click)="closeEditModal()">{{ i18n.t('settings.cancel') }}</button>
        <button class="hp-btn hp-btn-primary" (click)="saveEditHost()">{{ i18n.t('settings.save') }}</button>
      </div>
    </div>

    <!-- 编辑弹窗 — 分组下拉 -->
    <div class="hp-filter-backdrop" *ngIf="showEditGroupDropdown" (click)="showEditGroupDropdown = false; $event.stopPropagation()" (mousedown)="$event.stopPropagation()"></div>
    <div class="hp-filter-menu" *ngIf="showEditGroupDropdown" (mousedown)="$event.stopPropagation()"
      [style.left.px]="editGroupMenuX" [style.top.px]="editGroupMenuY">
      <div class="hp-filter-option" [class.active]="!editHostEntry.group"
        (click)="editHostEntry.group = ''; showEditGroupDropdown = false">
        <span class="hp-filter-opt-icon">&#x1F4C4;</span> {{ i18n.t('app.ungrouped') }}
      </div>
      <div class="hp-filter-opt-divider" *ngIf="allGroups.length > 0"></div>
      <div class="hp-filter-option" *ngFor="let g of allGroups"
        [class.active]="editHostEntry.group === g.name"
        (click)="editHostEntry.group = g.name; showEditGroupDropdown = false">
        <span class="hp-filter-opt-icon">&#x1F4C1;</span> {{ g.name }}
      </div>
    </div>

    <!-- ====== 分组编辑弹窗 ====== -->
    <div class="hp-overlay" *ngIf="showGroupRename" (click)="closeGroupRename()"></div>
    <div class="hp-modal hp-modal-sm" *ngIf="showGroupRename" (click)="$event.stopPropagation()">
      <div class="hp-modal-header">
        <span class="hp-modal-title">{{ groupRenameIsNew ? i18n.t('group.add') : i18n.t('group.edit') }}</span>
      </div>
      <div class="hp-modal-body">
        <div class="hp-field">
          <label class="hp-field-label">{{ i18n.t('group.name') }}</label>
          <input class="hp-field-input" type="text" [(ngModel)]="groupRenameValue"
            (keydown.enter)="confirmGroupRename()" [placeholder]="i18n.t('group.name')" autofocus>
        </div>
        <div class="hp-field">
          <label class="hp-field-label">{{ i18n.t('group.order') }}</label>
          <input class="hp-field-input" type="number" min="0" step="1" [(ngModel)]="groupRenameOrder"
            (keydown.enter)="confirmGroupRename()" placeholder="0">
        </div>
      </div>
      <div class="hp-modal-footer">
        <button class="hp-btn hp-btn-ghost" (click)="closeGroupRename()">{{ i18n.t('settings.cancel') }}</button>
        <button class="hp-btn hp-btn-primary" (click)="confirmGroupRename()">{{ i18n.t('settings.ok') }}</button>
      </div>
    </div>

    <!-- ====== 端口转发弹窗 ====== -->
    <div class="hp-overlay" *ngIf="showPortForwardModal" (click)="closePortForward()"></div>
    <div class="hp-modal" *ngIf="showPortForwardModal" (click)="$event.stopPropagation()">
      <div class="hp-modal-header">
        <span class="hp-modal-title">{{ i18n.t('pf.title') }} — {{ pfHostName }}</span>
      </div>
      <div class="hp-modal-body">
        <div class="hp-field">
          <label class="hp-field-label">{{ i18n.t('pf.type') }}</label>
          <div class="hp-auth-row">
            <label class="hp-auth-option" [class.active]="pfType === 'Local'">
              <input type="radio" name="hp-pf-type" value="Local" [(ngModel)]="pfType" (ngModelChange)="onPfTypeChange()">
              <span>{{ i18n.t('pf.local') }}</span>
            </label>
            <label class="hp-auth-option" [class.active]="pfType === 'Remote'">
              <input type="radio" name="hp-pf-type" value="Remote" [(ngModel)]="pfType" (ngModelChange)="onPfTypeChange()">
              <span>{{ i18n.t('pf.remote') }}</span>
            </label>
            <label class="hp-auth-option" [class.active]="pfType === 'Dynamic'">
              <input type="radio" name="hp-pf-type" value="Dynamic" [(ngModel)]="pfType" (ngModelChange)="onPfTypeChange()">
              <span>{{ i18n.t('pf.dynamic') }}</span>
            </label>
          </div>
          <p class="hp-field-hint" *ngIf="pfType === 'Local'">{{ i18n.t('pf.local_hint') }}</p>
          <p class="hp-field-hint" *ngIf="pfType === 'Remote'">{{ i18n.t('pf.remote_hint') }}</p>
          <p class="hp-field-hint" *ngIf="pfType === 'Dynamic'">{{ i18n.t('pf.dynamic_hint') }}</p>
        </div>

        <div class="hp-pf-list" *ngIf="pfRules.length > 0">
          <div class="hp-pf-rule" *ngFor="let fw of pfRules">
            <div class="hp-pf-rule-main">
              <span>{{ fw.host }}:{{ fw.port }}</span>
              <span class="hp-pf-rule-arrow">&#x2192;</span>
              <span *ngIf="fw.type !== 'Dynamic'">{{ fw.targetAddress }}:{{ fw.targetPort }}</span>
              <span *ngIf="fw.type === 'Dynamic'">{{ i18n.t('pf.socks') }}</span>
              <div class="hp-pf-rule-desc" *ngIf="fw.description">{{ fw.description }}</div>
            </div>
            <span class="hp-pf-rule-del" (click)="removePortForwardRule(fw)" [title]="i18n.t('panel.delete')">&#x2715;</span>
          </div>
        </div>
        <p class="hp-field-hint" *ngIf="pfRules.length === 0">{{ i18n.t('pf.empty') }}</p>

        <div class="hp-pf-add">
          <label class="hp-field-label">{{ i18n.t('pf.add') }}</label>
          <div class="hp-field-row">
            <div class="hp-field hp-field-half">
              <label class="hp-field-label">{{ i18n.t('pf.listen_host') }}</label>
              <input class="hp-field-input" type="text" [(ngModel)]="pfNewRule.host" placeholder="127.0.0.1">
            </div>
            <div class="hp-field hp-field-half">
              <label class="hp-field-label">{{ i18n.t('pf.listen_port') }}</label>
              <input class="hp-field-input" type="number" min="1" max="65535" [(ngModel)]="pfNewRule.port" placeholder="8000">
            </div>
          </div>
          <div class="hp-field-row" *ngIf="pfType !== 'Dynamic'">
            <div class="hp-field hp-field-half">
              <label class="hp-field-label">{{ i18n.t('pf.target_host') }}</label>
              <input class="hp-field-input" type="text" [(ngModel)]="pfNewRule.targetAddress" placeholder="127.0.0.1">
            </div>
            <div class="hp-field hp-field-half">
              <label class="hp-field-label">{{ i18n.t('pf.target_port') }}</label>
              <input class="hp-field-input" type="number" min="1" max="65535" [(ngModel)]="pfNewRule.targetPort" placeholder="80">
            </div>
          </div>
          <div class="hp-field">
            <input class="hp-field-input" type="text" [(ngModel)]="pfNewRule.description" [placeholder]="i18n.t('pf.description')">
          </div>
          <button class="hp-btn hp-btn-primary hp-pf-add-btn" (click)="addPortForwardRule()">+ {{ i18n.t('pf.add') }}</button>
        </div>
      </div>
      <div class="hp-modal-footer">
        <button class="hp-btn hp-btn-ghost" (click)="closePortForward()">{{ i18n.t('settings.cancel') }}</button>
        <button class="hp-btn hp-btn-primary" (click)="savePortForward()">{{ i18n.t('settings.save') }}</button>
      </div>
    </div>
  `,
        styles: [`
    /* ========================================
       CSS 自定义属性（继承自 :root 的 --hp-*，Host+ 复用 QuickCmd+ 的配色变量）
       ======================================== */
    :host {
      display: contents;
      --_bg: var(--hp-bg, rgba(22,22,28,0.72));
      --_bg-rgb: var(--hp-bg-rgb, 22,22,28);
      --_text: var(--hp-text, #e8e8e8);
      --_text-secondary: var(--hp-text-secondary, #b0b0b0);
      --_text-muted: var(--hp-text-muted, #7a7a8a);
      --_primary: var(--hp-primary, #5b8def);
      --_primary-rgb: var(--hp-primary-rgb, 91,141,239);
      --_border: var(--hp-border, rgba(255,255,255,0.10));
      --_surface: var(--hp-surface, rgba(255,255,255,0.06));
      --_surface-rgb: var(--hp-surface-rgb, 255,255,255);
      --_input-bg: var(--hp-input-bg, rgba(255,255,255,0.08));
      --_hover: var(--hp-hover, rgba(255,255,255,0.08));
      --_group-name: var(--hp-group-name, var(--_text-secondary));
      --_shadow: var(--hp-shadow, 0 8px 40px rgba(0,0,0,0.42));
      --_blur: var(--hp-blur, 24px);
      --_saturate: var(--hp-saturate, 160%);
      --_warning: #fab387;
      --_danger: #f38ba8;
      --_success: #a6e3a1;
    }

    /* ========================================
       面板主体 — 毛玻璃核心
       ======================================== */
    .hp-panel {
      position: absolute;
      z-index: 99999;
      width: 380px;
      background: var(--_bg);
      backdrop-filter: blur(var(--_blur)) saturate(var(--_saturate));
      -webkit-backdrop-filter: blur(var(--_blur)) saturate(var(--_saturate));
      border: 1px solid var(--_border);
      border-radius: 14px;
      box-shadow: var(--_shadow);
      display: flex;
      flex-direction: column;
      user-select: none;
      font-size: var(--hp-font-size, 14px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', system-ui, sans-serif;
      overflow: hidden;
      transition: box-shadow 0.25s ease;
    }
    .hp-panel:hover {
      box-shadow: var(--_shadow), 0 0 0 1px rgba(255,255,255,0.04) inset;
    }
    .hp-panel.minimized {
      width: auto !important;
      height: auto !important;
      border-radius: 10px;
      box-shadow: var(--_shadow);
    }

    /* 玻璃高光 */
    .hp-glass-shine {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      border-radius: inherit;
      background:
        radial-gradient(160% 120% at 0% 0%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 50%, transparent 100%),
        linear-gradient(170deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 40%, rgba(255,255,255,0.03) 100%);
    }

    /* ========================================
       标题栏
       ======================================== */
    .hp-titlebar {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 12px;
      cursor: move;
      flex-shrink: 0;
      border-bottom: 1px solid var(--_border);
      background: rgba(255,255,255,0.03);
    }
    .hp-title-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--_primary);
      flex-shrink: 0;
      box-shadow: 0 0 6px rgba(var(--_primary-rgb), 0.4);
    }
    .hp-title {
      font-weight: 600;
      font-size: 0.95em;
      color: var(--_text);
      letter-spacing: 0.02em;
    }
    .hp-ssh-badge {
      margin-left: 2px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.78em;
      font-weight: 500;
      color: var(--_primary);
      background: rgba(var(--_primary-rgb), 0.12);
      border: 1px solid rgba(var(--_primary-rgb), 0.2);
    }
    .hp-title-spacer { flex: 1; }
    .hp-title-btn {
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      font-size: 13px;
      cursor: pointer;
      color: var(--_text-muted);
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .hp-title-btn:hover { background: var(--_hover); color: var(--_text); }
    .hp-title-btn-mem { font-size: 14px; }
    .hp-title-btn-mem.active { color: #f9e2af; background: rgba(249,226,175,0.14); }
    .hp-title-btn-mem:hover { color: #f9e2af; }
    .hp-title-btn-close:hover { background: rgba(243,139,168,0.2); color: var(--_danger); }

    /* ========================================
       搜索栏
       ======================================== */
    .hp-search {
      position: relative; z-index: 1;
      display: flex; gap: 8px;
      padding: 10px 12px;
      flex-shrink: 0;
    }
    .hp-filter-dropdown { flex-shrink: 0; }
    .hp-filter-trigger {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 10px 7px 12px;
      border-radius: 10px; cursor: pointer;
      background: var(--_input-bg);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid var(--_border);
      color: var(--_text-secondary);
      font-size: 0.85em; font-weight: 500;
      transition: all 0.18s ease;
      white-space: nowrap; user-select: none;
      min-width: 90px;
    }
    .hp-filter-trigger:hover { border-color: rgba(var(--_primary-rgb), 0.5); background: var(--_hover); }
    .hp-filter-dropdown.open .hp-filter-trigger { border-color: var(--_primary); box-shadow: 0 0 0 3px rgba(var(--_primary-rgb), 0.12); }
    .hp-filter-label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
    .hp-filter-arrow { font-size: 0.65em; color: var(--_text-muted); transition: transform 0.18s; flex-shrink: 0; }

    .hp-filter-backdrop { position: fixed; inset: 0; z-index: 100000; }
    .hp-filter-menu {
      position: fixed; z-index: 100001;
      min-width: 150px; max-width: 240px; max-height: 220px;
      overflow-y: auto; overflow-x: hidden;
      background: rgb(var(--_bg-rgb, 22,22,28));
      border: 1px solid var(--_border);
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.55);
      padding: 6px;
    }
    .hp-filter-option {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 10px; border-radius: 8px;
      font-size: 0.84em; color: var(--_text-secondary);
      cursor: pointer; transition: all 0.1s;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .hp-filter-option:hover { background: var(--_hover); color: var(--_text); }
    .hp-filter-option.active { background: rgba(var(--_primary-rgb), 0.12); color: var(--_primary); font-weight: 600; }
    .hp-filter-opt-icon { font-size: 0.85em; flex-shrink: 0; opacity: 0.6; }
    .hp-filter-opt-divider { height: 1px; margin: 4px 8px; background: var(--_border); }
    .hp-filter-clear-btn {
      width: 18px; height: 18px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%; cursor: pointer;
      font-size: 0.65em; color: var(--_text-muted);
      background: rgba(255,255,255,0.06);
      transition: all 0.12s; flex-shrink: 0;
    }
    .hp-filter-clear-btn:hover { background: rgba(243,139,168,0.2); color: var(--_danger); }
    .hp-search-input-wrap {
      flex: 1; position: relative; display: flex; align-items: center;
    }
    .hp-search-input {
      width: 100%; padding: 7px 32px 7px 12px;
      border-radius: 10px; box-sizing: border-box;
      background: var(--_input-bg);
      border: 1px solid var(--_border);
      color: var(--_text);
      font-size: 0.9em; outline: none;
      transition: border-color 0.15s;
    }
    .hp-search-input::placeholder { color: var(--_text-muted); }
    .hp-search-input:focus { border-color: var(--_primary); }
    .hp-search-clear {
      position: absolute; right: 8px;
      width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      font-size: 11px; cursor: pointer;
      color: var(--_text-muted);
      background: rgba(255,255,255,0.06);
      transition: all 0.12s;
    }
    .hp-search-clear:hover { background: rgba(255,255,255,0.14); color: var(--_text); }

    /* ========================================
       快捷主机栏
       ======================================== */
    .hp-quick-bar {
      position: relative; z-index: 1;
      display: flex; gap: 6px;
      padding: 0 12px 10px;
      flex-shrink: 0;
      overflow-x: auto;
    }
    .hp-quick-host {
      display: flex; align-items: center; gap: 4px;
      flex-shrink: 0;
      padding: 5px 12px;
      border-radius: 20px;
      background: rgba(var(--_primary-rgb), 0.10);
      border: 1px solid rgba(var(--_primary-rgb), 0.18);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .hp-quick-host:hover {
      background: rgba(var(--_primary-rgb), 0.18);
      border-color: rgba(var(--_primary-rgb), 0.32);
      transform: translateY(-1px);
    }
    .hp-quick-icon { font-size: 0.75em; color: var(--_primary); flex-shrink: 0; }
    .hp-quick-name {
      font-size: 0.82em; font-weight: 500;
      color: var(--_text);
      max-width: 120px; overflow: hidden; text-overflow: ellipsis;
    }

    /* ========================================
       主机列表 & 分组头
       ======================================== */
    .hp-list {
      position: relative; z-index: 1;
      flex: 1; overflow-y: auto; overflow-x: hidden;
      padding: 0 8px; min-width: 0;
    }
    .hp-group-header {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 10px;
      margin: 2px 0;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.12s;
      position: relative;
      z-index: 1;
    }
    .hp-group-header:hover { background: var(--_hover); }
    .hp-group-header.drag-over {
      outline: 2px solid var(--_primary);
      outline-offset: -1px;
    }
    .hp-group-arrow {
      font-size: 0.65em; color: var(--_text-muted);
      width: 14px; text-align: center; flex-shrink: 0;
      transition: transform 0.15s;
    }
    .hp-group-icon { font-size: 0.8em; flex-shrink: 0; }
    .hp-group-name {
      font-weight: 600; font-size: 0.88em;
      color: var(--_group-name);
      flex: 1; min-width: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .hp-group-count {
      font-size: 0.72em; font-weight: 600;
      color: var(--_text-muted);
      background: var(--_surface);
      padding: 2px 7px; border-radius: 10px;
      flex-shrink: 0;
    }
    .hp-group-actions {
      display: flex; gap: 2px; flex-shrink: 0;
      opacity: 0; transition: opacity 0.12s;
    }
    .hp-group-header:hover .hp-group-actions { opacity: 1; }
    .hp-group-act {
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      font-size: 0.9em; cursor: pointer;
      color: var(--_text-muted);
      transition: all 0.12s;
    }
    .hp-group-act:hover { background: var(--_hover); color: var(--_text); }
    .hp-group-act-del:hover { background: rgba(243,139,168,0.15); color: var(--_danger); }

    /* ========================================
       主机行
       ======================================== */
    .hp-host-group-body {
      position: relative; z-index: 1;
      padding: 2px 0 2px 12px;
      border-left: 1px solid var(--_border);
      margin-left: 12px;
    }
    .hp-host-row {
      display: flex; align-items: flex-start; gap: 6px;
      padding: 8px 10px; margin: 2px 0;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.12s;
      background: transparent;
      border: 1px solid transparent;
    }
    .hp-host-row:hover, .hp-host-row.highlighted {
      background: var(--_surface);
      border-color: var(--_border);
    }
    .hp-host-row.drag-over { border-top: 2px solid var(--_primary); }
    .hp-host-row.drag-over-bottom { border-bottom: 2px solid var(--_primary); }
    .hp-host-row.dragging { opacity: 0.35; }
    .hp-host-drag {
      font-size: 15px; color: var(--_text-muted); cursor: grab;
      flex-shrink: 0; width: 16px; text-align: center;
      user-select: none; letter-spacing: -2px;
      padding-top: 2px;
    }
    .hp-host-drag:active { cursor: grabbing; }
    .hp-host-body { flex: 1; min-width: 0; }
    .hp-host-name {
      display: block; font-size: 0.9em; font-weight: 600;
      color: var(--_text); line-height: 1.4;
    }
    .hp-host-details {
      display: flex; gap: 8px; flex-wrap: wrap;
      margin-top: 2px;
    }
    .hp-host-detail {
      font-size: 0.72em;
      color: var(--_text-secondary);
      white-space: nowrap;
    }
    .hp-host-addr {
      font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace;
    }
    .hp-host-addr .hp-host-port {
      color: var(--_text-muted);
      opacity: 0.7;
    }
    .hp-host-user {
      color: var(--_primary);
      font-weight: 500;
    }
    .hp-host-user::before { content: '@'; margin-right: 1px; opacity: 0.6; }
    .hp-host-remark {
      display: block; font-size: 0.72em;
      color: var(--_text-muted);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin-top: 2px;
      font-style: italic;
    }
    .hp-host-actions {
      display: flex; gap: 1px; flex-shrink: 0;
      opacity: 0; transition: opacity 0.12s;
      padding-top: 2px;
    }
    .hp-host-row:hover .hp-host-actions { opacity: 1; }
    .hp-host-act {
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      font-size: 0.85em; cursor: pointer;
      color: var(--_text-muted);
      transition: all 0.12s;
    }
    .hp-host-act:hover { background: var(--_hover); color: var(--_text); }
    .hp-host-act.active { color: var(--_primary); opacity: 1 !important; }
    .hp-host-act-connect:hover { background: rgba(var(--_primary-rgb), 0.14); color: var(--_primary); }
    .hp-host-act-copy:hover { background: rgba(var(--_primary-rgb), 0.10); color: var(--_primary); }
    .hp-host-act-del:hover { background: rgba(243,139,168,0.15); color: var(--_danger); }
    .hp-drop-end {
      height: 0; transition: height 0.12s;
      border-radius: 6px; margin: 2px 10px;
    }
    .hp-drop-end.drag-over { height: 4px; background: var(--_primary); }

    /* ========================================
       空状态
       ======================================== */
    .hp-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px 20px; text-align: center;
    }
    .hp-empty-icon { font-size: 28px; opacity: 0.5; }
    .hp-empty span:last-child {
      font-size: 0.88em; color: var(--_text-muted);
      line-height: 1.5;
    }

    /* ========================================
       底部栏
       ======================================== */
    .hp-footer {
      position: relative; z-index: 1;
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px;
      border-top: 1px solid var(--_border);
      flex-shrink: 0;
    }
    .hp-footer-btn {
      font-size: 0.82em; font-weight: 500;
      cursor: pointer;
      padding: 5px 10px; border-radius: 8px;
      color: var(--_text-muted);
      transition: all 0.12s;
    }
    .hp-footer-btn:hover { background: var(--_hover); color: var(--_text); }
    .hp-footer-btn-primary { color: var(--_primary); }
    .hp-footer-btn-primary:hover { background: rgba(var(--_primary-rgb), 0.1); }
    .hp-footer-count {
      margin-left: auto;
      font-size: 0.78em; font-weight: 500;
      color: var(--_text-muted);
    }

    /* ========================================
       调整大小手柄
       ======================================== */
    .hp-rsz { position: absolute; z-index: 2; }
    .hp-rsz-e, .hp-rsz-w { top: 4px; bottom: 4px; width: 8px; cursor: ew-resize; }
    .hp-rsz-s, .hp-rsz-n { left: 4px; right: 4px; height: 8px; cursor: ns-resize; }
    .hp-rsz-e { right: 0; border-radius: 0 14px 14px 0; }
    .hp-rsz-w { left: 0; border-radius: 14px 0 0 14px; }
    .hp-rsz-s { bottom: 0; border-radius: 0 0 14px 14px; }
    .hp-rsz-n { top: 0; border-radius: 14px 14px 0 0; }
    .hp-rsz-se, .hp-rsz-sw, .hp-rsz-ne, .hp-rsz-nw { width: 14px; height: 14px; }
    .hp-rsz-se { right: 0; bottom: 0; cursor: nwse-resize; }
    .hp-rsz-sw { left: 0; bottom: 0; cursor: nesw-resize; }
    .hp-rsz-ne { right: 0; top: 0; cursor: nesw-resize; }
    .hp-rsz-nw { left: 0; top: 0; cursor: nwse-resize; }

    /* ========================================
       弹窗通用
       ======================================== */
    .hp-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 100000;
    }
    .hp-modal {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: var(--_bg);
      backdrop-filter: blur(calc(var(--_blur) * 1.2)) saturate(var(--_saturate));
      -webkit-backdrop-filter: blur(calc(var(--_blur) * 1.2)) saturate(var(--_saturate));
      border: 1px solid var(--_border);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      z-index: 100001;
      width: 500px; max-width: 92vw;
      overflow: hidden;
      isolation: isolate;
    }
    .hp-modal-sm { width: 380px; }
    .hp-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--_border);
      background: rgba(255,255,255,0.02);
    }
    .hp-modal-title {
      font-weight: 600; font-size: 1em;
      color: var(--_text);
    }
    .hp-modal-body {
      padding: 20px;
      max-height: 55vh; overflow-y: auto;
    }
    .hp-modal-text {
      font-size: 0.9em; color: var(--_text-secondary);
      line-height: 1.6; margin: 0;
    }
    .hp-modal-footer {
      display: flex; gap: 8px; justify-content: flex-end;
      padding: 14px 20px;
      border-top: 1px solid var(--_border);
      background: rgba(255,255,255,0.015);
    }

    /* 表单字段 */
    .hp-field { margin-bottom: 14px; }
    .hp-field-row { display: flex; gap: 12px; }
    .hp-field-half { flex: 1; min-width: 0; }
    .hp-field-label {
      display: block; font-size: 0.78em; font-weight: 600;
      color: var(--_text-muted); margin-bottom: 5px;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .hp-field-input {
      width: 100%; padding: 9px 12px; border-radius: 10px;
      box-sizing: border-box;
      background: var(--_input-bg);
      border: 1px solid var(--_border);
      color: var(--_text);
      font-size: 0.92em; outline: none;
      transition: border-color 0.15s;
    }
    .hp-field-input:focus { border-color: var(--_primary); }
    select.hp-field-input {
      cursor: pointer; appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 30px;
    }
    select.hp-field-input option { color: #000; background: #fff; }

    /* 密码输入框 + 眼睛切换 */
    .hp-password-wrap {
      position: relative; display: flex; align-items: center;
    }
    .hp-password-input {
      padding-right: 40px;
    }
    .hp-password-eye {
      position: absolute; right: 8px;
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      cursor: pointer; font-size: 1.1em; user-select: none;
      color: var(--_text-muted);
      transition: all 0.12s;
    }
    .hp-password-eye:hover { background: var(--_hover); color: var(--_text); }
    .hp-password-eye.active { color: var(--_primary); }
    .hp-password-eye.active:hover { color: var(--_primary); opacity: 0.8; }

    /* 认证方式选择 */
    .hp-auth-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .hp-auth-option {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 6px;
      border: 1px solid var(--_border);
      cursor: pointer; font-size: 0.88em; color: var(--_text-secondary);
      transition: all 0.15s; user-select: none;
    }
    .hp-auth-option:hover { border-color: var(--_primary); }
    .hp-auth-option.active {
      border-color: var(--_primary);
      background: rgba(var(--_primary-rgb), 0.08);
      color: var(--_text);
    }
    .hp-auth-option input { margin: 0; accent-color: var(--_primary); }

    /* 私钥路径选择 */
    .hp-key-wrap { display: flex; gap: 8px; align-items: center; }
    .hp-key-input { flex: 1; min-width: 0; }
    .hp-key-browse {
      flex-shrink: 0; padding: 7px 12px; border-radius: 6px;
      border: 1px solid var(--_border); background: var(--_surface);
      font-size: 0.85em; cursor: pointer; color: var(--_text-secondary);
      transition: all 0.15s; white-space: nowrap;
    }
    .hp-key-browse:hover { border-color: var(--_primary); color: var(--_text); }
    .hp-field-hint { margin: 6px 0 0; font-size: 0.78em; color: var(--_text-muted); line-height: 1.5; }

    /* 端口转发 */
    .hp-pf-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .hp-pf-rule {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
      padding: 8px 10px; border: 1px solid var(--_border); border-radius: 8px;
      background: var(--_surface);
    }
    .hp-pf-rule-main {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      font-size: 0.86em; color: var(--_text); font-family: monospace;
      overflow-wrap: anywhere;
    }
    .hp-pf-rule-arrow { color: var(--_primary); }
    .hp-pf-rule-desc {
      flex-basis: 100%; font-family: inherit;
      font-size: 0.92em; color: var(--_text-muted);
    }
    .hp-pf-rule-del {
      flex-shrink: 0; color: var(--_text-muted);
      cursor: pointer; padding: 0 2px;
    }
    .hp-pf-rule-del:hover { color: var(--_danger); }
    .hp-pf-add { border-top: 1px dashed var(--_border); padding-top: 12px; }
    .hp-pf-add .hp-field { margin-bottom: 8px; }
    .hp-pf-add-btn { width: 100%; justify-content: center; }

    /* 复选框行 */
    .hp-check-row { display: flex; gap: 18px; margin: 12px 0; }
    .hp-check {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.88em; color: var(--_text-secondary);
      cursor: pointer;
    }
    .hp-check input[type="checkbox"] {
      width: 16px; height: 16px; margin: 0;
      accent-color: var(--_primary); cursor: pointer;
    }

    /* 用量行 */
    .hp-usage-row {
      display: flex; align-items: center; gap: 10px;
      margin-top: 4px; padding: 8px 12px;
      border-radius: 8px; background: var(--_surface);
      font-size: 0.8em; color: var(--_text-muted);
    }
    .hp-usage-label strong { color: var(--_text); font-size: 1.05em; }
    .hp-usage-reset {
      margin-left: auto; cursor: pointer;
      color: var(--_warning); font-size: 0.85em;
      padding: 3px 10px; border-radius: 6px;
      transition: background 0.12s;
    }
    .hp-usage-reset:hover { background: rgba(250,179,135,0.12); }

    /* 按钮 */
    .hp-btn {
      padding: 8px 20px; border-radius: 10px;
      border: 1px solid var(--_border);
      background: var(--_surface);
      color: var(--_text);
      font-size: 0.88em; font-weight: 500;
      cursor: pointer;
      transition: all 0.12s;
    }
    .hp-btn:hover { background: var(--_hover); }
    .hp-btn-primary {
      background: var(--_primary);
      color: #fff;
      border-color: var(--_primary);
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(var(--_primary-rgb), 0.3);
    }
    .hp-btn-primary:hover {
      opacity: 0.9;
      box-shadow: 0 6px 20px rgba(var(--_primary-rgb), 0.4);
      transform: translateY(-1px);
    }
    .hp-btn-ghost {
      background: transparent; border-color: transparent;
      color: var(--_text-muted);
    }
    .hp-btn-ghost:hover { background: var(--_hover); color: var(--_text); }

    /* ========================================
       滚动条
       ======================================== */
    .hp-list::-webkit-scrollbar,
    .hp-quick-bar::-webkit-scrollbar,
    .hp-modal-body::-webkit-scrollbar {
      width: 5px; height: 5px;
    }
    .hp-list::-webkit-scrollbar-track,
    .hp-quick-bar::-webkit-scrollbar-track,
    .hp-modal-body::-webkit-scrollbar-track {
      background: transparent;
    }
    .hp-list::-webkit-scrollbar-thumb,
    .hp-quick-bar::-webkit-scrollbar-thumb,
    .hp-modal-body::-webkit-scrollbar-thumb {
      background: var(--_border);
      border-radius: 10px;
    }
    .hp-list::-webkit-scrollbar-thumb:hover,
    .hp-quick-bar::-webkit-scrollbar-thumb:hover,
    .hp-modal-body::-webkit-scrollbar-thumb:hover {
      background: var(--_text-muted);
    }
  `],
    })
], HostFloatingPanel);



/***/ },

/***/ "./src/host-i18n.service.ts"
/*!**********************************!*\
  !*** ./src/host-i18n.service.ts ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HostI18nService: () => (/* binding */ HostI18nService)
/* harmony export */ });
/**
 * Host+ 国际化服务
 * 五级回退语言检测 + 中英双语翻译
 */
const translations = {
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
};
class HostI18nService {
    constructor() {
        this.locale = 'zh-CN';
        this.detectLocale();
    }
    detectLocale() {
        const saved = localStorage.getItem('hp-locale');
        if (saved && saved !== 'auto') {
            this.locale = saved === 'en-US' ? 'en-US' : 'zh-CN';
            return;
        }
        const checks = [
            () => {
                var _a, _b, _c, _d;
                const keys = ['locale', 'language', 'tabby-language', 'tabby-locale',
                    'config', 'tabby-config', 'settings', 'tabby-settings', 'tabby-config.json'];
                for (const key of keys) {
                    const raw = localStorage.getItem(key);
                    if (!raw)
                        continue;
                    if (/^zh/i.test(raw))
                        return 'zh-CN';
                    if (/^en/i.test(raw))
                        return 'en-US';
                    try {
                        const obj = JSON.parse(raw);
                        const lang = ((_a = obj === null || obj === void 0 ? void 0 : obj.appearance) === null || _a === void 0 ? void 0 : _a.language) || ((_b = obj === null || obj === void 0 ? void 0 : obj.appearance) === null || _b === void 0 ? void 0 : _b.locale)
                            || (obj === null || obj === void 0 ? void 0 : obj.language) || (obj === null || obj === void 0 ? void 0 : obj.locale) || ((_c = obj === null || obj === void 0 ? void 0 : obj.app) === null || _c === void 0 ? void 0 : _c.language) || ((_d = obj === null || obj === void 0 ? void 0 : obj.general) === null || _d === void 0 ? void 0 : _d.language);
                        if (lang)
                            return /^zh/i.test(String(lang)) ? 'zh-CN' : 'en-US';
                    }
                    catch (_e) { }
                }
                return null;
            },
            () => {
                try {
                    const e = (typeof process !== 'undefined' && process.env);
                    if (e) {
                        const lc = e.LC_ALL || e.LANG || e.LANGUAGE || '';
                        if (/^zh/i.test(lc))
                            return 'zh-CN';
                        if (/^en/i.test(lc))
                            return 'en-US';
                    }
                }
                catch (_a) { }
                return null;
            },
            () => {
                var _a;
                try {
                    const dl = ((_a = document.documentElement) === null || _a === void 0 ? void 0 : _a.lang) || '';
                    if (/^zh/i.test(dl))
                        return 'zh-CN';
                    if (/^en/i.test(dl))
                        return 'en-US';
                }
                catch (_b) { }
                return null;
            },
            () => {
                try {
                    const nl = navigator.languages || [navigator.language];
                    for (const lang of nl) {
                        if (lang.startsWith('zh'))
                            return 'zh-CN';
                    }
                    for (const lang of nl) {
                        if (lang.startsWith('en'))
                            return 'en-US';
                    }
                }
                catch (_a) { }
                return null;
            },
        ];
        for (const check of checks) {
            const result = check();
            if (result) {
                this.locale = result;
                return;
            }
        }
        this.locale = 'zh-CN';
    }
    t(key, params) {
        var _a, _b, _c, _d;
        let text = (_d = (_b = (_a = translations[this.locale]) === null || _a === void 0 ? void 0 : _a[key]) !== null && _b !== void 0 ? _b : (_c = translations['en-US']) === null || _c === void 0 ? void 0 : _c[key]) !== null && _d !== void 0 ? _d : key;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                text = text.replace(`{${k}}`, String(v));
            }
        }
        return text;
    }
    setLocale(locale) {
        localStorage.setItem('hp-locale', locale);
        if (locale === 'auto') {
            this.detectLocale();
        }
        else {
            this.locale = locale === 'en-US' ? 'en-US' : 'zh-CN';
        }
    }
    getLocale() {
        return this.locale;
    }
}


/***/ },

/***/ "./src/host-settings.component.ts"
/*!****************************************!*\
  !*** ./src/host-settings.component.ts ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HostSettingsComponent: () => (/* binding */ HostSettingsComponent),
/* harmony export */   HostSettingsTabProvider: () => (/* binding */ HostSettingsTabProvider)
/* harmony export */ });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "@angular/core");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_angular_core__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var tabby_settings__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tabby-settings */ "tabby-settings");
/* harmony import */ var tabby_settings__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(tabby_settings__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _host_data_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./host-data.service */ "./src/host-data.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/**
 * Host+ 设置面板
 * 功能描述：在 Tabby 设置左侧栏注册 Host+ 配置入口（语言、主题、数据备份）
 */



function detectSystemLocale() {
    var _a, _b, _c, _d;
    try {
        const keys = ['locale', 'language', 'tabby-language', 'tabby-locale',
            'config', 'tabby-config', 'settings', 'tabby-settings', 'tabby-config.json'];
        for (const key of keys) {
            const raw = localStorage.getItem(key);
            if (!raw)
                continue;
            if (/^zh/i.test(raw))
                return 'zh-CN';
            if (/^en/i.test(raw))
                return 'en-US';
            try {
                const obj = JSON.parse(raw);
                const lang = ((_a = obj === null || obj === void 0 ? void 0 : obj.appearance) === null || _a === void 0 ? void 0 : _a.language) || ((_b = obj === null || obj === void 0 ? void 0 : obj.appearance) === null || _b === void 0 ? void 0 : _b.locale)
                    || (obj === null || obj === void 0 ? void 0 : obj.language) || (obj === null || obj === void 0 ? void 0 : obj.locale) || ((_c = obj === null || obj === void 0 ? void 0 : obj.app) === null || _c === void 0 ? void 0 : _c.language) || ((_d = obj === null || obj === void 0 ? void 0 : obj.general) === null || _d === void 0 ? void 0 : _d.language);
                if (lang)
                    return /^zh/i.test(String(lang)) ? 'zh-CN' : 'en-US';
            }
            catch (_e) { }
        }
    }
    catch (_f) { }
    try {
        const langs = navigator.languages || [navigator.language];
        const zhLang = langs.find(l => /^zh/i.test(l));
        if (zhLang)
            return 'zh-CN';
    }
    catch (_g) { }
    try {
        const navLang = navigator.language || '';
        if (navLang)
            return /^zh/i.test(navLang) ? 'zh-CN' : 'en-US';
    }
    catch (_h) { }
    return 'zh-CN';
}
let HostSettingsComponent = class HostSettingsComponent {
    get effectiveLang() {
        if (this.lang === 'zh-CN' || this.lang === 'en-US')
            return this.lang;
        return detectSystemLocale();
    }
    t(zh, en) {
        if (this.effectiveLang === 'en-US' && en)
            return en;
        return zh;
    }
    themeLabel(c) {
        const labels = {
            'acrylic-light': ['毛玻璃·浅', 'Acrylic Light'],
            'acrylic-dark': ['毛玻璃·深', 'Acrylic Dark'],
            'ocean': ['海洋蓝', 'Ocean'],
            'forest': ['森林绿', 'Forest'],
            'sunset': ['日落橙', 'Sunset'],
            'lavender': ['薰衣草紫', 'Lavender'],
            'custom': ['自定义', 'Custom'],
        };
        const pair = labels[c.value];
        if (pair)
            return this.t(pair[0], pair[1]);
        return c.label || '';
    }
    constructor() {
        this.hosts = [];
        this.groups = [];
        this.lang = (() => {
            const v = localStorage.getItem('hp-locale');
            if (v === 'zh-CN' || v === 'en-US')
                return v;
            return '';
        })();
        this.colorThemes = [
            { value: 'acrylic-light', label: '毛玻璃·浅', bg: 'rgba(213,213,216,0.96)', bgRgb: '213,213,216', text: '#162234', textSecondary: '#939aa7', textMuted: '#8c97ab', groupName: '#4a6080', primary: '#4f7dff', primaryRgb: '79,125,255', surface: 'rgba(255,255,255,0.34)', surfaceRgb: '255,255,255', border: 'rgba(255,255,255,0.28)', inputBg: 'rgba(255,255,255,0.52)', hover: 'rgba(255,255,255,0.24)', blur: '28px', saturate: '180%', shadow: '0 10px 38px rgba(0,0,0,0.16)' },
            { value: 'acrylic-dark', label: '毛玻璃·深', bg: 'rgba(20,20,20,0.52)', bgRgb: '20,20,20', text: '#e8e8e8', textSecondary: '#b2b2b2', textMuted: '#8f8f8f', groupName: '#b2b2b2', primary: '#5b8def', primaryRgb: '91,141,239', surface: 'rgba(45,45,45,0.42)', surfaceRgb: '45,45,45', border: 'rgba(255,255,255,0.10)', inputBg: 'rgba(255,255,255,0.08)', hover: 'rgba(255,255,255,0.06)', blur: '30px', saturate: '145%', shadow: '0 10px 38px rgba(0,0,0,0.40)' },
            { value: 'ocean', label: '海洋蓝', bg: 'rgba(8,24,48,0.60)', bgRgb: '8,24,48', text: '#e0f0ff', textSecondary: '#90b8e0', textMuted: '#5888b8', groupName: '#90b8e0', primary: '#22d3ee', primaryRgb: '34,211,238', surface: 'rgba(20,50,90,0.35)', surfaceRgb: '20,50,90', border: 'rgba(100,180,240,0.14)', inputBg: 'rgba(10,30,60,0.50)', hover: 'rgba(100,160,220,0.08)', blur: '26px', saturate: '170%', shadow: '0 10px 38px rgba(0,40,80,0.40)' },
            { value: 'forest', label: '森林绿', bg: 'rgba(8,28,16,0.58)', bgRgb: '8,28,16', text: '#d8f8e0', textSecondary: '#80c898', textMuted: '#509868', groupName: '#80c898', primary: '#34d399', primaryRgb: '52,211,153', surface: 'rgba(16,50,28,0.35)', surfaceRgb: '16,50,28', border: 'rgba(80,180,120,0.12)', inputBg: 'rgba(8,30,16,0.48)', hover: 'rgba(80,160,100,0.08)', blur: '26px', saturate: '155%', shadow: '0 10px 38px rgba(0,30,10,0.40)' },
            { value: 'sunset', label: '日落橙', bg: 'rgba(40,16,8,0.62)', bgRgb: '40,16,8', text: '#ffe8d8', textSecondary: '#d0a088', textMuted: '#a07058', groupName: '#d0a088', primary: '#fb923c', primaryRgb: '251,146,60', surface: 'rgba(60,24,12,0.38)', surfaceRgb: '60,24,12', border: 'rgba(200,120,80,0.14)', inputBg: 'rgba(30,10,4,0.50)', hover: 'rgba(200,100,60,0.08)', blur: '24px', saturate: '150%', shadow: '0 10px 38px rgba(40,10,0,0.40)' },
            { value: 'lavender', label: '薰衣草紫', bg: 'rgba(22,14,36,0.58)', bgRgb: '22,14,36', text: '#ece0fc', textSecondary: '#b098d0', textMuted: '#7a60a8', groupName: '#b098d0', primary: '#a78bfa', primaryRgb: '167,139,250', surface: 'rgba(36,22,58,0.38)', surfaceRgb: '36,22,58', border: 'rgba(150,120,210,0.14)', inputBg: 'rgba(18,10,30,0.50)', hover: 'rgba(140,100,200,0.08)', blur: '28px', saturate: '160%', shadow: '0 10px 38px rgba(20,10,30,0.40)' },
            { value: 'custom', label: '自定义', bg: 'rgba(22,22,28,0.72)', bgRgb: '22,22,28', text: '#e8e8e8', textSecondary: '#b0b0b0', textMuted: '#7a7a8a', groupName: '#b0b0b0', primary: '#5b8def', primaryRgb: '91,141,239', surface: 'rgba(255,255,255,0.06)', surfaceRgb: '255,255,255', border: 'rgba(255,255,255,0.10)', inputBg: 'rgba(255,255,255,0.08)', hover: 'rgba(255,255,255,0.06)', blur: '24px', saturate: '160%', shadow: '0 8px 40px rgba(0,0,0,0.42)' },
        ];
        this.colorTheme = localStorage.getItem('hp-theme') || '';
        this.colorPrimary = localStorage.getItem('hp-color-primary') || '';
        this.colorPrimaryRgb = localStorage.getItem('hp-color-primary-rgb') || '';
        this.colorBg = localStorage.getItem('hp-color-bg') || '';
        this.colorBgRgb = localStorage.getItem('hp-color-bg-rgb') || '';
        this.colorText = localStorage.getItem('hp-color-text') || '';
        this.colorTextSecondary = localStorage.getItem('hp-color-text-secondary') || '';
        this.colorMuted = localStorage.getItem('hp-color-text-muted') || '';
        this.colorGroupName = localStorage.getItem('hp-color-group-name') || '';
        this.colorSurface = localStorage.getItem('hp-color-surface') || '';
        this.colorSurfaceRgb = localStorage.getItem('hp-color-surface-rgb') || '';
        this.colorBorder = localStorage.getItem('hp-color-border') || '';
        this.colorHover = localStorage.getItem('hp-color-hover') || '';
        this.colorInputBg = localStorage.getItem('hp-color-input-bg') || '';
        this.colorBlur = localStorage.getItem('hp-color-blur') || '';
        this.colorSaturate = localStorage.getItem('hp-color-saturate') || '';
        this.colorShadow = localStorage.getItem('hp-color-shadow') || '';
        this.fontSize = +(localStorage.getItem('hp-font-size') || '14');
        this.entryMode = new _host_data_service__WEBPACK_IMPORTED_MODULE_2__.HostDataService().getEntryMode();
        this.svc = new _host_data_service__WEBPACK_IMPORTED_MODULE_2__.HostDataService();
        this.showClearConfirm = false;
        this.clearConfirmInput = '';
        this.refresh();
        if (this.colorTheme && this.colorTheme !== 'custom' && this.colorTheme !== '') {
            this.setColorTheme(this.colorTheme);
        }
        if (this.colorTheme === 'custom' && this.colorPrimary && this.colorBg && this.colorText) {
            const root = document.documentElement;
            const apply = (prop, key) => {
                const val = localStorage.getItem(`hp-color-${key}`);
                if (val)
                    root.style.setProperty(`--hp-${prop}`, val);
            };
            apply('primary', 'primary');
            apply('primary-rgb', 'primary-rgb');
            apply('bg', 'bg');
            apply('bg-rgb', 'bg-rgb');
            apply('text', 'text');
            apply('text-secondary', 'text-secondary');
            apply('text-muted', 'text-muted');
            apply('group-name', 'group-name');
            apply('border', 'border');
            apply('surface', 'surface');
            apply('surface-rgb', 'surface-rgb');
            apply('hover', 'hover');
            apply('input-bg', 'input-bg');
            apply('blur', 'blur');
            apply('saturate', 'saturate');
            apply('shadow', 'shadow');
        }
        const savedFontSize = localStorage.getItem('hp-font-size');
        if (savedFontSize) {
            document.documentElement.style.setProperty('--hp-font-size', savedFontSize + 'px');
        }
    }
    refresh() {
        this.hosts = this.svc.getAll();
        this.groups = this.svc.getGroups();
        this.notifyPanels();
    }
    notifyPanels() {
        try {
            window.dispatchEvent(new CustomEvent('hp-data-changed'));
        }
        catch (_a) { }
    }
    onLangChange() {
        localStorage.setItem('hp-locale', this.lang || 'auto');
        window.dispatchEvent(new CustomEvent('hp-locale-changed', { detail: this.lang || 'auto' }));
        this.notifyPanels();
    }
    onFontSizeChange(val) {
        this.fontSize = Math.max(11, Math.min(18, val));
        localStorage.setItem('hp-font-size', String(this.fontSize));
        const root = document.documentElement;
        root.style.setProperty('--hp-font-size', this.fontSize + 'px');
        this.notifyPanels();
    }
    onEntryModeChange() {
        new _host_data_service__WEBPACK_IMPORTED_MODULE_2__.HostDataService().saveEntryMode(this.entryMode);
        window.dispatchEvent(new CustomEvent('hp-entry-mode-changed', { detail: this.entryMode }));
        if (typeof window.__hpRebuildEntry === 'function') {
            ;
            window.__hpRebuildEntry();
        }
        try {
            const els = document.querySelectorAll('[data-hp-entry="1"]');
            for (let i = 0; i < els.length; i++) {
                const el = els[i];
                el.dispatchEvent(new CustomEvent('hp-mode-change', { bubbles: true }));
            }
        }
        catch (_a) { }
    }
    openGithub() {
        const url = 'https://github.com/iishen717/Tabby-Host-Plus';
        try {
            ;
            window.require('electron').shell.openExternal(url);
        }
        catch (_a) {
            try {
                window.open(url, '_blank');
            }
            catch (_b) {
                location.href = url;
            }
        }
    }
    setColorTheme(value) {
        this.colorTheme = value;
        localStorage.setItem('hp-theme', value);
        if (value === 'custom') {
            const savedPrimary = localStorage.getItem('hp-color-primary');
            if (savedPrimary) {
                this.colorPrimary = savedPrimary;
                this.colorPrimaryRgb = localStorage.getItem('hp-color-primary-rgb') || '91,141,239';
                this.colorBg = localStorage.getItem('hp-color-bg') || 'rgba(22,22,28,0.72)';
                this.colorBgRgb = localStorage.getItem('hp-color-bg-rgb') || '22,22,28';
                this.colorText = localStorage.getItem('hp-color-text') || '#e8e8e8';
                this.colorTextSecondary = localStorage.getItem('hp-color-text-secondary') || '#b0b0b0';
                this.colorMuted = localStorage.getItem('hp-color-text-muted') || '#7a7a8a';
                this.colorSurface = localStorage.getItem('hp-color-surface') || 'rgba(255,255,255,0.06)';
                this.colorSurfaceRgb = localStorage.getItem('hp-color-surface-rgb') || '255,255,255';
                this.colorBorder = localStorage.getItem('hp-color-border') || 'rgba(255,255,255,0.10)';
                this.colorHover = localStorage.getItem('hp-color-hover') || 'rgba(255,255,255,0.06)';
                this.colorInputBg = localStorage.getItem('hp-color-input-bg') || 'rgba(255,255,255,0.08)';
                this.colorBlur = localStorage.getItem('hp-color-blur') || '24px';
                this.colorSaturate = localStorage.getItem('hp-color-saturate') || '160%';
                this.colorShadow = localStorage.getItem('hp-color-shadow') || '0 8px 40px rgba(0,0,0,0.42)';
                this.colorGroupName = localStorage.getItem('hp-color-group-name') || '#b0b0b0';
            }
            else {
                this.colorPrimary = '#5b8def';
                this.colorPrimaryRgb = '91,141,239';
                this.colorBg = 'rgba(22,22,28,0.72)';
                this.colorBgRgb = '22,22,28';
                this.colorText = '#e8e8e8';
                this.colorTextSecondary = '#b0b0b0';
                this.colorMuted = '#7a7a8a';
                this.colorSurface = 'rgba(255,255,255,0.06)';
                this.colorSurfaceRgb = '255,255,255';
                this.colorBorder = 'rgba(255,255,255,0.10)';
                this.colorHover = 'rgba(255,255,255,0.06)';
                this.colorInputBg = 'rgba(255,255,255,0.08)';
                this.colorBlur = '24px';
                this.colorSaturate = '160%';
                this.colorShadow = '0 8px 40px rgba(0,0,0,0.42)';
                this.colorGroupName = '#b0b0b0';
            }
            this.applyColorTheme();
            this.updateCustomPreview();
            return;
        }
        const p = this.colorThemes.find(t => t.value === value);
        if (value && p) {
            const root = document.documentElement;
            root.style.setProperty('--hp-primary', p.primary);
            root.style.setProperty('--hp-primary-rgb', p.primaryRgb);
            root.style.setProperty('--hp-bg', p.bg);
            root.style.setProperty('--hp-bg-rgb', p.bgRgb);
            root.style.setProperty('--hp-text', p.text);
            root.style.setProperty('--hp-text-secondary', p.textSecondary);
            root.style.setProperty('--hp-text-muted', p.textMuted);
            root.style.setProperty('--hp-border', p.border);
            root.style.setProperty('--hp-surface', p.surface);
            root.style.setProperty('--hp-surface-rgb', p.surfaceRgb);
            root.style.setProperty('--hp-hover', p.hover);
            root.style.setProperty('--hp-input-bg', p.inputBg);
            root.style.setProperty('--hp-blur', p.blur);
            root.style.setProperty('--hp-saturate', p.saturate);
            root.style.setProperty('--hp-shadow', p.shadow);
            if (p.groupName)
                root.style.setProperty('--hp-group-name', p.groupName);
        }
        else {
            this.colorPrimary = '';
            this.colorBg = '';
            this.colorText = '';
            this.clearColorVars();
        }
        this.notifyPanels();
    }
    applyColorTheme() {
        localStorage.setItem('hp-theme', 'custom');
        this.colorTheme = 'custom';
        this.saveColorVars();
        this.notifyPanels();
    }
    updateCustomPreview() {
        const custom = this.colorThemes.find(t => t.value === 'custom');
        if (custom) {
            custom.primary = this.colorPrimary;
            custom.primaryRgb = this.colorPrimaryRgb;
            custom.bg = this.colorBg;
            custom.bgRgb = this.colorBgRgb;
            custom.text = this.colorText;
            custom.textSecondary = this.colorTextSecondary;
            custom.textMuted = this.colorMuted;
            custom.groupName = this.colorGroupName;
            custom.surface = this.colorSurface;
            custom.surfaceRgb = this.colorSurfaceRgb;
            custom.border = this.colorBorder;
            custom.hover = this.colorHover;
            custom.inputBg = this.colorInputBg;
            custom.blur = this.colorBlur;
            custom.saturate = this.colorSaturate;
            custom.shadow = this.colorShadow;
        }
    }
    saveColorVars(p) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7;
        const root = document.documentElement;
        root.style.setProperty('--hp-primary', (_a = p === null || p === void 0 ? void 0 : p.primary) !== null && _a !== void 0 ? _a : this.colorPrimary);
        root.style.setProperty('--hp-primary-rgb', (_b = p === null || p === void 0 ? void 0 : p.primaryRgb) !== null && _b !== void 0 ? _b : this.colorPrimaryRgb);
        root.style.setProperty('--hp-bg', (_c = p === null || p === void 0 ? void 0 : p.bg) !== null && _c !== void 0 ? _c : this.colorBg);
        root.style.setProperty('--hp-bg-rgb', (_d = p === null || p === void 0 ? void 0 : p.bgRgb) !== null && _d !== void 0 ? _d : this.colorBgRgb);
        root.style.setProperty('--hp-text', (_e = p === null || p === void 0 ? void 0 : p.text) !== null && _e !== void 0 ? _e : this.colorText);
        root.style.setProperty('--hp-text-secondary', (_f = p === null || p === void 0 ? void 0 : p.textSecondary) !== null && _f !== void 0 ? _f : this.colorTextSecondary);
        root.style.setProperty('--hp-text-muted', (_g = p === null || p === void 0 ? void 0 : p.textMuted) !== null && _g !== void 0 ? _g : this.colorMuted);
        root.style.setProperty('--hp-border', (_h = p === null || p === void 0 ? void 0 : p.border) !== null && _h !== void 0 ? _h : this.colorBorder);
        root.style.setProperty('--hp-surface', (_j = p === null || p === void 0 ? void 0 : p.surface) !== null && _j !== void 0 ? _j : this.colorSurface);
        root.style.setProperty('--hp-surface-rgb', (_k = p === null || p === void 0 ? void 0 : p.surfaceRgb) !== null && _k !== void 0 ? _k : this.colorSurfaceRgb);
        root.style.setProperty('--hp-hover', (_l = p === null || p === void 0 ? void 0 : p.hover) !== null && _l !== void 0 ? _l : this.colorHover);
        root.style.setProperty('--hp-input-bg', (_m = p === null || p === void 0 ? void 0 : p.inputBg) !== null && _m !== void 0 ? _m : this.colorInputBg);
        root.style.setProperty('--hp-blur', (_o = p === null || p === void 0 ? void 0 : p.blur) !== null && _o !== void 0 ? _o : this.colorBlur);
        root.style.setProperty('--hp-saturate', (_p = p === null || p === void 0 ? void 0 : p.saturate) !== null && _p !== void 0 ? _p : this.colorSaturate);
        root.style.setProperty('--hp-shadow', (_q = p === null || p === void 0 ? void 0 : p.shadow) !== null && _q !== void 0 ? _q : this.colorShadow);
        root.style.setProperty('--hp-group-name', (_r = p === null || p === void 0 ? void 0 : p.groupName) !== null && _r !== void 0 ? _r : this.colorGroupName);
        const keys = [
            { k: 'primary', v: (_s = p === null || p === void 0 ? void 0 : p.primary) !== null && _s !== void 0 ? _s : this.colorPrimary },
            { k: 'primary-rgb', v: (_t = p === null || p === void 0 ? void 0 : p.primaryRgb) !== null && _t !== void 0 ? _t : this.colorPrimaryRgb },
            { k: 'bg', v: (_u = p === null || p === void 0 ? void 0 : p.bg) !== null && _u !== void 0 ? _u : this.colorBg },
            { k: 'bg-rgb', v: (_v = p === null || p === void 0 ? void 0 : p.bgRgb) !== null && _v !== void 0 ? _v : this.colorBgRgb },
            { k: 'text', v: (_w = p === null || p === void 0 ? void 0 : p.text) !== null && _w !== void 0 ? _w : this.colorText },
            { k: 'text-secondary', v: (_x = p === null || p === void 0 ? void 0 : p.textSecondary) !== null && _x !== void 0 ? _x : this.colorTextSecondary },
            { k: 'text-muted', v: (_y = p === null || p === void 0 ? void 0 : p.textMuted) !== null && _y !== void 0 ? _y : this.colorMuted },
            { k: 'group-name', v: (_z = p === null || p === void 0 ? void 0 : p.groupName) !== null && _z !== void 0 ? _z : this.colorGroupName },
            { k: 'border', v: (_0 = p === null || p === void 0 ? void 0 : p.border) !== null && _0 !== void 0 ? _0 : this.colorBorder },
            { k: 'surface', v: (_1 = p === null || p === void 0 ? void 0 : p.surface) !== null && _1 !== void 0 ? _1 : this.colorSurface },
            { k: 'surface-rgb', v: (_2 = p === null || p === void 0 ? void 0 : p.surfaceRgb) !== null && _2 !== void 0 ? _2 : this.colorSurfaceRgb },
            { k: 'hover', v: (_3 = p === null || p === void 0 ? void 0 : p.hover) !== null && _3 !== void 0 ? _3 : this.colorHover },
            { k: 'input-bg', v: (_4 = p === null || p === void 0 ? void 0 : p.inputBg) !== null && _4 !== void 0 ? _4 : this.colorInputBg },
            { k: 'blur', v: (_5 = p === null || p === void 0 ? void 0 : p.blur) !== null && _5 !== void 0 ? _5 : this.colorBlur },
            { k: 'saturate', v: (_6 = p === null || p === void 0 ? void 0 : p.saturate) !== null && _6 !== void 0 ? _6 : this.colorSaturate },
            { k: 'shadow', v: (_7 = p === null || p === void 0 ? void 0 : p.shadow) !== null && _7 !== void 0 ? _7 : this.colorShadow },
        ];
        keys.forEach(({ k, v }) => {
            localStorage.setItem(`hp-color-${k}`, v);
        });
    }
    clearColorVars() {
        const root = document.documentElement;
        const vars = ['--hp-primary', '--hp-primary-rgb', '--hp-bg', '--hp-bg-rgb', '--hp-text', '--hp-text-secondary', '--hp-text-muted',
            '--hp-group-name', '--hp-border', '--hp-surface', '--hp-surface-rgb', '--hp-hover', '--hp-input-bg', '--hp-blur', '--hp-saturate', '--hp-shadow'];
        vars.forEach(v => root.style.removeProperty(v));
        const allKeys = ['hp-color-primary', 'hp-color-primary-rgb', 'hp-color-bg', 'hp-color-bg-rgb',
            'hp-color-text', 'hp-color-text-secondary', 'hp-color-text-muted', 'hp-color-group-name',
            'hp-color-border', 'hp-color-surface', 'hp-color-surface-rgb', 'hp-color-hover',
            'hp-color-input-bg', 'hp-color-blur', 'hp-color-saturate', 'hp-color-shadow'];
        allKeys.forEach(k => localStorage.removeItem(k));
    }
    openClearConfirm() {
        this.clearConfirmInput = '';
        this.showClearConfirm = true;
        setTimeout(() => {
            const input = document.querySelector('.hp-edit-modal .hp-edit-input');
            if (input)
                input.focus();
        }, 50);
    }
    closeClearConfirm() {
        this.showClearConfirm = false;
        this.clearConfirmInput = '';
    }
    doClearData() {
        if (this.clearConfirmInput !== 'DELETE')
            return;
        this.showClearConfirm = false;
        this.clearConfirmInput = '';
        this.svc['hosts'] = [];
        this.svc['groups'] = [];
        this.svc['saveHosts']();
        this.svc['saveGroups']();
        this.refresh();
        alert(this.t('已清空所有数据', 'All data cleared'));
    }
    currentColor(c, key) {
        if (this.colorTheme === 'custom') {
            const map = {
                primary: this.colorPrimary, bg: this.colorBg, text: this.colorText,
                surface: this.colorSurface, border: this.colorBorder, muted: this.colorMuted,
                groupName: this.colorGroupName,
            };
            const val = map[key] || c[key] || c['textMuted'] || '';
            return this.toHexColor(val);
        }
        return this.toHexColor(c[key] || c['textMuted'] || '');
    }
    toHexColor(val) {
        if (!val)
            return '#808080';
        if (/^#[0-9a-fA-F]{3,8}$/.test(val))
            return val;
        const m = val.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (m) {
            return '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('');
        }
        return '#808080';
    }
    onColorChange(key, val) {
        if (this.colorTheme !== 'custom') {
            const activeTheme = this.colorThemes.find(t => t.value === this.colorTheme);
            if (activeTheme) {
                this.colorPrimary = activeTheme.primary;
                this.colorPrimaryRgb = activeTheme.primaryRgb || '';
                this.colorBg = activeTheme.bg;
                this.colorBgRgb = activeTheme.bgRgb || '';
                this.colorText = activeTheme.text;
                this.colorTextSecondary = activeTheme.textSecondary || '';
                this.colorMuted = activeTheme.textMuted || '';
                this.colorSurface = activeTheme.surface;
                this.colorSurfaceRgb = activeTheme.surfaceRgb || '';
                this.colorBorder = activeTheme.border;
                this.colorHover = activeTheme.hover || '';
                this.colorInputBg = activeTheme.inputBg || '';
                this.colorBlur = activeTheme.blur || '';
                this.colorSaturate = activeTheme.saturate || '';
                this.colorShadow = activeTheme.shadow || '';
                this.colorGroupName = activeTheme.groupName || '';
            }
            this.colorTheme = 'custom';
            localStorage.setItem('hp-theme', 'custom');
        }
        const map = {
            primary: this.colorPrimary, bg: this.colorBg, text: this.colorText,
            surface: this.colorSurface, border: this.colorBorder, muted: this.colorMuted,
            groupName: this.colorGroupName,
        };
        map[key] = val;
        ({ primary: this.colorPrimary, bg: this.colorBg, text: this.colorText,
            surface: this.colorSurface, border: this.colorBorder, muted: this.colorMuted,
            groupName: this.colorGroupName } = map);
        this.saveColorVars();
        this.updateCustomPreview();
        this.notifyPanels();
    }
    exportData() {
        const json = this.svc.exportAll();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        a.download = `host-plus_backup_${ts}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    onImport(event) {
        var _a;
        const input = event.target;
        const file = (_a = input === null || input === void 0 ? void 0 : input.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            const ok = this.svc.importAll(reader.result);
            if (ok)
                alert(this.t('导入成功', 'Import successful'));
            else
                alert(this.t('导入失败：文件格式无效', 'Import failed: invalid file format'));
            this.refresh();
        };
        reader.readAsText(file);
        input.value = '';
    }
};
HostSettingsComponent = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_0__.Component)({
        template: `
    <div class="hs-settings-page">
      <h3 class="hs-title">Host+</h3>
      <p class="hs-desc">{{ t('主机管理面板，创建和管理 SSH 主机连接。', 'Host management panel, create and manage SSH connections.') }}</p>

      <!-- 语言 -->
      <div class="hs-section">
        <label class="hs-label">{{ t('语言', 'Language') }}</label>
        <select [(ngModel)]="lang" (ngModelChange)="onLangChange()" class="hs-select">
          <option value="">{{ t('自动', 'Auto') }}</option>
          <option value="zh-CN">中文</option>
          <option value="en-US">English</option>
        </select>
      </div>

      <!-- 界面 -->
      <div class="hs-section">
        <label class="hs-label">{{ t('界面', 'Interface') }}</label>
        <div class="hs-color-row">
          <label *ngFor="let c of colorThemes" class="hs-color-swatch"
            [class.hs-color-active]="colorTheme === c.value"
            (click)="setColorTheme(c.value)">
            <span class="hs-color-swatch-name">{{ themeLabel(c) }}</span>
            <span class="hs-color-swatch-preview" [style.background]="c.bg">
              <span class="hs-cp-title" [style.background]="c.surface" [style.color]="c.text">{{ themeLabel(c) }}</span>
              <span class="hs-cp-body" [style.color]="c.muted">
                <span class="hs-cp-line" [style.color]="c.text">host</span>
                <span class="hs-cp-accent" [style.background]="c.primary"></span>
              </span>
            </span>
          </label>
        </div>

        <div class="hs-scheme-preview" *ngFor="let c of colorThemes" [hidden]="colorTheme !== c.value">
          <div class="hs-glass-preview" [style.background]="c.bg" [style.backdrop-filter]="'blur(' + (c.blur || '24px') + ') saturate(' + (c.saturate || '160%') + ')'" [style.border]="'1px solid ' + (c.border || 'rgba(255,255,255,0.1)')" [style.box-shadow]="c.shadow">
            <div class="hs-gp-titlebar" [style.background]="c.surface">
              <span class="hs-gp-dot" [style.background]="c.primary"></span>
              <span class="hs-gp-title" [style.color]="c.text">Host+</span>
            </div>
            <div class="hs-gp-body">
              <span class="hs-gp-host" [style.color]="c.textSecondary || c.text">Web Server</span>
              <span class="hs-gp-host" [style.color]="c.textMuted || c.muted">192.168.1.100</span>
            </div>
          </div>
          <div class="hs-color-fields">
            <div class="hs-color-field">
              <label>{{ t('主色调', 'Primary') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'primary')" (ngModelChange)="onColorChange('primary', $event)" class="hs-color-input">
              <span class="hs-color-val">{{ currentColor(c, 'primary') }}</span>
            </div>
            <div class="hs-color-field">
              <label>{{ t('背景', 'Bg') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'bg')" (ngModelChange)="onColorChange('bg', $event)" class="hs-color-input">
              <span class="hs-color-val">{{ currentColor(c, 'bg') }}</span>
            </div>
            <div class="hs-color-field">
              <label>{{ t('文字', 'Text') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'text')" (ngModelChange)="onColorChange('text', $event)" class="hs-color-input">
              <span class="hs-color-val">{{ currentColor(c, 'text') }}</span>
            </div>
            <div class="hs-color-field">
              <label>{{ t('标题栏', 'Surface') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'surface')" (ngModelChange)="onColorChange('surface', $event)" class="hs-color-input">
              <span class="hs-color-val">{{ currentColor(c, 'surface') }}</span>
            </div>
            <div class="hs-color-field">
              <label>{{ t('边框', 'Border') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'border')" (ngModelChange)="onColorChange('border', $event)" class="hs-color-input">
              <span class="hs-color-val">{{ currentColor(c, 'border') }}</span>
            </div>
            <div class="hs-color-field">
              <label>{{ t('次要文字', 'Muted') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'muted')" (ngModelChange)="onColorChange('muted', $event)" class="hs-color-input">
              <span class="hs-color-val">{{ currentColor(c, 'muted') }}</span>
            </div>
            <div class="hs-color-field">
              <label>{{ t('分组名称', 'Group Name') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'groupName')" (ngModelChange)="onColorChange('groupName', $event)" class="hs-color-input">
              <span class="hs-color-val">{{ currentColor(c, 'groupName') }}</span>
            </div>
          </div>
        </div>

        <!-- 字体大小 -->
        <div class="hs-font-row">
          <label class="hs-font-label">{{ t('字体大小', 'Font Size') }}</label>
          <div class="hs-font-control">
            <input type="range" min="11" max="18" step="1"
              [value]="fontSize" (input)="onFontSizeChange(+$any($event.target).value)"
              class="hs-range">
            <span class="hs-font-val">{{ fontSize }}px</span>
          </div>
        </div>

        <!-- 入口模式 -->
        <div class="hs-entry-mode-row">
          <label style="font-size:13px; font-weight:500;">{{ t('入口模式', 'Entry Mode') }}</label>
          <div class="hs-entry-mode-options">
            <label class="hs-entry-mode-option"
              [class.hs-entry-mode-active]="entryMode === 'toolbar'">
              <input type="radio" name="entryMode" value="toolbar"
                [(ngModel)]="entryMode" (ngModelChange)="onEntryModeChange()">
              <span>{{ t('工具栏按钮', 'Toolbar') }}</span>
            </label>
            <label class="hs-entry-mode-option"
              [class.hs-entry-mode-active]="entryMode === 'floating'">
              <input type="radio" name="entryMode" value="floating"
                [(ngModel)]="entryMode" (ngModelChange)="onEntryModeChange()">
              <span>{{ t('浮动按钮', 'Floating') }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 数据 -->
      <div class="hs-section">
        <label class="hs-label">{{ t('数据', 'Data') }}</label>
        <div class="hs-backup-row">
          <button class="hs-btn" (click)="exportData()">[&uarr;] {{ t('导出数据', 'Export') }}</button>
          <label class="hs-btn hs-btn-import">[&darr;] {{ t('导入数据', 'Import') }}
            <input type="file" accept=".json" (change)="onImport($event)" style="display:none" />
          </label>
          <button class="hs-btn hs-btn-danger" (click)="openClearConfirm()">[&times;] {{ t('清空数据', 'Clear All') }}</button>
        </div>
      </div>

      <!-- 关于 -->
      <div class="hs-section">
        <label class="hs-label">{{ t('关于', 'About') }}</label>
        <div class="hs-about-row">
          <span class="hs-about-item">{{ t('版本', 'Version') }}: 1.0.0</span>
          <span class="hs-about-item">{{ t('作者', 'Author') }}: iishen717</span>
          <span class="hs-about-link" (click)="openGithub()">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
            {{ t('Github源码', 'GitHub Source') }}
          </span>
        </div>
      </div>
    </div>

    <!-- 清空数据确认弹窗 -->
    <div class="hp-overlay" *ngIf="showClearConfirm" (click)="closeClearConfirm()">
      <div class="hp-edit-modal" (click)="$event.stopPropagation()">
        <div class="hp-edit-title" style="color:var(--_primary,#e24b4a);">{{ t('⚠️ 清空数据', '⚠️ Clear All Data') }}</div>
        <div class="hp-edit-field">
          <p style="font-size:13px; line-height:1.6; margin:0 0 12px 0;">
            {{ t('此操作将删除所有主机和分组数据，不可撤销！', 'This will delete all hosts and groups, and cannot be undone!') }}
          </p>
          <label style="font-size:12px; opacity:.8;">
            {{ t('请输入 DELETE 确认：', 'Please type DELETE to confirm:') }}
          </label>
          <input class="hp-edit-input" type="text" [(ngModel)]="clearConfirmInput"
            (keydown.enter)="doClearData()" placeholder="DELETE" #clearInput
            style="margin-top:6px; width:100%; box-sizing:border-box;" />
        </div>
        <div class="hp-edit-footer">
          <button class="hs-btn" (click)="closeClearConfirm()">{{ t('取消', 'Cancel') }}</button>
          <button class="hs-btn hs-btn-danger" (click)="doClearData()"
            [style.opacity]="clearConfirmInput !== 'DELETE' ? '0.5' : '1'"
            [disabled]="clearConfirmInput !== 'DELETE'">{{ t('清空', 'Clear') }}</button>
        </div>
      </div>
    </div>
  `,
        styles: [`
    .hs-settings-page { padding:20px; max-width:600px; }
    .hs-title { color:var(--primary-color,#3b82f6); font-size:18px; margin-bottom:6px; }
    .hs-desc { opacity:.7; font-size:13px; line-height:1.6; margin-bottom:24px; }
    .hs-section { border-top:1px solid rgba(128,128,128,0.2); padding-top:16px; margin-bottom:16px; }
    .hs-label { display:block; font-size:16px; font-weight:600; margin-bottom:10px; }
    .hs-select {
      width:100%; max-width:280px;
      padding:7px 10px; border-radius:6px;
      background: rgba(128,128,128,0.1);
      border:1px solid rgba(128,128,128,0.25);
      font-size:13px; cursor:pointer; outline:none;
      color: inherit;
    }
    .hs-select option { color: #000; background: #fff; }
    .hs-select:focus { border-color: var(--primary-color, #3b82f6); }

    /* 颜色主题 */
    .hs-color-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
    .hs-color-swatch {
      display:inline-flex; flex-direction:column; align-items:center; gap:6px;
      padding:10px; border-radius:12px; border:2px solid transparent;
      font-size:12px; font-weight:500; cursor:pointer; transition:all .18s;
      min-width:80px;
    }
    .hs-color-swatch:hover { opacity:.85; transform:translateY(-1px); }
    .hs-color-active { border-color: var(--primary-color,#3b82f6) !important; box-shadow:0 0 0 3px rgba(59,130,246,.2); }
    .hs-color-swatch-name { font-size:11px; font-weight:600; }
    .hs-color-swatch-preview {
      display:flex; flex-direction:column; border-radius:8px; overflow:hidden;
      width:72px;
    }
    .hs-cp-title { display:block; padding:4px 6px; font-size:8px; font-weight:600; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .hs-cp-body { display:block; padding:4px 6px; font-size:8px; font-family:monospace; min-height:18px; }
    .hs-cp-line { display:block; line-height:1.4; }
    .hs-cp-accent { display:inline-block; width:12px; height:3px; border-radius:2px; margin-top:2px; }
    .hs-glass-preview {
      width:240px; margin:0 auto 16px;
      border-radius:12px; overflow:hidden;
      padding:0;
    }
    .hs-gp-titlebar {
      display:flex; align-items:center; gap:6px;
      padding:8px 12px;
    }
    .hs-gp-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .hs-gp-title { font-size:11px; font-weight:600; }
    .hs-gp-body { padding:10px 14px; }
    .hs-gp-host { display:block; font-size:11px; font-family:monospace; line-height:1.6; }
    .hs-color-fields { display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start; margin-top:8px; }
    .hs-color-field { display:flex; flex-direction:column; gap:3px; }
    .hs-color-field label { font-size:12px; font-weight:500; }
    .hs-color-input { width:44px; height:30px; border:none; border-radius:6px; cursor:pointer; }
    .hs-color-val { font-size:11px; font-family:monospace; opacity:.6; }

    /* 按钮 */
    .hs-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:6px 16px; border-radius:8px;
      border:1px solid rgba(128,128,128,0.25);
      background: rgba(128,128,128,0.08);
      font-size:13px; cursor:pointer; transition:background .15s;
      color: inherit;
    }
    .hs-btn:hover { background: rgba(128,128,128,0.15); }
    .hs-btn-danger { border-color:#e24b4a; color:#e24b4a; }
    .hs-btn-danger:hover { background: rgba(226,75,74,0.1); }
    .hs-btn-import { cursor:pointer; }
    .hs-backup-row { display:flex; gap:10px; flex-wrap:wrap; margin-top:4px; }

    /* 入口模式选择 */
    .hs-entry-mode-row { margin-top:8px; display:flex; flex-direction:column; gap:4px; }
    .hs-entry-mode-options { display:flex; gap:8px; }
    .hs-entry-mode-option {
      display:flex; align-items:center; gap:4px;
      padding:6px 12px; border-radius:6px;
      border:0.5px solid var(--hp-border,#585b70);
      cursor:pointer; transition:all .15s;
      user-select:none;
    }
    .hs-entry-mode-option:hover { border-color:var(--hp-primary,#b4befe); }
    .hs-entry-mode-active { border-color:var(--hp-primary,#b4befe); background:rgba(180,190,254,0.08); }
    .hs-entry-mode-option input { margin:0; }

    /* 字体大小 */
    .hs-font-row { margin-top:12px; display:flex; flex-direction:column; gap:4px; }
    .hs-font-label { font-size:13px; font-weight:500; }
    .hs-font-control { display:flex; align-items:center; gap:10px; }
    .hs-font-val { font-size:13px; min-width:30px; color:var(--hp-text-muted); font-variant-numeric:tabular-nums; }
    .hs-range { flex:1; max-width:160px; margin:0; height:4px; -webkit-appearance:none; appearance:none; background:var(--hp-border,#585b70); border-radius:2px; outline:none; cursor:pointer; }
    .hs-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:14px; height:14px; border-radius:50%; background:var(--hp-primary,#b4befe); border:2px solid var(--hp-surface,#45475a); cursor:pointer; }
    .hs-range::-moz-range-track { height:4px; background:var(--hp-border,#585b70); border-radius:2px; }
    .hs-range::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:var(--hp-primary,#b4befe); border:2px solid var(--hp-surface,#45475a); cursor:pointer; }

    /* 关于 */
    .hs-about-row { display:flex; gap:16px; flex-wrap:wrap; margin-top:4px; font-size:13px; }
    .hs-about-item { color:var(--hp-text-muted); }
    .hs-about-link { color:var(--hp-primary,#b4befe); text-decoration:none; cursor:pointer; }
    .hs-about-link:hover { text-decoration:underline; }
    .hs-about-link svg { width:12px; height:12px; vertical-align:middle; margin-right:2px; }

    /* 确认弹窗 */
    .hp-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:100000; display:flex; align-items:center; justify-content:center; }
    .hp-edit-modal {
      background:var(--hp-bg,#313244); border:0; border-radius:12px; padding:20px; z-index:100001;
      min-width:380px; max-width:90%;
      color:var(--hp-text,#cdd6f4);
    }
    .hp-edit-title { font-size:16px; font-weight:600; margin-bottom:16px; }
    .hp-edit-field { margin-bottom:16px; }
    .hp-edit-input {
      width:100%; padding:8px 12px; border-radius:6px;
      border:1px solid rgba(128,128,128,0.3);
      background:rgba(0,0,0,0.2); color:inherit; font-size:13px; outline:none;
      box-sizing:border-box;
    }
    .hp-edit-input:focus { border-color:var(--primary-color,#3b82f6); }
    .hp-edit-footer { display:flex; gap:8px; justify-content:flex-end; margin-top:10px; }
  `],
    }),
    __metadata("design:paramtypes", [])
], HostSettingsComponent);

let HostSettingsTabProvider = class HostSettingsTabProvider extends tabby_settings__WEBPACK_IMPORTED_MODULE_1__.SettingsTabProvider {
    constructor() {
        super(...arguments);
        this.id = 'hp-settings';
        this.icon = 'fas fa-server';
        this.title = 'Host+';
    }
    getComponentType() {
        return HostSettingsComponent;
    }
    async getSettingsTabs() {
        return [{
                title: 'Host+',
                icon: 'fas fa-server',
                weight: 98,
                component: HostSettingsComponent,
            }];
    }
};
HostSettingsTabProvider = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_0__.Injectable)()
], HostSettingsTabProvider);



/***/ },

/***/ "./src/host-terminal-decorator.ts"
/*!****************************************!*\
  !*** ./src/host-terminal-decorator.ts ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HostTerminalDecorator: () => (/* binding */ HostTerminalDecorator)
/* harmony export */ });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "@angular/core");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_angular_core__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var tabby_terminal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tabby-terminal */ "tabby-terminal");
/* harmony import */ var tabby_terminal__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(tabby_terminal__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _host_floating_panel_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./host-floating-panel.component */ "./src/host-floating-panel.component.ts");
/* harmony import */ var _host_data_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./host-data.service */ "./src/host-data.service.ts");
/* harmony import */ var _host_i18n_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./host-i18n.service */ "./src/host-i18n.service.ts");
/* harmony import */ var tabby_core__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! tabby-core */ "tabby-core");
/* harmony import */ var tabby_core__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(tabby_core__WEBPACK_IMPORTED_MODULE_5__);
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var HostTerminalDecorator_1;
/**
 * Host+ 终端装饰器
 * 功能描述：在终端注入入口按钮（浮动或工具栏），管理浮动面板的创建/销毁/最小化/恢复
 */






/** 构造 SSH Profile：密码 / 私钥二选一 */
function buildSSHPartialProfile(sshHost, port, user, password, privateKeyPath, forwardedPorts) {
    const options = {
        host: sshHost,
        port,
        user,
        forwardedPorts: forwardedPorts || [],
    };
    if (privateKeyPath) {
        options.auth = 'publicKey';
        options.privateKeys = [privateKeyPath];
    }
    else {
        options.auth = password ? 'password' : null;
        options.password = password || undefined;
    }
    return {
        type: 'ssh',
        name: sshHost,
        options,
    };
}
let HostTerminalDecorator = HostTerminalDecorator_1 = class HostTerminalDecorator extends tabby_terminal__WEBPACK_IMPORTED_MODULE_1__.TerminalDecorator {
    constructor(resolver, appRef, zone, injector) {
        super();
        this.resolver = resolver;
        this.appRef = appRef;
        this.zone = zone;
        this.injector = injector;
        this.applySavedTheme();
        console.log('[Host+] Decorator ready');
    }
    applySavedTheme() {
        try {
            const root = document.documentElement;
            const savedFontSize = localStorage.getItem('hp-font-size');
            if (savedFontSize && !root.style.getPropertyValue('--hp-font-size')) {
                root.style.setProperty('--hp-font-size', savedFontSize + 'px');
            }
            const theme = localStorage.getItem('hp-theme');
            if (!theme || theme === '')
                return;
            const keys = ['primary', 'bg', 'text', 'border', 'surface', 'hover', 'input-bg', 'text-muted'];
            let applied = false;
            for (const k of keys) {
                const val = localStorage.getItem(`hp-color-${k}`);
                if (val && !root.style.getPropertyValue(`--hp-${k}`)) {
                    root.style.setProperty(`--hp-${k}`, val);
                    applied = true;
                }
            }
            if (applied)
                console.log('[Host+] Color theme applied');
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    attach(terminal) {
        super.attach(terminal);
        console.log('[Host+] attach called');
        const entryI18n = new _host_i18n_service__WEBPACK_IMPORTED_MODULE_4__.HostI18nService();
        const hpSvc = new _host_data_service__WEBPACK_IMPORTED_MODULE_3__.HostDataService();
        const tryInsert = () => {
            var _a, _b, _c, _d;
            try {
                const hostEl = (_a = terminal === null || terminal === void 0 ? void 0 : terminal.element) === null || _a === void 0 ? void 0 : _a.nativeElement;
                if (!hostEl)
                    return false;
                if (hostEl.querySelector('[data-hp-entry="1"]'))
                    return true;
                const ssh = (_c = (_b = terminal === null || terminal === void 0 ? void 0 : terminal.sshSession) !== null && _b !== void 0 ? _b : terminal === null || terminal === void 0 ? void 0 : terminal._session) !== null && _c !== void 0 ? _c : null;
                let profileId = ((_d = terminal === null || terminal === void 0 ? void 0 : terminal.profile) === null || _d === void 0 ? void 0 : _d.id) || '';
                if (!profileId && (ssh === null || ssh === void 0 ? void 0 : ssh.host)) {
                    profileId = 'ssh:' + ssh.host;
                }
                this.buildEntry(hostEl, terminal, ssh, profileId, entryI18n, hpSvc);
                this.listenEntryModeChange(hostEl);
                console.log('[Host+] Entry button injected');
                // 从首页按钮触发的自动打开面板
                if (sessionStorage.getItem('hp-auto-open') === '1') {
                    sessionStorage.removeItem('hp-auto-open');
                    // 等待工具栏按钮完全渲染后自动点击
                    setTimeout(() => {
                        const entry = hostEl.querySelector('[data-hp-entry="1"]');
                        if (entry)
                            entry.click();
                    }, 600);
                }
                return true;
            }
            catch (err) {
                console.warn('[Host+] tryInsert error', err);
                return false;
            }
        };
        let attempts = 0;
        const timer = setInterval(() => {
            attempts++;
            if (tryInsert() || attempts > 20) {
                clearInterval(timer);
                if (attempts > 20)
                    console.log('[Host+] No terminal found after 20 attempts');
            }
        }, 500);
        this.subscribeUntilDetached(terminal, { unsubscribe: () => clearInterval(timer) });
    }
    buildEntry(hostEl, terminal, ssh, profileId, i18n, hpSvc) {
        const entryMode = hpSvc.getEntryMode();
        let entry;
        if (entryMode === 'toolbar') {
            entry = this.createToolbarEntry(hostEl, i18n);
        }
        else {
            entry = this.createFloatingEntry(hostEl, hpSvc, profileId, i18n);
            this.setupFloatingDrag(entry, hostEl, hpSvc, profileId);
        }
        if (!entry)
            return;
        entry.setAttribute('data-hp-entry', '1');
        this.setupEntryClick(entry, hostEl, terminal, i18n, entryMode);
        hostEl.__hpEntry = entry;
        hostEl.__hpTerminal = terminal;
        hostEl.__hpProfileId = profileId;
        this.setupSSHDisconnect(entry, terminal, ssh, i18n);
    }
    listenEntryModeChange(hostEl) {
        if (hostEl.__hpModeListener)
            return;
        const rebuild = () => {
            var _a, _b, _c;
            const oldEntry = hostEl.__hpEntry;
            if (oldEntry) {
                oldEntry.remove();
                delete hostEl.__hpEntry;
            }
            if (hostEl.__hpPanelOpen)
                this.closePanel(hostEl);
            const terminal = hostEl.__hpTerminal;
            const ssh = (_b = (_a = terminal === null || terminal === void 0 ? void 0 : terminal.sshSession) !== null && _a !== void 0 ? _a : terminal === null || terminal === void 0 ? void 0 : terminal._session) !== null && _b !== void 0 ? _b : null;
            let profileId = ((_c = terminal === null || terminal === void 0 ? void 0 : terminal.profile) === null || _c === void 0 ? void 0 : _c.id) || '';
            if (!profileId && (ssh === null || ssh === void 0 ? void 0 : ssh.host))
                profileId = 'ssh:' + ssh.host;
            this.buildEntry(hostEl, terminal, ssh, profileId, new _host_i18n_service__WEBPACK_IMPORTED_MODULE_4__.HostI18nService(), new _host_data_service__WEBPACK_IMPORTED_MODULE_3__.HostDataService());
        };
        window.addEventListener('hp-entry-mode-changed', rebuild);
        hostEl.addEventListener('hp-mode-change', rebuild);
        HostTerminalDecorator_1.rebuildRegistry.add(rebuild);
        hostEl.__hpModeListener = true;
        hostEl.__hpRebuildFn = rebuild;
        const terminal = hostEl.__hpTerminal;
        if (terminal) {
            this.subscribeUntilDetached(terminal, {
                unsubscribe: () => {
                    window.removeEventListener('hp-entry-mode-changed', rebuild);
                    hostEl.removeEventListener('hp-mode-change', rebuild);
                    HostTerminalDecorator_1.rebuildRegistry.delete(rebuild);
                    delete hostEl.__hpModeListener;
                    delete hostEl.__hpRebuildFn;
                }
            });
        }
    }
    static rebuildAll() {
        for (const fn of HostTerminalDecorator_1.rebuildRegistry) {
            try {
                fn();
            }
            catch (_a) { }
        }
    }
    createFloatingEntry(hostEl, hpSvc, profileId, i18n) {
        const entry = document.createElement('div');
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
    `;
        entry.title = i18n.t('entry.title');
        entry.innerHTML = '@&nbsp;Host+ <span style="color:var(--hp-text-muted,#6c7086);font-size:calc(var(--hp-font-size,14px) - 1px);">&#x22EE;&#x22EE;</span>';
        const mem = profileId ? hpSvc.getPositionMemory(profileId) : null;
        if (mem) {
            entry.style.left = mem.entryX + 'px';
            entry.style.top = mem.entryY + 'px';
        }
        else {
            const savedPos = hpSvc.getEntryPosition();
            const isDefault = savedPos.x === 20 && savedPos.y === 60;
            if (isDefault) {
                entry.style.top = '60px';
                entry.style.right = '16px';
            }
            else {
                entry.style.left = savedPos.x + 'px';
                entry.style.top = savedPos.y + 'px';
            }
        }
        entry.addEventListener('mouseenter', () => { entry.style.opacity = '1'; });
        entry.addEventListener('mouseleave', () => { entry.style.opacity = '0.85'; });
        hostEl.style.position = 'relative';
        hostEl.appendChild(entry);
        return entry;
    }
    createToolbarEntry(hostEl, i18n) {
        var _a, _b;
        const toolbar = (_b = (_a = hostEl.querySelector('.terminal-toolbar')) !== null && _a !== void 0 ? _a : hostEl.querySelector('terminal-toolbar')) !== null && _b !== void 0 ? _b : hostEl.querySelector('.btn-toolbar');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-link me-2';
        btn.setAttribute('data-hp-entry', '1');
        btn.innerHTML = '@&nbsp;Host+';
        btn.title = i18n.t('entry.title');
        btn.style.pointerEvents = 'auto';
        if (toolbar) {
            btn.style.position = 'relative';
            btn.style.zIndex = '10';
            const allButtons = Array.from(toolbar.querySelectorAll('button'));
            const reconnectButton = allButtons.find(b => { var _a, _b; return /reconnect|переподключ/i.test(`${(_a = b.textContent) !== null && _a !== void 0 ? _a : ''} ${(_b = b.title) !== null && _b !== void 0 ? _b : ''}`); });
            if (reconnectButton === null || reconnectButton === void 0 ? void 0 : reconnectButton.parentElement) {
                reconnectButton.parentElement.insertBefore(btn, reconnectButton.nextSibling);
            }
            else {
                toolbar.appendChild(btn);
            }
        }
        else {
            hostEl.style.position = 'relative';
            // 无工具栏时放入共享 flex 容器，两个插件自然并排
            let container = hostEl.querySelector('[data-plugin-btns]');
            if (!container) {
                container = document.createElement('div');
                container.setAttribute('data-plugin-btns', '1');
                container.style.cssText = 'position:absolute;top:8px;right:8px;z-index:99997;display:flex;gap:4px;';
                hostEl.appendChild(container);
            }
            btn.style.position = 'static';
            btn.style.border = '0.5px solid var(--hp-primary, #b4befe)';
            btn.style.borderRadius = '6px';
            btn.style.padding = '3px 8px';
            btn.style.background = 'var(--hp-surface, #45475a)';
            btn.style.color = 'var(--hp-primary, #b4befe)';
            btn.style.fontSize = 'var(--hp-font-size, 12px)';
            btn.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            btn.style.lineHeight = '1.4';
            btn.style.cursor = 'pointer';
            btn.style.opacity = '0.85';
            btn.style.transition = 'opacity 0.2s';
            btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
            btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.85'; });
            container.appendChild(btn);
        }
        return btn;
    }
    setupFloatingDrag(entry, hostEl, hpSvc, profileId) {
        entry.__hpWasDrag = false;
        entry.addEventListener('mousedown', (ev) => {
            ev.stopPropagation();
            entry.__hpWasDrag = false;
        });
        let dragging = false;
        let offsetX = 0, offsetY = 0;
        let entryStartX = 0, entryStartY = 0;
        entry.addEventListener('mousedown', (ev) => {
            if (ev.button !== 0)
                return;
            const rect = entry.getBoundingClientRect();
            const hr = hostEl.getBoundingClientRect();
            offsetX = ev.clientX - rect.left;
            offsetY = ev.clientY - rect.top;
            entryStartX = ev.clientX;
            entryStartY = ev.clientY;
            dragging = false;
            const onMove = (me) => {
                me.preventDefault();
                if (Math.abs(me.clientX - entryStartX) > 4 || Math.abs(me.clientY - entryStartY) > 4) {
                    dragging = true;
                    entry.__hpWasDrag = true;
                }
                if (!dragging)
                    return;
                let nl = me.clientX - hr.left - offsetX;
                let nt = me.clientY - hr.top - offsetY;
                const ew = entry.offsetWidth, eh = entry.offsetHeight;
                nl = Math.max(0, Math.min(nl, hostEl.clientWidth - ew));
                nt = Math.max(0, Math.min(nt, hostEl.clientHeight - eh));
                entry.style.top = nt + 'px';
                entry.style.right = 'auto';
                entry.style.left = nl + 'px';
                me.stopPropagation();
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (dragging) {
                    const x = parseInt(entry.style.left) || 0;
                    const y = parseInt(entry.style.top) || 0;
                    if (profileId && hpSvc.hasPositionMemory(profileId)) {
                        hpSvc.savePositionMemory(profileId, { entryX: x, entryY: y });
                    }
                    else {
                        hpSvc.saveEntryPosition({ x, y });
                    }
                }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }
    setupEntryClick(entry, hostEl, terminal, i18n, entryMode) {
        const isButton = entry.tagName === 'BUTTON';
        entry.addEventListener('click', (ev) => {
            var _a, _b;
            ev.preventDefault();
            ev.stopPropagation();
            if (entry.__hpWasDrag) {
                ;
                entry.__hpWasDrag = false;
                return;
            }
            const ssh = (_b = (_a = terminal === null || terminal === void 0 ? void 0 : terminal.sshSession) !== null && _a !== void 0 ? _a : terminal === null || terminal === void 0 ? void 0 : terminal._session) !== null && _b !== void 0 ? _b : null;
            if (ssh && (ssh.open === false || ssh.closed)) {
                entry.style.opacity = '0.3';
                if (isButton)
                    entry.disabled = true;
                entry.title = i18n.t('entry.disconnected');
                return;
            }
            this.togglePanel(hostEl);
        });
    }
    setupSSHDisconnect(entry, terminal, ssh, i18n) {
        var _a;
        if (!ssh)
            return;
        const isButton = entry.tagName === 'BUTTON';
        const markDisconnected = () => {
            entry.style.opacity = '0.3';
            entry.style.cursor = 'not-allowed';
            if (isButton)
                entry.disabled = true;
            entry.title = i18n.t('entry.disconnected');
        };
        try {
            if (ssh === null || ssh === void 0 ? void 0 : ssh.closed$) {
                const sub = ssh.closed$.subscribe(markDisconnected);
                this.subscribeUntilDetached(terminal, { unsubscribe: () => { try {
                        sub.unsubscribe();
                    }
                    catch (_a) { } } });
            }
            else if (typeof ((_a = ssh === null || ssh === void 0 ? void 0 : ssh.closed) === null || _a === void 0 ? void 0 : _a.then) === 'function') {
                ssh.closed.then(markDisconnected).catch(() => { });
            }
        }
        catch ( /* ignore */_b) { /* ignore */ }
    }
    togglePanel(hostEl) {
        if (hostEl.__hpPanelOpen && hostEl.__hpMinimized) {
            this.restorePanel(hostEl);
            return;
        }
        if (hostEl.__hpPanelOpen) {
            this.closePanel(hostEl);
            return;
        }
        this.zone.run(() => {
            try {
                const panelHost = document.createElement('div');
                panelHost.setAttribute('data-hp-panel-host', '1');
                hostEl.appendChild(panelHost);
                hostEl.__hpPanelHost = panelHost;
                hostEl.__hpPanelOpen = true;
                hostEl.__hpMinimized = false;
                const factory = this.resolver.resolveComponentFactory(_host_floating_panel_component__WEBPACK_IMPORTED_MODULE_2__.HostFloatingPanel);
                const cmpRef = factory.create(this.injector, [], panelHost);
                const cmp = cmpRef.instance;
                hostEl.__hpCmpRef = cmpRef;
                cmp.terminalRef = hostEl.__hpTerminal;
                cmp.profileId = hostEl.__hpProfileId || '';
                this.positionPanelNearEntry(hostEl, cmp);
                cmp.onClose = () => {
                    this.zone.run(() => { this.closePanel(hostEl); });
                };
                cmp.onMinimize = () => {
                    this.zone.run(() => {
                        const ph = hostEl.__hpPanelHost;
                        if (ph)
                            ph.style.display = 'none';
                        hostEl.__hpMinimized = true;
                        cmp.minimized = true;
                    });
                };
                // 注入 Tabby 原生 SSH 连接能力（通过 ProfilesService 打开 SSH 标签页）
                const tryNativeSSH = (sshHost, port, user, password, privateKeyPath, forwardedPorts) => {
                    const partialProfile = buildSSHPartialProfile(sshHost, port, user, password, privateKeyPath, forwardedPorts);
                    // 路径 1：ProfilesService.openNewTabForProfile（Tabby 原生方式）
                    try {
                        const profilesService = this.injector.get(tabby_core__WEBPACK_IMPORTED_MODULE_5__.ProfilesService);
                        if (profilesService === null || profilesService === void 0 ? void 0 : profilesService.openNewTabForProfile) {
                            profilesService.openNewTabForProfile(partialProfile);
                            console.log('[Host+] Native SSH via ProfilesService');
                            return true;
                        }
                    }
                    catch (e1) { /* continue */ }
                    // 路径 2：quickConnect（Tabby 快速连接 API，不支持私钥，私钥模式下跳过）
                    try {
                        const profilesService = this.injector.get(tabby_core__WEBPACK_IMPORTED_MODULE_5__.ProfilesService);
                        if (!privateKeyPath && !(forwardedPorts && forwardedPorts.length) && (profilesService === null || profilesService === void 0 ? void 0 : profilesService.quickConnect)) {
                            const query = port !== 22 ? `${user}@${sshHost}:${port}` : `${user}@${sshHost}`;
                            profilesService.quickConnect(query);
                            console.log('[Host+] Native SSH via quickConnect:', query);
                            return true;
                        }
                    }
                    catch (e2) { /* continue */ }
                    // 路径 3：AppService.openNewTab（旧版兼容）
                    try {
                        const appService = this.injector.get(tabby_core__WEBPACK_IMPORTED_MODULE_5__.AppService);
                        if (appService === null || appService === void 0 ? void 0 : appService.openNewTab) {
                            const profilesService = this.injector.get(tabby_core__WEBPACK_IMPORTED_MODULE_5__.ProfilesService);
                            profilesService.newTabParametersForProfile(partialProfile).then((params) => {
                                if (params) {
                                    appService.openNewTab(params);
                                    console.log('[Host+] Native SSH via AppService + newTabParametersForProfile');
                                }
                            });
                            return true;
                        }
                    }
                    catch (e3) { /* continue */ }
                    // 路径 4：扫描 injector 层级
                    try {
                        let inj = this.injector;
                        while (inj) {
                            if (typeof inj.get === 'function') {
                                try {
                                    const records = inj._records || inj.records || {};
                                    for (const token of Object.values(records)) {
                                        try {
                                            const svc = inj.get(token.token || token);
                                            if (svc && typeof svc.openNewTabForProfile === 'function') {
                                                svc.openNewTabForProfile(partialProfile);
                                                console.log('[Host+] Native SSH via injector scan');
                                                return true;
                                            }
                                        }
                                        catch (_a) { }
                                    }
                                }
                                catch (_b) { }
                            }
                            inj = inj.parent;
                        }
                    }
                    catch (e4) { /* continue */ }
                    return false;
                };
                cmp.openSSHTab = tryNativeSSH;
                this.appRef.attachView(cmpRef.hostView);
                cmpRef.changeDetectorRef.detectChanges();
                cmp.applyPositionMemory();
                cmpRef.changeDetectorRef.detectChanges();
                panelHost.addEventListener('mousedown', (ev) => ev.stopPropagation());
                panelHost.addEventListener('click', (ev) => ev.stopPropagation());
                console.log('[Host+] Panel opened');
            }
            catch (e) {
                console.error('[Host+] Panel error', e);
            }
        });
    }
    positionPanelNearEntry(hostEl, cmp) {
        const entry = hostEl.__hpEntry;
        if (!entry)
            return;
        const hostRect = hostEl.getBoundingClientRect();
        const entryRect = entry.getBoundingClientRect();
        const entryLeft = entryRect.left - hostRect.left;
        const entryTop = entryRect.top - hostRect.top;
        const entryW = entryRect.width;
        const entryH = entryRect.height;
        const hostW = hostEl.clientWidth;
        const hostH = hostEl.clientHeight;
        const panelW = 380;
        const panelH = 420;
        const gap = 4;
        let px, py;
        if (entryLeft + entryW / 2 < hostW / 2) {
            px = entryLeft + entryW + gap;
        }
        else {
            px = entryLeft - panelW - gap;
        }
        if (entryTop + entryH / 2 < hostH / 2) {
            py = entryTop;
        }
        else {
            py = entryTop - panelH + entryH;
        }
        px = Math.max(4, Math.min(px, hostW - panelW - 4));
        py = Math.max(4, Math.min(py, hostH - panelH - 4));
        cmp.panelX = Math.round(px);
        cmp.panelY = Math.round(py);
    }
    closePanel(hostEl) {
        try {
            const cmpRef = hostEl.__hpCmpRef;
            if (cmpRef) {
                try {
                    cmpRef.destroy();
                }
                catch (_a) { }
            }
            const ph = hostEl.__hpPanelHost;
            if (ph) {
                try {
                    ph.remove();
                }
                catch (_b) { }
            }
        }
        catch (_c) { }
        delete hostEl.__hpPanelOpen;
        delete hostEl.__hpMinimized;
        delete hostEl.__hpPanelHost;
        delete hostEl.__hpCmpRef;
    }
    restorePanel(hostEl) {
        const ph = hostEl.__hpPanelHost;
        const cmpRef = hostEl.__hpCmpRef;
        if (ph) {
            ph.style.display = '';
            hostEl.__hpMinimized = false;
            if (cmpRef === null || cmpRef === void 0 ? void 0 : cmpRef.instance) {
                cmpRef.instance.minimized = false;
                this.positionPanelNearEntry(hostEl, cmpRef.instance);
            }
        }
    }
    /** 静态方法：在无终端的情况下独立弹出主机管理面板（用于首页按钮） */
    static openStandalonePanel(injector) {
        // 防止重复弹出
        if (document.querySelector('[data-hp-standalone]'))
            return;
        const resolver = injector.get(_angular_core__WEBPACK_IMPORTED_MODULE_0__.ComponentFactoryResolver);
        const appRef = injector.get(_angular_core__WEBPACK_IMPORTED_MODULE_0__.ApplicationRef);
        const zone = injector.get(_angular_core__WEBPACK_IMPORTED_MODULE_0__.NgZone);
        zone.run(() => {
            try {
                // 半透明遮罩
                const backdrop = document.createElement('div');
                backdrop.setAttribute('data-hp-standalone', 'backdrop');
                backdrop.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.35);';
                backdrop.addEventListener('click', () => {
                    HostTerminalDecorator_1.closeStandalonePanel();
                });
                document.body.appendChild(backdrop);
                // 面板容器
                const panelHost = document.createElement('div');
                panelHost.setAttribute('data-hp-standalone', 'panel');
                panelHost.style.cssText = 'position:fixed;z-index:99999;';
                document.body.appendChild(panelHost);
                const factory = resolver.resolveComponentFactory(_host_floating_panel_component__WEBPACK_IMPORTED_MODULE_2__.HostFloatingPanel);
                const cmpRef = factory.create(injector, [], panelHost);
                const cmp = cmpRef.instance;
                // 面板居中
                const pw = cmp.panelWidth || 380;
                cmp.panelX = Math.round((window.innerWidth - pw) / 2);
                cmp.panelY = Math.round((window.innerHeight - 420) / 2);
                cmp.terminalRef = null;
                cmp.profileId = 'standalone';
                // SSH 连接回调
                cmp.openSSHTab = (sshHost, port, user, password, privateKeyPath, forwardedPorts) => {
                    const partialProfile = buildSSHPartialProfile(sshHost, port, user, password, privateKeyPath, forwardedPorts);
                    try {
                        const ps = injector.get(tabby_core__WEBPACK_IMPORTED_MODULE_5__.ProfilesService);
                        if (ps === null || ps === void 0 ? void 0 : ps.openNewTabForProfile) {
                            ps.openNewTabForProfile(partialProfile);
                            return true;
                        }
                    }
                    catch (_a) { }
                    try {
                        const ps = injector.get(tabby_core__WEBPACK_IMPORTED_MODULE_5__.ProfilesService);
                        if (!privateKeyPath && !(forwardedPorts && forwardedPorts.length) && (ps === null || ps === void 0 ? void 0 : ps.quickConnect)) {
                            const query = port !== 22 ? `${user}@${sshHost}:${port}` : `${user}@${sshHost}`;
                            ps.quickConnect(query);
                            return true;
                        }
                    }
                    catch (_b) { }
                    return false;
                };
                cmp.onClose = () => {
                    HostTerminalDecorator_1.closeStandalonePanel();
                };
                appRef.attachView(cmpRef.hostView);
                cmpRef.changeDetectorRef.detectChanges();
                cmp.applyPositionMemory();
                cmpRef.changeDetectorRef.detectChanges();
                // 阻止面板内鼠标事件冒泡到遮罩
                panelHost.addEventListener('mousedown', (ev) => ev.stopPropagation());
                panelHost.addEventListener('click', (ev) => ev.stopPropagation());
                console.log('[Host+] Standalone panel opened');
            }
            catch (e) {
                console.error('[Host+] Standalone panel error', e);
            }
        });
    }
    /** 关闭独立面板 */
    static closeStandalonePanel() {
        try {
            const backdrops = document.querySelectorAll('[data-hp-standalone="backdrop"]');
            backdrops.forEach(b => b.remove());
            const panels = document.querySelectorAll('[data-hp-standalone="panel"]');
            panels.forEach(p => {
                // 销毁 Angular 组件（如果有的话）
                p.remove();
            });
        }
        catch (_a) { }
    }
};
/** 所有活跃终端入口的 rebuild 回调，供设置面板直接触发 */
HostTerminalDecorator.rebuildRegistry = new Set();
HostTerminalDecorator = HostTerminalDecorator_1 = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_0__.Injectable)(),
    __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__.ComponentFactoryResolver,
        _angular_core__WEBPACK_IMPORTED_MODULE_0__.ApplicationRef,
        _angular_core__WEBPACK_IMPORTED_MODULE_0__.NgZone,
        _angular_core__WEBPACK_IMPORTED_MODULE_0__.Injector])
], HostTerminalDecorator);

;
window.__hpRebuildEntry = () => HostTerminalDecorator.rebuildAll();


/***/ },

/***/ "@angular/common"
/*!**********************************!*\
  !*** external "@angular/common" ***!
  \**********************************/
(module) {

module.exports = require("@angular/common");

/***/ },

/***/ "@angular/core"
/*!********************************!*\
  !*** external "@angular/core" ***!
  \********************************/
(module) {

module.exports = require("@angular/core");

/***/ },

/***/ "@angular/forms"
/*!*********************************!*\
  !*** external "@angular/forms" ***!
  \*********************************/
(module) {

module.exports = require("@angular/forms");

/***/ },

/***/ "tabby-core"
/*!*****************************!*\
  !*** external "tabby-core" ***!
  \*****************************/
(module) {

module.exports = require("tabby-core");

/***/ },

/***/ "tabby-settings"
/*!*********************************!*\
  !*** external "tabby-settings" ***!
  \*********************************/
(module) {

module.exports = require("tabby-settings");

/***/ },

/***/ "tabby-terminal"
/*!*********************************!*\
  !*** external "tabby-terminal" ***!
  \*********************************/
(module) {

module.exports = require("tabby-terminal");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			const e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			const getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter/value functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			if(Array.isArray(definition)) {
/******/ 				var i = 0;
/******/ 				while(i < definition.length) {
/******/ 					var key = definition[i++];
/******/ 					var binding = definition[i++];
/******/ 					if(!__webpack_require__.o(exports, key)) {
/******/ 						if(binding === 0) {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 						} else {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 						}
/******/ 					} else if(binding === 0) { i++; }
/******/ 				}
/******/ 			} else {
/******/ 				for(var key in definition) {
/******/ 					if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HostStartPageButtonProvider: () => (/* binding */ HostStartPageButtonProvider),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/common */ "@angular/common");
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_angular_common__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "@angular/forms");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_angular_forms__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ "@angular/core");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_angular_core__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var tabby_core__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! tabby-core */ "tabby-core");
/* harmony import */ var tabby_core__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(tabby_core__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var tabby_settings__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! tabby-settings */ "tabby-settings");
/* harmony import */ var tabby_settings__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(tabby_settings__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var tabby_terminal__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! tabby-terminal */ "tabby-terminal");
/* harmony import */ var tabby_terminal__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(tabby_terminal__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _host_terminal_decorator__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./host-terminal-decorator */ "./src/host-terminal-decorator.ts");
/* harmony import */ var _host_floating_panel_component__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./host-floating-panel.component */ "./src/host-floating-panel.component.ts");
/* harmony import */ var _host_settings_component__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./host-settings.component */ "./src/host-settings.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/**
 * Host+ 插件入口
 * 功能描述：注册 TerminalDecorator（浮动入口）+ 浮动面板 + 设置页
 */










/** 启动时应用已保存的颜色主题（Host+ 独立 --hp-* 变量体系，不与 QuickCmd+ 共用） */
function applySavedTheme() {
    try {
        const theme = localStorage.getItem('hp-theme');
        const root = document.documentElement;
        const presets = {
            'acrylic-light': { '--hp-primary': '#4f7dff', '--hp-primary-rgb': '79,125,255', '--hp-bg': 'rgba(213,213,216,0.96)', '--hp-bg-rgb': '213,213,216', '--hp-text': '#162234', '--hp-text-secondary': '#607188', '--hp-text-muted': '#8c97ab', '--hp-group-name': '#4a6080', '--hp-border': 'rgba(255,255,255,0.28)', '--hp-surface': 'rgba(255,255,255,0.34)', '--hp-surface-rgb': '255,255,255', '--hp-hover': 'rgba(255,255,255,0.24)', '--hp-input-bg': 'rgba(255,255,255,0.52)', '--hp-blur': '28px', '--hp-saturate': '180%', '--hp-shadow': '0 10px 38px rgba(0,0,0,0.16)' },
            'acrylic-dark': { '--hp-primary': '#5b8def', '--hp-primary-rgb': '91,141,239', '--hp-bg': 'rgba(20,20,20,0.52)', '--hp-bg-rgb': '20,20,20', '--hp-text': '#e8e8e8', '--hp-text-secondary': '#b2b2b2', '--hp-text-muted': '#8f8f8f', '--hp-group-name': '#b2b2b2', '--hp-border': 'rgba(255,255,255,0.10)', '--hp-surface': 'rgba(45,45,45,0.42)', '--hp-surface-rgb': '45,45,45', '--hp-hover': 'rgba(255,255,255,0.06)', '--hp-input-bg': 'rgba(255,255,255,0.08)', '--hp-blur': '30px', '--hp-saturate': '145%', '--hp-shadow': '0 10px 38px rgba(0,0,0,0.40)' },
            'ocean': { '--hp-primary': '#22d3ee', '--hp-primary-rgb': '34,211,238', '--hp-bg': 'rgba(8,24,48,0.60)', '--hp-bg-rgb': '8,24,48', '--hp-text': '#e0f0ff', '--hp-text-secondary': '#90b8e0', '--hp-text-muted': '#5888b8', '--hp-group-name': '#90b8e0', '--hp-border': 'rgba(100,180,240,0.14)', '--hp-surface': 'rgba(20,50,90,0.35)', '--hp-surface-rgb': '20,50,90', '--hp-hover': 'rgba(100,160,220,0.08)', '--hp-input-bg': 'rgba(10,30,60,0.50)', '--hp-blur': '26px', '--hp-saturate': '170%', '--hp-shadow': '0 10px 38px rgba(0,40,80,0.40)' },
            'forest': { '--hp-primary': '#34d399', '--hp-primary-rgb': '52,211,153', '--hp-bg': 'rgba(8,28,16,0.58)', '--hp-bg-rgb': '8,28,16', '--hp-text': '#d8f8e0', '--hp-text-secondary': '#80c898', '--hp-text-muted': '#509868', '--hp-group-name': '#80c898', '--hp-border': 'rgba(80,180,120,0.12)', '--hp-surface': 'rgba(16,50,28,0.35)', '--hp-surface-rgb': '16,50,28', '--hp-hover': 'rgba(80,160,100,0.08)', '--hp-input-bg': 'rgba(8,30,16,0.48)', '--hp-blur': '26px', '--hp-saturate': '155%', '--hp-shadow': '0 10px 38px rgba(0,30,10,0.40)' },
            'sunset': { '--hp-primary': '#fb923c', '--hp-primary-rgb': '251,146,60', '--hp-bg': 'rgba(40,16,8,0.62)', '--hp-bg-rgb': '40,16,8', '--hp-text': '#ffe8d8', '--hp-text-secondary': '#d0a088', '--hp-text-muted': '#a07058', '--hp-group-name': '#d0a088', '--hp-border': 'rgba(200,120,80,0.14)', '--hp-surface': 'rgba(60,24,12,0.38)', '--hp-surface-rgb': '60,24,12', '--hp-hover': 'rgba(200,100,60,0.08)', '--hp-input-bg': 'rgba(30,10,4,0.50)', '--hp-blur': '24px', '--hp-saturate': '150%', '--hp-shadow': '0 10px 38px rgba(40,10,0,0.40)' },
            'lavender': { '--hp-primary': '#a78bfa', '--hp-primary-rgb': '167,139,250', '--hp-bg': 'rgba(22,14,36,0.58)', '--hp-bg-rgb': '22,14,36', '--hp-text': '#ece0fc', '--hp-text-secondary': '#b098d0', '--hp-text-muted': '#7a60a8', '--hp-group-name': '#b098d0', '--hp-border': 'rgba(150,120,210,0.14)', '--hp-surface': 'rgba(36,22,58,0.38)', '--hp-surface-rgb': '36,22,58', '--hp-hover': 'rgba(140,100,200,0.08)', '--hp-input-bg': 'rgba(18,10,30,0.50)', '--hp-blur': '28px', '--hp-saturate': '160%', '--hp-shadow': '0 10px 38px rgba(20,10,30,0.40)' },
        };
        if (theme && presets[theme]) {
            const p = presets[theme];
            for (const [k, v] of Object.entries(p)) {
                root.style.setProperty(k, v);
            }
            console.log('[Host+] Preset theme applied:', theme);
            return;
        }
        if (theme === 'custom') {
            const keys = [
                'primary', 'primary-rgb', 'bg', 'bg-rgb',
                'text', 'text-secondary', 'text-muted', 'group-name',
                'border', 'surface', 'surface-rgb',
                'hover', 'input-bg', 'blur', 'saturate', 'shadow'
            ];
            let applied = false;
            for (const k of keys) {
                const val = localStorage.getItem(`hp-color-${k}`);
                if (val) {
                    root.style.setProperty(`--hp-${k}`, val);
                    applied = true;
                }
            }
            if (applied)
                console.log('[Host+] Custom glass theme applied');
            return;
        }
        const allVars = [
            '--hp-primary', '--hp-primary-rgb', '--hp-bg', '--hp-bg-rgb',
            '--hp-text', '--hp-text-secondary', '--hp-text-muted', '--hp-group-name',
            '--hp-border', '--hp-surface', '--hp-surface-rgb',
            '--hp-hover', '--hp-input-bg', '--hp-blur', '--hp-saturate', '--hp-shadow'
        ];
        allVars.forEach(v => root.style.removeProperty(v));
    }
    catch ( /* ignore */_a) { /* ignore */ }
}
applySavedTheme();
/** 在 Tabby 首页显示 Host+ 入口按钮，点击直接弹出独立面板 */
let HostStartPageButtonProvider = class HostStartPageButtonProvider extends tabby_core__WEBPACK_IMPORTED_MODULE_3__.ToolbarButtonProvider {
    constructor(injector) {
        super();
        this.injector = injector;
    }
    provide() {
        return [{
                icon: '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M64 32C28.7 32 0 60.7 0 96v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm48 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zM64 288c-35.3 0-64 28.7-64 64v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V352c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm56 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z"/></svg>',
                title: 'Host-Plus',
                weight: 8,
                showInStartPage: true,
                click: () => {
                    _host_terminal_decorator__WEBPACK_IMPORTED_MODULE_6__.HostTerminalDecorator.openStandalonePanel(this.injector);
                },
            }];
    }
};
HostStartPageButtonProvider = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_2__.Injectable)(),
    __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_2__.Injector])
], HostStartPageButtonProvider);

let HostPlusModule = class HostPlusModule {
    constructor() {
        console.log('[Host+] Module loaded OK');
    }
};
HostPlusModule = __decorate([
    (0,_angular_core__WEBPACK_IMPORTED_MODULE_2__.NgModule)({
        imports: [
            _angular_common__WEBPACK_IMPORTED_MODULE_0__.CommonModule,
            _angular_forms__WEBPACK_IMPORTED_MODULE_1__.FormsModule,
            (tabby_core__WEBPACK_IMPORTED_MODULE_3___default()),
        ],
        declarations: [
            _host_floating_panel_component__WEBPACK_IMPORTED_MODULE_7__.HostFloatingPanel,
            _host_settings_component__WEBPACK_IMPORTED_MODULE_8__.HostSettingsComponent,
        ],
        providers: [
            { provide: tabby_terminal__WEBPACK_IMPORTED_MODULE_5__.TerminalDecorator, useClass: _host_terminal_decorator__WEBPACK_IMPORTED_MODULE_6__.HostTerminalDecorator, multi: true },
            { provide: tabby_settings__WEBPACK_IMPORTED_MODULE_4__.SettingsTabProvider, useClass: _host_settings_component__WEBPACK_IMPORTED_MODULE_8__.HostSettingsTabProvider, multi: true },
            { provide: tabby_core__WEBPACK_IMPORTED_MODULE_3__.ToolbarButtonProvider, useClass: HostStartPageButtonProvider, multi: true },
        ],
    }),
    __metadata("design:paramtypes", [])
], HostPlusModule);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (HostPlusModule);

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map