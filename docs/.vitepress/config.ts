import { defineConfig } from 'vitepress'

// VitePress 站点配置（自包含于 docs/ 目录）。
export default defineConfig({
  title: 'TransRoute 物流拓扑系统',
  description:
    '基于真实路网的物流轴辐式（hub-and-spoke）拓扑建模与最优路径计算系统，含衍生经营游戏《物流大亨》。',
  lang: 'zh-CN',

  // 部署到 GitHub Pages 的 <repo> 子路径时，取消下一行注释并改为实际仓库名，
  // 例如仓库名为 transroute 则 base: '/transroute/'。本地直接预览保持 '/' 即可。
  // base: '/transroute/',

  markdown: {
    // 关闭原生 HTML 透传与 markdown-it-attrs 属性语法：
    // 物流文档中大量出现 { ... }（如配置片段、JSON 示例），attrs 插件会将其误判为
    // 属性语法导致编译报错（Duplicate attribute / Transform failed）。关闭后最稳妥。
    html: false,
    attrs: { disable: true },
  },

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: '《物流大亨》', link: '/game/' },
      { text: '参考', link: '/reference/project-structure' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '使用指南',
          items: [
            { text: '项目介绍', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '整体架构', link: '/guide/architecture' },
            { text: '真实数据源', link: '/guide/data-sources' },
            { text: '轴辐式拓扑模型', link: '/guide/topology-model' },
            { text: '路径计算', link: '/guide/route-calculation' },
            { text: '本地 OSRM 部署', link: '/guide/local-osrm' },
            { text: '界面与使用', link: '/guide/ui' },
          ],
        },
      ],
      '/game/': [
        {
          text: '《物流大亨》',
          items: [
            { text: '游戏概览', link: '/game/' },
            { text: '核心机制', link: '/game/mechanics' },
            { text: '金融与资产', link: '/game/finance' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '参考',
          items: [
            { text: '项目结构', link: '/reference/project-structure' },
            { text: '构建与部署', link: '/reference/build-deploy' },
          ],
        },
      ],
    },

    search: { provider: 'local' },
    docFooter: { prev: true, next: true },
    outline: { level: [2, 3] },
    lastUpdated: true,
    socialLinks: [{ icon: 'github', link: 'https://github.com/' }],

    footer: {
      message: 'TransRoute · 基于真实路网的物流拓扑系统',
      copyright: '文档随源码维护',
    },
  },
})
