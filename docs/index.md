---
layout: home

hero:
  name: TransRoute
  text: 物流拓扑计算系统
  tagline: 基于真实路网的轴辐式（hub-and-spoke）物流建模与最优路径计算
  actions:
    - theme: brand
      text: 项目介绍
      link: /guide/introduction
    - theme: alt
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 玩《物流大亨》
      link: /game/

features:
  - icon: 🗺️
    title: 真实坐标，零虚构
    details: 所有节点坐标来自真实城市目录、OSM/高德地理编码与路径规划，WGS-84 零偏移对齐底图，严禁任何模拟/编造数据。
  - icon: 🕸️
    title: 多级轴辐式拓扑
    details: 站点 → 当地物流中心 → 城市节点 → 中转枢纽四级层级，自动组网、按层级就近互连并生成枢纽干线，贴合真实物流分拨网络。
  - icon: 🚚
    title: 真实路网权重
    details: 边权重直接取自 OSRM / 高德真实公路里程与耗时，缺失时回退直线估算并打标，路径计算可显示「真实路网里程占比」。
  - icon: 🧮
    title: 多目标最优路径
    details: Dijkstra 支持最短里程 / 最低成本 / 最快时效三种目标，边界处理费与时间，输出逐段明细与迂回系数。
  - icon: 🖥️
    title: 可缩放拓扑图与地图
    details: 拓扑图支持滚轮缩放、拖拽平移；地图复用 MapLibre 真实底图，城市点、在途弧线、真实道路叠加一目了然。
  - icon: 🎮
    title: 衍生经营游戏《物流大亨》
    details: 在 docs/game 中找到独立小游戏：接订单、建物流点、购车/租赁、借贷周转，体验物流公司经营全链路。
---

## TransRoute 是什么

TransRoute 是一套**以真实地理数据为底**的物流拓扑计算系统。它把现实中的「厂 → 物流站点 → 当地物流中心 → 城市节点 → 中转枢纽 → 干线 → 目的地枢纽 → … → 终点」多级轴辐式（hub-and-spoke）分拨网络抽象成图模型，并用 **OSRM / 高德真实公路路网**作为边的权重，计算两点之间在「最短里程 / 最低成本 / 最快时效」下的最优路径。

整个项目坚持一条铁律：**所有坐标与里程必须真实**，任何模拟或虚构数据都不允许进入系统。

仓库内还包含一个完全独立的衍生项目 `game/`（经营小游戏《物流大亨》），它复用同一套真实城市坐标与地图组件，但拥有自己的依赖与状态机。

## 文档导航

- **使用指南**：从[项目介绍](/guide/introduction)到[快速开始](/guide/getting-started)，再到[架构](/guide/architecture)、[真实数据源](/guide/data-sources)、[拓扑模型](/guide/topology-model)、[路径计算](/guide/route-calculation)、[本地 OSRM 部署](/guide/local-osrm)与[界面使用](/guide/ui)。
- **《物流大亨》**：[游戏概览](/game/)、[核心机制](/game/mechanics)、[金融与资产](/game/finance)。
- **参考**：[项目结构](/reference/project-structure)、[构建与部署](/reference/build-deploy)。
