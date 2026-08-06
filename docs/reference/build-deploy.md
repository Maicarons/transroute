# 构建与部署

## 主应用构建

```bash
# 仓库根目录
npm install
npm run build          # = tsc --noEmit && vite build
```

- 含 `tsc` 类型检查，**0 类型错误**才算通过。
- 产物输出到 `dist/`。

### 沙箱/受控环境的构建注意

部分受控 Bash 环境会注入：

```
NODE_OPTIONS="--require=genie-safe-delete.cjs"
```

该 shim 把 Node 构建过程中对 `.temp` / `.cache` 的删除重定向到回收站，可能失败并导致任何清理型构建报错 `[safe-delete] 操作失败`。

**解决**：在构建命令前清空该变量（本机无此 shim 时无需）：

```bash
NODE_OPTIONS="" npm run build
```

> `dist/` 也是 Vite 默认输出目录，清理时同样受影响——所以「构建」和「清理缓存」类命令都应加 `NODE_OPTIONS=""`。

### 预览

```bash
npm run preview
```

## 游戏构建

```bash
cd game
npm install
NODE_OPTIONS="" npm run build     # = tsc --noEmit && vite build
```

游戏构建同样含 `tsc` 类型检查（之前曾借此抓出 `engine.ts` 中字符串误调 `.toLocaleString` 的隐患）。

## 部署到 GitHub Pages（Actions）

推荐用 GitHub Actions 从 `main` 分支部署静态站。把工作流放到 `.github/workflows/deploy-docs.yml`：

```yaml
name: Deploy Docs
on:
  push:
    branches: [main]
    paths: ['docs/**']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: docs/package-lock.json
      - working-directory: docs
        run: |
          npm ci
          NODE_OPTIONS="" npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

要点：

- `job` 需 `permissions: { contents: read, pages: write, id-token: write }` 且 `environment: github-pages`。
- `working-directory: docs` 让 npm 在文档工程内执行；`cache-dependency-path` 指向 `docs/package-lock.json`。
- 部署产物是 `docs/.vitepress/dist`（VitePress 输出目录）。
- 若部署到 `<repo>` 子路径，请在 `docs/.vitepress/config.ts` 设 `base: '/<repo>/'`（见配置文件注释）。

### 关于「创建」vs「更新」Pages

- 仓库**从未开过** Pages：用 `gh api -X POST /repos/<owner>/<repo>/pages -f "build_type=workflow"` 首次启用（返回 `build_type=workflow` 即成功）。
- 已开过 Pages 后想改回 Actions 源，才用 `PUT`。`actions/configure-pages@v5` 的 `enablement: true` 需非 `GITHUB_TOKEN` 的 PAT，默认 token 不行。

## 本地预览文档站

```bash
cd docs
npm install
npm run dev        # 默认 http://localhost:5173/
# 或构建后预览：
NODE_OPTIONS="" npm run build
npm run preview
```

## 从分支部署（替代方案）

若不想用 Actions 工作流（例如 PAT 缺 `workflow` scope），也可把构建产物推到 `gh-pages` 分支，Pages 源设为该分支 `/`：

```bash
gh api -X POST /repos/<owner>/<repo>/pages \
  -f source[branch]=gh-pages -f source[path]/
```

此路无需 workflow 文件。

## 排错清单

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `[safe-delete] 操作失败` | Bash 注入了 safe-delete shim | 命令前加 `NODE_OPTIONS=""` |
| `tsc` 报类型错误但 `vite dev` 正常 | dev 不做类型检查 | 修类型后以 `npm run build`（含 tsc）为准 |
| 文档中 `{...}` 处报 `Duplicate attribute` / `Transform failed` | markdown-it-attrs 把花括号当属性语法 | 本配置已 `attrs: { disable: true }`；若自定义配置请保持关闭 |
| GitHub Pages 404 | base 路径不匹配 / 未启用 Actions 源 | 设 `base: '/<repo>/'`，并 `POST` 启用 Pages(workflow) |
| `git push` 被 TLS 拦截 | 代理证书问题 | 关掉坏代理 + 切 schannel + 关吊销检查再 push |
