# Tabby-Host-Plus

Tabby 主机管理插件。浮动面板 + 分组管理 + 一键 SSH 连接，适配毛玻璃质感。

## 功能

- **主机管理**：名称、地址、端口、用户名、密码、备注六个字段
- **分组管理**：手风琴折叠、新建/重命名/删除分组、拖拽排序
- **SSH 连接**：点击主机行直接通过 Tabby 原生 `ProfilesService` 新建 SSH 标签页，支持密码自动填充
- **快捷栏**：最多固定 3 个常用主机到顶部
- **复制功能**：一键复制主机地址 / 复制密码
- **面板操作**：拖拽移动、8 方向调整大小、最小化/关闭
- **首页入口**：支持在 Tabby 首页直接唤出独立面板
- **位置记忆**：按 SSH Profile 记忆面板位置、分组展开状态、滚动位置
- **双入口模式**：工具栏按钮 / 可拖拽浮动按钮，实时切换
- **6 套毛玻璃预设**：浅色/深色/海洋蓝/森林绿/日落橙/薰衣草紫，支持自定义配色
- **中英双语**：自动检测语言，可手动切换
- **数据管理**：JSON 导入/导出，一键清空

## 安装

> 需要 Tabby 1.0.163 或更高版本。

### 方式一：手动安装

1. 下载本项目：

   - GitHub 页面点击 **Code → Download ZIP**，解压
   - 或 `git clone https://github.com/iishen717/Tabby-Host-Plus.git`

2. 在 Tabby 插件目录下创建插件文件夹（文件夹名必须是 `tabby-host-plus`，目录不存在时手动创建）：

```
Windows: %APPDATA%\tabby\plugins\node_modules\tabby-host-plus\
macOS:   ~/Library/Application Support/tabby/plugins/node_modules/tabby-host-plus/
Linux:   ~/.config/tabby/plugins/node_modules/tabby-host-plus/
```

3. 把项目中的 `package.json` 和 `dist/index.js` 复制进去，最终结构为：

```
tabby-host-plus/
├── package.json
└── dist/
    └── index.js
```

4. 重启 Tabby。

> **注意**：不要直接把解压出来的 `Tabby-Host-Plus-main` 文件夹放进 `node_modules`。Tabby 只识别以 `tabby-`（小写）开头的文件夹，文件夹名不对插件不会被加载。

### 方式二：从源码构建

需要先安装 [Node.js 18+](https://nodejs.org/)。

```bash
git clone https://github.com/iishen717/Tabby-Host-Plus.git
cd Tabby-Host-Plus
npm install
npm run build
```

构建产物为 `dist/index.js`。然后按「方式一」的第 2、3 步，把 `package.json` 和 `dist/` 复制到 Tabby 插件目录，重启 Tabby。

> `npm install` 会自动执行一次构建（`prepare` 脚本）；修改源码后运行 `npm run build` 重新构建。

## 使用

### 打开面板

- **终端内**：点击终端工具栏或右上角的 `@ Host+` 按钮
- **首页**：点击首页的 "Host-Plus" 按钮直接弹出独立面板

### 添加主机

1. 点击面板底部 **"+ 新建主机"** 或分组标题右侧的 **"+"**
2. 填写主机信息：
   - **名称**：主机的显示名称
   - **主机地址**：IP 或域名
   - **端口**：SSH 端口（默认 22）
   - **用户名**：SSH 登录用户
   - **密码**：SSH 登录密码（不会在主面板显示）
   - **备注**：附加说明信息
   - **分组**：选择或新建分组
3. 点击 **"保存"**

### 连接主机

- **单击**主机行，自动通过 Tabby 新建 SSH 标签页
- 如果填写了密码，会自动传入，无需手动输入

### 主机行操作

鼠标悬停主机行后，右侧显示操作按钮：

| 按钮 | 功能 |
|------|------|
| ❐ | 复制主机地址（含端口） |
| ▣ | 复制密码 |
| ⏎ | SSH 连接 |
| ✎ | 编辑主机信息 |
| ✕ | 删除主机 |

### 管理分组

- 点击分组标题 **展开/折叠**主机列表（手风琴模式）
- 分组右侧 **"+"**：在该分组下新建主机
- 分组右侧 **"✎"**：重命名分组 / 调整排序
- 分组右侧 **"−"**：删除分组（主机移到未分组）

### 快捷栏

编辑主机时勾选 **"固定"**，该主机将出现在面板顶部的快捷栏中（最多 3 个）。

### 主题设置

打开 Tabby 设置 → 左侧 **"Host+"** 选项卡：
- **界面语言**：自动 / 中文 / English
- **颜色主题**：6 套毛玻璃预设 + 自定义配色
- **字体大小**：11-18px 滑块调节
- **入口模式**：工具栏按钮 / 浮动按钮

### 数据备份

设置页 **"数据"** 区域：
- **导出**：下载 JSON 备份文件
- **导入**：选择 JSON 文件恢复数据
- **清空**：输入 `DELETE` 确认清除所有数据

## 技术栈

- Angular 9 + TypeScript
- Tabby Terminal Plugin API
- Webpack 5

## License

MIT
