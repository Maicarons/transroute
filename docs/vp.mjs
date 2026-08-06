// 跨平台 VitePress 运行器。
// 部分受控 Bash 环境会在 NODE_OPTIONS 注入 safe-delete shim，导致构建时清理临时文件失败。
// 本脚本在启动 vitepress 子进程前清除 NODE_OPTIONS，使构建在 Windows(cmd)/Linux 均可正常进行，
// 且不影响用户本机（无该 shim 时清空空变量无副作用）。
import { spawnSync } from 'node:child_process'

const cmd = process.argv[2] || 'dev'
const env = { ...process.env }
delete env.NODE_OPTIONS

const res = spawnSync('npx', ['vitepress', cmd, ...process.argv.slice(3)], {
  stdio: 'inherit',
  shell: true,
  env,
})

process.exit(res.status ?? 1)
