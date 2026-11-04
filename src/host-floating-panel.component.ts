/**
 * Host+ 浮动面板组件
 * 功能描述：浮动在终端上的主机管理面板，支持搜索/分组/SSH连接/最小化/拖拽
 */
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core'
import { HostDataService, HostEntry, HostGroup, PositionMemoryData, PortForwardRule, PortForwardType, OfficialSSHHost } from './host-data.service'
import { HostI18nService } from './host-i18n.service'

@Component({
  selector: 'hp-floating-panel',
  template: `
    <!-- ====== 浮动面板主体 ====== -->
    <div class="hp-panel" #panelRef
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
        <span class="hp-title-btn hp-title-btn-sync"
              [title]="i18n.t('panel.sync')"
              [style.opacity]="syncBusy ? 0.5 : 1"
              (mousedown)="$event.stopPropagation()"
              (click)="syncOfficialHosts(); $event.stopPropagation()">&#x21BB;</span>
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
                  <div class="hp-host-name-row">
                    <span class="hp-host-name">{{ host.name }}</span>
                    <span class="hp-host-warning" *ngIf="authWarning(host)" [title]="authWarning(host)"
                      (click)="$event.stopPropagation()">&#x26A0;&#xFE0E;</span>
                  </div>
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
          <label class="hp-field-label">{{ i18n.t('host.advanced') }}</label>
          <div class="hp-auth-row">
            <label class="hp-auth-option" [class.active]="!!editHostEntry.skipBanner"
              [title]="i18n.t('host.skip_motd_hint')">
              <input type="checkbox" [(ngModel)]="editHostEntry.skipBanner" (ngModelChange)="onAdvancedToggle()">
              <span>{{ i18n.t('host.skip_motd') }}</span>
            </label>
            <label class="hp-auth-option" [class.active]="!!editHostEntry.reuseSession"
              [title]="i18n.t('host.reuse_session_hint')">
              <input type="checkbox" [(ngModel)]="editHostEntry.reuseSession" (ngModelChange)="onAdvancedToggle()">
              <span>{{ i18n.t('host.reuse_session') }}</span>
            </label>
          </div>
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
    <div class="hp-filter-menu hp-edit-group-menu" *ngIf="showEditGroupDropdown" (mousedown)="$event.stopPropagation()"
      [style.left.px]="editGroupMenuX" [style.top.px]="editGroupMenuY">
      <div class="hp-filter-option" [class.active]="!editHostEntry.group"
        (click)="editHostEntry.group = ''; showEditGroupDropdown = false">
        <svg class="hp-filter-opt-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
        {{ i18n.t('app.ungrouped') }}
      </div>
      <div class="hp-filter-opt-divider" *ngIf="allGroups.length > 0"></div>
      <div class="hp-filter-option" *ngFor="let g of allGroups"
        [class.active]="editHostEntry.group === g.name"
        (click)="editHostEntry.group = g.name; showEditGroupDropdown = false">
        <svg class="hp-filter-opt-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        {{ g.name }}
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
    .hp-title-btn-sync { font-size: 14px; }
    .hp-title-btn-sync:hover { color: var(--_primary); }
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
    .hp-filter-opt-svg { width: 13px; height: 13px; flex-shrink: 0; opacity: 0.75; }
    /* 编辑主机的分组下拉：去掉右侧滚动条，滑块不再破坏圆角 */
    .hp-edit-group-menu { scrollbar-width: none; -ms-overflow-style: none; }
    .hp-edit-group-menu::-webkit-scrollbar { display: none; width: 0; height: 0; }
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
    .hp-host-name-row { display: flex; align-items: center; gap: 4px; min-width: 0; }
    .hp-host-name {
      display: block; font-size: 0.9em; font-weight: 600;
      color: var(--_text); line-height: 1.4;
      min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .hp-host-warning {
      flex-shrink: 0; color: var(--_warning);
      font-size: 0.9em; line-height: 1; cursor: default;
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
export class HostFloatingPanel implements OnInit, OnDestroy {
  @ViewChild('listRef') listRef!: ElementRef
  @ViewChild('panelRef') panelRef!: ElementRef

  svc = new HostDataService()
  i18n = new HostI18nService()

  /** 由 TerminalDecorator 注入，用于调用 Tabby 原生 SSH 连接 */
  openSSHTab: ((host: string, port: number, user: string, password: string, privateKeyPath: string, forwardedPorts: PortForwardRule[], skipBanner: boolean, reuseSession: boolean) => boolean) | null = null
  syncOfficialHostsProvider: (() => Promise<OfficialSSHHost[]>) | null = null
  syncBusy = false

  private destroyed = false
  minimized = false
  panelX = 20
  panelY = 60
  panelWidth: number = +(localStorage.getItem('hp-panel-width') || '380')
  panelHeight: number = +(localStorage.getItem('hp-panel-height') || '0')
  private resizing: { dir: string; startW: number; startH: number; lastX: number; lastY: number } | null = null
  private resizeMoveHandler: ((ev: MouseEvent) => void) | null = null
  private resizeUpHandler: (() => void) | null = null
  searchText = ''
  filterGroup = ''
  showGroupDropdown = false
  filterMenuX = 0
  filterMenuY = 0
  showEditGroupDropdown = false
  editGroupMenuX = 0
  editGroupMenuY = 0
  highlightedId = ''

  hosts: HostEntry[] = []
  groups: HostGroup[] = []
  filteredHosts: HostEntry[] = []
  pinnedHosts: HostEntry[] = []

  sshHost = ''
  terminalRef: any = null
  profileId = ''

  onClose: (() => void) | null = null
  onMinimize: (() => void) | null = null

  posMemoryOn = false

  private dragging = false
  private dragOffsetX = 0
  private dragOffsetY = 0
  private dragMoveHandler: any = null
  private dragUpHandler: any = null

  get allGroups(): HostGroup[] {
    return this.groups
  }

  get displayGroups(): HostGroup[] {
    const groups = this.groups.filter(g => {
      if (this.filterGroup === '__ungrouped__') {
        if (g.name !== '') return false
      } else if (this.filterGroup) {
        if (g.name !== this.filterGroup) return false
      }
      if (this.searchText) {
        const hosts = this.getGroupHosts(g.name)
        return hosts.length > 0
      }
      return true
    })
    // 搜索时临时展开有命中的分组，不改动持久化的展开状态
    if (this.searchText && this.searchText.trim()) {
      return groups.map(g => ({ ...g, expanded: true }))
    }
    return groups
  }

  get selectedCount(): number {
    return this.filteredHosts.length
  }

  ngOnInit(): void {
    this.loadData()
    this.initTerminalInfo()
    window.addEventListener('hp-locale-changed', this.onLocaleChanged)
    window.addEventListener('hp-data-changed', this.onDataChanged)
  }

  applyPositionMemory(): void {
    this.initTerminalInfo()
    if (!this.profileId) this.profileId = 'default'
    this.posMemoryOn = this.svc.hasPositionMemory(this.profileId)
    this.loadData()
    if (this.posMemoryOn) {
      this.restorePosition()
    } else {
      // 关闭位置记忆：使用默认布局，不恢复位置/分组/筛选/滚动
      this.svc.collapseAllGroups()
      this.groups = this.svc.getGroups()
      this.filterGroup = ''
      this.centerPanel()
    }
    this.onSearch()
  }

  /** 位置记忆关闭时，面板默认居中显示 */
  private centerPanel(): void {
    setTimeout(() => {
      try {
        const panelEl = this.panelRef?.nativeElement as HTMLElement | null
        const width = panelEl?.offsetWidth || this.panelWidth || 380
        const height = panelEl?.offsetHeight || this.panelHeight || 420
        if (this.terminalRef) {
          const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
          if (!hostEl) return
          this.panelX = Math.max(4, Math.round((hostEl.clientWidth - width) / 2))
          this.panelY = Math.max(4, Math.round((hostEl.clientHeight - height) / 2))
        } else {
          this.panelX = Math.max(4, Math.round((window.innerWidth - width) / 2))
          this.panelY = Math.max(4, Math.round((window.innerHeight - height) / 2))
        }
      } catch { /* ignore */ }
    }, 0)
  }

  private initTerminalInfo(): void {
    if (this.terminalRef) {
      try {
        const ssh = this.terminalRef?.sshSession ?? this.terminalRef?._session ?? null
        if (ssh) {
          this.sshHost = ssh.host || ssh.options?.host || ''
          if (this.sshHost) this.sshHost = '@' + this.sshHost
        }
      } catch { /* ignore */ }
    }
    if (!this.profileId && this.terminalRef?.profile?.id) {
      this.profileId = this.terminalRef.profile.id
    }
    if (!this.profileId && this.terminalRef) {
      try {
        const ssh = this.terminalRef?.sshSession ?? this.terminalRef?._session ?? null
        if (ssh?.host) this.profileId = 'ssh:' + ssh.host
      } catch { /* ignore */ }
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true
    this.savePosMemory()
    window.removeEventListener('hp-locale-changed', this.onLocaleChanged)
    window.removeEventListener('hp-data-changed', this.onDataChanged)
    this.cleanDrag()
    this.cleanResize()
  }

  private onLocaleChanged = (): void => {
    this.i18n = new HostI18nService()
    this.loadData()
  }

  private onDataChanged = (): void => {
    this.loadData()
  }

  loadData(): void {
    this.svc.reload()
    this.hosts = this.svc.getAll()
    this.groups = this.svc.getGroups()
    this.pinnedHosts = this.svc.getPinned()
    if (this.filterGroup) {
      const valid = this.groups.some(g =>
        this.filterGroup === '__ungrouped__' ? !g.name : g.name === this.filterGroup
      )
      if (!valid) this.filterGroup = ''
    }
    this.onSearch()
  }

  getFilterGroupLabel(): string {
    if (!this.filterGroup || this.filterGroup === '') return this.i18n.t('app.all_groups')
    if (this.filterGroup === '__ungrouped__') return this.i18n.t('app.ungrouped')
    return this.filterGroup
  }

  toggleFilterDropdown(triggerEl: HTMLElement): void {
    if (this.showGroupDropdown) { this.showGroupDropdown = false; return }
    const rect = triggerEl.getBoundingClientRect()
    this.filterMenuX = rect.left
    this.filterMenuY = rect.bottom + 4
    this.showGroupDropdown = true
  }

  toggleEditGroupDropdown(triggerEl: HTMLElement): void {
    if (this.showEditGroupDropdown) { this.showEditGroupDropdown = false; return }
    const rect = triggerEl.getBoundingClientRect()
    this.editGroupMenuX = rect.left
    this.editGroupMenuY = rect.bottom + 4
    this.showEditGroupDropdown = true
  }

  onSearch(): void {
    let filtered = this.hosts
    if (this.searchText) {
      const q = this.searchText.toLowerCase()
      filtered = filtered.filter(h =>
        (h.name || '').toLowerCase().includes(q) ||
        (h.host || '').toLowerCase().includes(q) ||
        (h.ip || '').toLowerCase().includes(q) ||
        (h.username || '').toLowerCase().includes(q) ||
        (h.remark || '').toLowerCase().includes(q)
      )
    }
    if (this.filterGroup === '__ungrouped__') {
      filtered = filtered.filter(h => !h.group)
    } else if (this.filterGroup) {
      filtered = filtered.filter(h => h.group === this.filterGroup)
    }
    this.filteredHosts = filtered
  }

  getGroupHosts(groupName: string): HostEntry[] {
    return this.filteredHosts.filter(h => (h.group || '') === (groupName || ''))
  }

  toggleGroup(name: string): void {
    const target = this.groups.find(g => g.name === name)
    if (!target) return
    const willExpand = !target.expanded
    if (willExpand) {
      this.groups.forEach(g => { if (g.expanded && g.name !== name) this.svc.toggleGroupExpanded(g.name) })
    }
    this.svc.toggleGroupExpanded(name)
    this.groups = this.svc.getGroups()
  }

  connectFirst(): void {
    if (this.filteredHosts.length > 0) {
      this.connectToHost(this.filteredHosts[0])
    }
  }

  onQuickBarWheel(event: WheelEvent): void {
    const el = event.currentTarget as HTMLElement
    if (!el) return
    event.preventDefault()
    el.scrollLeft += event.deltaY
  }

  /** 连接到主机 — 优先 Tabby 原生 SSH 新建标签页，回退 CLI ssh */
  connectToHost(host: HostEntry): void {
    if (!host || this.destroyed) return
    // 多面板可能各自持有旧数据，连接前先以本地存储为准
    this.loadData()
    const current = this.hosts.find(h => h.id === host.id) || host
    this.svc.incrementUsage(current.id)
    this.highlightedId = current.id
    setTimeout(() => { this.highlightedId = '' }, 1500)

    const targetHost = current.host || current.ip
    const port = current.port || 22
    const username = current.username || 'root'

    if (!targetHost) return

    const authType = current.authType === 'publicKey' ? 'publicKey' : 'password'
    const privateKeyPath = authType === 'publicKey' ? (current.privateKeyPath || '').trim() : ''
    if (authType === 'publicKey' && !privateKeyPath) {
      alert(this.i18n.t('host.private_key_required'))
      return
    }
    const password = authType === 'publicKey' ? '' : (current.password || '')
    const forwardedPorts = current.forwardedPorts || []
    const skipBanner = !!current.skipBanner
    const reuseSession = current.reuseSession !== false

    // 方式 1：Tabby 原生 SSH — 新建标签页（ProfilesService / AppService）
    if (this.openSSHTab) {
      const ok = this.openSSHTab(targetHost, port, username, password, privateKeyPath, forwardedPorts, skipBanner, reuseSession)
      if (ok) return
    }

    // 方式 2：CLI 兜底 — 仅当原生方式不可用时
    const parts = ['ssh']
    if (privateKeyPath) parts.push('-i', `"${privateKeyPath}"`)
    if (port !== 22) parts.push('-p', String(port))
    for (const fw of forwardedPorts) {
      if (fw.type === 'Dynamic') {
        parts.push('-D', `${fw.host}:${fw.port}`)
      } else {
        const flag = fw.type === 'Remote' ? '-R' : '-L'
        parts.push(flag, `${fw.host}:${fw.port}:${fw.targetAddress}:${fw.targetPort}`)
      }
    }
    parts.push(`${username}@${targetHost}`)
    const sshCmd = parts.join(' ')

    if (this.terminalRef) {
      this.sendToTerminal(sshCmd + '\n')
      return
    }

    try { navigator.clipboard?.writeText(sshCmd) } catch {}
  }

  /** 发送文本到终端 */
  private sendToTerminal(text: string): void {
    try {
      let sent = false
      if (typeof this.terminalRef.sendInput === 'function') {
        this.terminalRef.sendInput(text); sent = true
      } else if (typeof this.terminalRef.write === 'function') {
        this.terminalRef.write(text); sent = true
      } else {
        const ssh = this.terminalRef?.sshSession ?? this.terminalRef?._session ?? null
        if (ssh && typeof ssh.write === 'function') { ssh.write(text); sent = true }
      }
      if (!sent) {
        const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
        if (hostEl) {
          const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input') as HTMLTextAreaElement | HTMLInputElement | null
          if (input) {
            input.focus(); input.value = text
            input.dispatchEvent(new Event('input', { bubbles: true }))
            sent = true
          }
        }
      }
      if (sent) this.focusTerminal()
    } catch (e) { console.warn('[Host+] sendToTerminal error', e) }
  }

  private focusTerminal(): void {
    try {
      const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
      if (!hostEl) return
      const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input') as HTMLElement | null
      if (input) input.focus()
    } catch { /* ignore */ }
  }

  showEditModal = false
  editHostEntry: any = { name: '', host: '', ip: '', port: 22, username: '', password: '', authType: 'password', privateKeyPath: '', skipBanner: false, reuseSession: true, remark: '' }
  showPassword = false

  showPortForwardModal = false
  pfHostId = ''
  pfHostName = ''
  pfType: PortForwardType = 'Local'
  pfAllRules: PortForwardRule[] = []
  pfNewRule: PortForwardRule = { type: 'Local', host: '127.0.0.1', port: 8000, targetAddress: '127.0.0.1', targetPort: 80, description: '' }

  get pfRules(): PortForwardRule[] {
    return this.pfAllRules.filter(rule => rule.type === this.pfType)
  }

  showGroupRename = false
  groupRenameIsNew = false
  groupRenameOldName = ''
  groupRenameValue = ''
  groupRenameOrder = 0

  addHost(): void {
    this.editHostEntry = { name: '', host: '', ip: '', port: 22, username: '', password: '', authType: 'password', privateKeyPath: '', skipBanner: false, reuseSession: true, remark: '', group: '', pinned: false }
    this.showEditModal = true
  }

  addHostToGroup(groupName: string): void {
    this.editHostEntry = { name: '', host: '', ip: '', port: 22, username: '', password: '', authType: 'password', privateKeyPath: '', skipBanner: false, reuseSession: true, remark: '', group: groupName || '', pinned: false }
    this.showEditModal = true
  }

  editHost(host: HostEntry): void {
    // 多面板可能各自持有旧数据，编辑前先以本地存储为准
    this.loadData()
    const current = this.hosts.find(h => h.id === host.id) || host
    this.editHostEntry = JSON.parse(JSON.stringify(current))
    if (!this.editHostEntry.authType) {
      this.editHostEntry.authType = this.editHostEntry.privateKeyPath ? 'publicKey' : 'password'
    }
    if (!this.editHostEntry.privateKeyPath) this.editHostEntry.privateKeyPath = ''
    this.editHostEntry.skipBanner = !!this.editHostEntry.skipBanner
    this.editHostEntry.reuseSession = this.editHostEntry.reuseSession !== false
    this.showEditModal = true
  }

  async browsePrivateKey(event: Event): Promise<void> {
    event.stopPropagation()
    try {
      const remote = (window as any).require('@electron/remote')
      const result = await remote.dialog.showOpenDialog({
        title: this.i18n.t('host.private_key'),
        properties: ['openFile'],
      })
      if (!result.canceled && result.filePaths && result.filePaths[0]) {
        this.editHostEntry.privateKeyPath = result.filePaths[0]
      }
    } catch {
      // 无法打开文件选择器时，允许用户手动输入路径
    }
  }

  openPortForward(host: HostEntry): void {
    this.pfHostId = host.id
    this.pfHostName = host.name || host.host
    this.pfAllRules = JSON.parse(JSON.stringify(host.forwardedPorts || []))
    this.pfType = this.pfAllRules.length && this.pfAllRules[0].type ? this.pfAllRules[0].type : 'Local'
    this.resetPfNewRule()
    this.showPortForwardModal = true
  }

  closePortForward(): void {
    this.showPortForwardModal = false
    this.pfHostId = ''
    this.pfHostName = ''
    this.pfAllRules = []
  }

  onPfTypeChange(): void {
    this.resetPfNewRule()
  }

  private resetPfNewRule(): void {
    if (this.pfType === 'Dynamic') {
      this.pfNewRule = { type: 'Dynamic', host: '127.0.0.1', port: 1080, targetAddress: '', targetPort: 0, description: '' }
    } else {
      this.pfNewRule = { type: this.pfType, host: '127.0.0.1', port: 8000, targetAddress: '127.0.0.1', targetPort: 80, description: '' }
    }
  }

  addPortForwardRule(): void {
    const rule = this.pfNewRule
    const port = +rule.port
    if (!(rule.host || '').trim() || !port || port < 1 || port > 65535) {
      alert(this.i18n.t('pf.invalid'))
      return
    }
    if (this.pfType !== 'Dynamic') {
      const targetPort = +rule.targetPort
      if (!(rule.targetAddress || '').trim() || !targetPort || targetPort < 1 || targetPort > 65535) {
        alert(this.i18n.t('pf.invalid'))
        return
      }
    }
    this.pfAllRules.push({
      type: this.pfType,
      host: rule.host.trim(),
      port,
      targetAddress: this.pfType === 'Dynamic' ? '' : rule.targetAddress.trim(),
      targetPort: this.pfType === 'Dynamic' ? 0 : +rule.targetPort,
      description: (rule.description || '').trim(),
    })
    this.resetPfNewRule()
  }

  removePortForwardRule(rule: PortForwardRule): void {
    this.pfAllRules = this.pfAllRules.filter(item => item !== rule)
  }

  savePortForward(): void {
    if (!this.pfHostId) return
    this.svc.update(this.pfHostId, { forwardedPorts: this.pfAllRules })
    this.closePortForward()
    this.loadData()
  }

  /** 将 Tabby 官方 SSH Profile 同步到本插件；密码不导入 */
  async syncOfficialHosts(): Promise<void> {
    if (this.syncBusy || !this.syncOfficialHostsProvider) return
    this.syncBusy = true
    try {
      const official = await this.syncOfficialHostsProvider()
      if (!official.length) {
        alert(this.i18n.t('sync.empty'))
        return
      }

      // 先创建官方配置里存在的分组
      const groupNames = new Set(this.svc.getGroups().map(g => g.name))
      for (const host of official) {
        if (host.groupName && !groupNames.has(host.groupName)) {
          this.svc.addGroup(host.groupName)
          groupNames.add(host.groupName)
        }
      }

      const all = this.svc.getAll()
      let added = 0
      let updated = 0
      for (const host of official) {
        const match = all.find(item => item.officialProfileId === host.id)
          || all.find(item =>
            (item.host || '').toLowerCase() === (host.host || '').toLowerCase()
            && (item.port || 22) === host.port
            && (item.username || '') === host.username
          )
        const data = {
          name: host.name || host.host,
          host: host.host,
          ip: host.host,
          port: host.port,
          username: host.username,
          authType: host.authType,
          privateKeyPath: host.privateKeyPath,
          forwardedPorts: host.forwardedPorts,
          skipBanner: host.skipBanner,
          reuseSession: host.reuseSession,
          group: host.groupName || '',
          officialProfileId: host.id,
        }
        if (match) {
          // 已有主机保留原密码，只更新官方配置能提供的字段
          this.svc.update(match.id, data)
          updated++
        } else {
          const entry = this.svc.add({ ...data, password: '', remark: '', pinned: false })
          all.push(entry)
          added++
        }
      }
      this.loadData()
      window.dispatchEvent(new CustomEvent('hp-data-changed'))
      alert(this.i18n.t('sync.done', { added, updated }))
    } catch (error) {
      alert(this.i18n.t('sync.error', { error: String((error && error.message) || error) }))
    } finally {
      this.syncBusy = false
    }
  }

  /** 认证信息缺失时的列表警告文案 */
  authWarning(host: HostEntry): string {
    const authType = host.authType === 'publicKey' ? 'publicKey' : 'password'
    if (authType === 'publicKey' && !(host.privateKeyPath || '').trim()) {
      return this.i18n.t('host.private_key_missing_warning')
    }
    if (authType === 'password' && !(host.password || '').trim()) {
      return this.i18n.t('host.password_missing_warning')
    }
    return ''
  }

  copyHost(host: HostEntry): void {
    const addr = host.port && host.port !== 22
      ? `${host.host}:${host.port}`
      : host.host
    try { navigator.clipboard?.writeText(addr) } catch {}
  }

  copyPassword(host: HostEntry): void {
    try { navigator.clipboard?.writeText(host.password || '') } catch {}
  }

  onResetUsage(): void {
    if (!this.editHostEntry?.id) return
    this.svc.update(this.editHostEntry.id, { usageCount: 0 })
    this.editHostEntry.usageCount = 0
  }

  /** 高级开关独立于表单保存：勾选即写入，避免关闭弹窗后丢失 */
  onAdvancedToggle(): void {
    if (!this.editHostEntry?.id) return
    const ok = this.svc.update(this.editHostEntry.id, {
      skipBanner: !!this.editHostEntry.skipBanner,
      reuseSession: this.editHostEntry.reuseSession !== false,
    })
    if (ok) window.dispatchEvent(new CustomEvent('hp-data-changed'))
  }

  saveEditHost(): void {
    if (!this.editHostEntry.name || !this.editHostEntry.name.trim()) return
    if (!this.editHostEntry.host && !this.editHostEntry.ip) return
    const authType: 'password' | 'publicKey' = this.editHostEntry.authType === 'publicKey' ? 'publicKey' : 'password'
    const privateKeyPath = (this.editHostEntry.privateKeyPath || '').trim()
    if (authType === 'publicKey' && !privateKeyPath) {
      alert(this.i18n.t('host.private_key_required'))
      return
    }
    if (authType === 'publicKey' && !privateKeyPath.startsWith('vault://')) {
      try {
        const fs = (window as any).require('fs')
        // Tabby 官方私钥引用可能是 file://C:\...，校验时去掉 file:// 前缀
        const checkPath = privateKeyPath.startsWith('file://') ? privateKeyPath.slice('file://'.length) : privateKeyPath
        if (!fs.existsSync(checkPath)) {
          alert(this.i18n.t('host.private_key_missing', { path: privateKeyPath }))
          return
        }
      } catch { /* 无法检查时交给 Tabby 连接时报错 */ }
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
      skipBanner: !!this.editHostEntry.skipBanner,
      reuseSession: this.editHostEntry.reuseSession !== false,
      remark: (this.editHostEntry.remark || '').trim(),
      group: this.editHostEntry.group || '',
      pinned: !!this.editHostEntry.pinned,
    }
    if (this.editHostEntry.id) { this.svc.update(this.editHostEntry.id, updateData) }
    else { this.svc.add(updateData) }
    this.showEditModal = false; this.searchText = ''; this.loadData()
  }

  closeEditModal(): void { this.showEditModal = false; this.showEditGroupDropdown = false; this.showPassword = false }

  private dragHostId: string | null = null
  listDropOver = false

  onDragStart(event: DragEvent, host: HostEntry): void {
    this.dragHostId = host.id
    event.dataTransfer?.setData('text/plain', host.id)
    event.dataTransfer!.effectAllowed = 'move'
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
    const el = event.currentTarget as HTMLElement
    const y = event.clientY - el.getBoundingClientRect().top
    const dropBottom = y > el.offsetHeight / 2
    document.querySelectorAll('.hp-host-row.drag-over, .hp-host-row.drag-over-bottom, .hp-group-header.drag-over').forEach(r => r.classList.remove('drag-over', 'drag-over-bottom'))
    el.classList.add(dropBottom ? 'drag-over-bottom' : 'drag-over')
  }

  onDragLeave(event: DragEvent): void { (event.currentTarget as HTMLElement).classList.remove('drag-over', 'drag-over-bottom') }

  onDrop(event: DragEvent, targetHost: HostEntry): void {
    event.preventDefault(); this.cleanDragStyles()
    const srcId = this.dragHostId || event.dataTransfer?.getData('text/plain')
    if (!srcId || srcId === targetHost.id) return
    const allHosts = this.hosts
    const srcIdx = allHosts.findIndex(h => h.id === srcId)
    const tgtIdx = allHosts.findIndex(h => h.id === targetHost.id)
    if (srcIdx === -1 || tgtIdx === -1) return
    const srcHost = allHosts[srcIdx]
    if ((srcHost.group || '') !== (targetHost.group || '')) {
      this.svc.update(srcHost.id, { group: targetHost.group || '' })
      srcHost.group = targetHost.group || ''
    }
    const el = event.currentTarget as HTMLElement
    const y = event.clientY - el.getBoundingClientRect().top
    const dropAfter = y > el.offsetHeight / 2
    const [moved] = allHosts.splice(srcIdx, 1)
    const adjustedTgt = tgtIdx > srcIdx ? tgtIdx - 1 : tgtIdx
    const insertAt = dropAfter ? adjustedTgt + 1 : adjustedTgt
    allHosts.splice(insertAt, 0, moved)
    this.svc.reorder(allHosts.map(h => h.id))
    this.loadData()
  }

  onDropToGroup(event: DragEvent, groupName: string): void {
    event.preventDefault(); this.cleanDragStyles()
    const srcId = this.dragHostId || event.dataTransfer?.getData('text/plain')
    if (!srcId) return
    const srcHost = this.hosts.find(h => h.id === srcId)
    if (!srcHost || (srcHost.group || '') === (groupName || '')) return
    this.svc.update(srcHost.id, { group: groupName || '' })
    const allIds = this.hosts.map(h => h.id)
    const idx = allIds.indexOf(srcId)
    if (idx !== -1) allIds.splice(idx, 1)
    allIds.push(srcId)
    this.svc.reorder(allIds)
    this.loadData()
  }

  onDragEnd(event: DragEvent): void { this.dragHostId = null; this.cleanDragStyles(); this.listDropOver = false }

  onListDragOver(event: DragEvent): void {
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
    this.listDropOver = true
  }

  onListDragLeave(event: DragEvent): void {
    this.listDropOver = false
  }

  onListDrop(event: DragEvent, groupName: string): void {
    event.preventDefault()
    this.listDropOver = false
    this.cleanDragStyles()
    const srcId = this.dragHostId || event.dataTransfer?.getData('text/plain')
    if (!srcId) return
    const srcHost = this.hosts.find(h => h.id === srcId)
    if (!srcHost) return
    if ((srcHost.group || '') !== (groupName || '')) {
      this.svc.update(srcHost.id, { group: groupName || '' })
      srcHost.group = groupName || ''
    }
    const allIds = this.hosts.map(h => h.id)
    const idx = allIds.indexOf(srcId)
    if (idx !== -1) allIds.splice(idx, 1)
    allIds.push(srcId)
    this.svc.reorder(allIds)
    this.loadData()
  }

  private cleanDragStyles(): void {
    document.querySelectorAll('.hp-host-row.dragging, .hp-host-row.drag-over, .hp-host-row.drag-over-bottom, .hp-group-header.drag-over')
      .forEach(el => el.classList.remove('dragging', 'drag-over', 'drag-over-bottom'))
  }

  showGroupRenameDialog(oldName: string): void {
    this.groupRenameIsNew = false; this.groupRenameOldName = oldName; this.groupRenameValue = oldName
    const g = this.svc.getGroups().find(gr => gr.name === oldName)
    this.groupRenameOrder = g?.order ?? 0
    this.showGroupRename = true
  }

  deleteGroup(name: string): void {
    const displayName = name || this.i18n.t('app.ungrouped')
    const count = this.svc.getAll().filter(h => (h.group || '') === name).length
    if (!confirm(this.i18n.t('group.delete_confirm', { name: displayName, count }))) return
    this.svc.removeGroup(name)
    this.loadData()
  }

  deleteHost(host: HostEntry): void {
    if (!confirm(this.i18n.t('panel.delete_confirm', { name: host.name }))) return
    this.svc.remove(host.id)
    this.loadData()
  }

  confirmGroupRename(): void {
    const newName = this.groupRenameValue?.trim()
    if (this.groupRenameIsNew) {
      if (newName) this.svc.addGroup(newName, this.groupRenameOrder)
    } else {
      if (!newName || newName === this.groupRenameOldName) {
        this.svc.updateGroupOrder(this.groupRenameOldName, this.groupRenameOrder)
        this.closeGroupRename(); this.loadData(); return
      }
      this.svc.renameGroup(this.groupRenameOldName, newName)
      this.svc.updateGroupOrder(newName, this.groupRenameOrder)
    }
    this.closeGroupRename(); this.loadData()
  }

  closeGroupRename(): void { this.showGroupRename = false; this.groupRenameIsNew = false; this.groupRenameOldName = ''; this.groupRenameValue = ''; this.groupRenameOrder = 0 }

  addNewGroup(): void { this.groupRenameIsNew = true; this.groupRenameOldName = ''; this.groupRenameValue = ''; this.groupRenameOrder = 0; this.showGroupRename = true }

  startDrag(event: MouseEvent): void {
    if (event.button !== 0) return
    this.dragging = true
    this.dragOffsetX = event.clientX - this.panelX
    this.dragOffsetY = event.clientY - this.panelY
    const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
    this.dragMoveHandler = (ev: MouseEvent) => {
      if (!this.dragging) return
      let x = ev.clientX - this.dragOffsetX
      let y = ev.clientY - this.dragOffsetY
      if (hostEl) {
        const panelEl = hostEl.querySelector('.hp-panel') as HTMLElement | null
        const ph = panelEl?.offsetHeight || 200; const pw = panelEl?.offsetWidth || 380
        const maxX = Math.max(0, hostEl.clientWidth - pw - 4); const maxY = Math.max(0, hostEl.clientHeight - ph - 4)
        x = Math.max(0, Math.min(x, maxX)); y = Math.max(0, Math.min(y, maxY))
      }
      this.panelX = x; this.panelY = y
    }
    this.dragUpHandler = () => {
      this.dragging = false
      if (this.posMemoryOn && this.profileId) { this.svc.savePositionMemory(this.profileId, { panelX: this.panelX, panelY: this.panelY }) }
      this.cleanDrag()
    }
    document.addEventListener('mousemove', this.dragMoveHandler)
    document.addEventListener('mouseup', this.dragUpHandler)
  }

  private cleanDrag(): void {
    if (this.dragMoveHandler) { document.removeEventListener('mousemove', this.dragMoveHandler); this.dragMoveHandler = null }
    if (this.dragUpHandler) { document.removeEventListener('mouseup', this.dragUpHandler); this.dragUpHandler = null }
  }

  /* ---- 面板大小调整 ---- */
  startResize(event: MouseEvent, dir: string): void {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const panelEl = (event.currentTarget as HTMLElement).closest('.hp-panel') as HTMLElement
    const startH = this.panelHeight || panelEl?.offsetHeight || 420
    this.resizing = { dir, startW: this.panelWidth, startH, lastX: event.clientX, lastY: event.clientY }
    this.resizeMoveHandler = (ev: MouseEvent) => {
      if (!this.resizing) return
      const dx = ev.clientX - this.resizing.lastX
      const dy = ev.clientY - this.resizing.lastY
      this.resizing.lastX = ev.clientX
      this.resizing.lastY = ev.clientY
      const dir = this.resizing.dir
      const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
      const maxW = hostEl ? hostEl.clientWidth : 9999
      const maxH = hostEl ? hostEl.clientHeight : 9999
      let newW = this.panelWidth
      let newH = this.panelHeight || this.resizing.startH
      if (dir.includes('e')) { const limit = maxW - this.panelX; newW = Math.max(300, Math.min(newW + dx, limit)) }
      if (dir.includes('w')) { const maxShrink = newW - 300; const leftLimit = this.panelX; const dw = Math.max(Math.min(dx, maxShrink, leftLimit), -maxShrink); newW -= dw; this.panelX += dw }
      if (dir.includes('s')) { const limit = maxH - this.panelY; newH = Math.max(400, Math.min(newH + dy, limit)) }
      if (dir.includes('n')) { const maxShrink = newH - 400; const topLimit = this.panelY; const dh = Math.max(Math.min(dy, maxShrink, topLimit), -maxShrink); newH -= dh; this.panelY += dh }
      this.panelWidth = Math.round(newW)
      this.panelHeight = Math.round(newH)
    }
    this.resizeUpHandler = () => {
      localStorage.setItem('hp-panel-width', String(this.panelWidth))
      localStorage.setItem('hp-panel-height', String(this.panelHeight || '0'))
      this.resizing = null
      this.cleanResize()
    }
    document.addEventListener('mousemove', this.resizeMoveHandler)
    document.addEventListener('mouseup', this.resizeUpHandler)
  }

  private cleanResize(): void {
    if (this.resizeMoveHandler) { document.removeEventListener('mousemove', this.resizeMoveHandler); this.resizeMoveHandler = null }
    if (this.resizeUpHandler) { document.removeEventListener('mouseup', this.resizeUpHandler); this.resizeUpHandler = null }
  }

  private restorePosition(): void {
    if (this.posMemoryOn && this.profileId) {
      const mem = this.svc.getPositionMemory(this.profileId)
      if (mem) {
        this.panelX = Math.max(0, mem.panelX || 20); this.panelY = Math.max(0, mem.panelY || 60)
        if (mem.filterGroup !== undefined) this.filterGroup = mem.filterGroup
        if (this.filterGroup && this.filterGroup !== '__ungrouped__') {
          if (!this.groups.some(g => g.name === this.filterGroup)) this.filterGroup = ''
        }
        if (mem.groupExpanded) {
          this.groups.forEach(g => { if (mem.groupExpanded[g.name] !== undefined) g.expanded = mem.groupExpanded[g.name] })
        }
        if (mem.panelScrollTop > 0) {
          setTimeout(() => { if (this.listRef?.nativeElement) this.listRef.nativeElement.scrollTop = mem.panelScrollTop }, 50)
        }
        return
      }
    }
    // 没有开启记忆：保留入口/居中定位的默认位置，只做边界修正
    setTimeout(() => {
      const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
      if (hostEl) {
        const panelEl = hostEl.querySelector('.hp-panel') as HTMLElement | null
        const ph = panelEl?.offsetHeight || 200; const pw = panelEl?.offsetWidth || 380
        this.panelX = Math.max(0, Math.min(this.panelX, Math.max(0, hostEl.clientWidth - pw - 4)))
        this.panelY = Math.max(0, Math.min(this.panelY, Math.max(0, hostEl.clientHeight - ph - 4)))
      }
    }, 0)
  }

  private savePosMemory(): void {
    if (!this.profileId && this.terminalRef) {
      try {
        const ssh = this.terminalRef?.sshSession ?? this.terminalRef?._session ?? null
        if (this.terminalRef?.profile?.id) this.profileId = this.terminalRef.profile.id
        else if (ssh?.host) this.profileId = 'ssh:' + ssh.host
      } catch { /* ignore */ }
    }
    if (this.posMemoryOn && this.profileId) {
      const scrollTop = this.listRef?.nativeElement?.scrollTop || 0
      const groupExp: Record<string, boolean> = {}
      this.groups.forEach(g => { groupExp[g.name] = g.expanded })
      this.svc.savePositionMemory(this.profileId, {
        panelScrollTop: scrollTop > 0 ? scrollTop : undefined,
        filterGroup: this.filterGroup, groupExpanded: groupExp,
      })
    }
  }

  togglePosMemory(): void {
    if (!this.profileId) this.profileId = 'default'
    this.posMemoryOn = this.svc.togglePositionMemory(this.profileId)
    if (this.posMemoryOn) {
      const groupExp: Record<string, boolean> = {}
      this.groups.forEach(g => { groupExp[g.name] = g.expanded })
      this.svc.savePositionMemory(this.profileId, {
        entryX: 0, entryY: 0, panelX: this.panelX, panelY: this.panelY,
        panelScrollTop: this.listRef?.nativeElement?.scrollTop || 0,
        filterGroup: this.filterGroup, groupExpanded: groupExp,
      })
    }
  }

  doClose(): void {
    if (!this.profileId) this.initTerminalInfo()
    this.savePosMemory()
    if (this.onClose) this.onClose()
  }

  noBubble(event: MouseEvent): void { event.stopPropagation() }

  /** 快捷翻译方法（供模板使用） */
  t(zh: string, en: string): string {
    return this.i18n.getLocale() === 'en-US' ? en : zh
  }
}
