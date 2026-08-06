// 让 docs 的 VitePress 构建使用自己的（空的）PostCSS 配置，
// 避免向上继承仓库根目录的 postcss.config.js / tailwind.config.js，
// 否则会在文档构建时误套用 Tailwind 并报 "content option missing" 警告。
export default {
  plugins: [],
}
