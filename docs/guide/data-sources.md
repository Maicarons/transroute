# 真实数据源

TransRoute 的底线是 **坐标与里程必须真实**。本章说明数据从哪来、各源的取舍、以及坐标系对齐的关键点。

## 三个真实坐标来源

| 来源 | 位置 | 说明 | 是否需要 Key |
| --- | --- | --- | --- |
| 离线城市目录 | `src/data/cities.ts` 的 `REAL_CITIES`（约 40 个中国城市，真实 WGS-84） | 内置、稳定、零网络，适合快速选取与示例 | 否 |
| 浏览器实时地理编码 | `src/lib/geocode.ts`：OSM Nominatim（`https://nominatim.openstreetmap.org/search`）/ 高德 | 实时把地名解析为坐标；沙箱 IP 可能被 Nominatim 拒绝，但真实浏览器可用 | 高德需要 |
| 高德真实路径 | `src/lib/amap.ts` 的 `amapDirection` | 返回真实道路折线/距离/耗时 | 是（Web 服务 Key） |

> 申请高德 Key：`console.amap.com` → 应用管理 → 创建应用 → 添加 Key（服务平台选「Web 服务」）。

## 真实里程来源（边的权重）

边的 `distanceKm / durationHours` 优先来自以下真实路网源，缺失才回退 haversine：

| 源 | 常量标识 | 地址 | Key | CORS |
| --- | --- | --- | --- | --- |
| OSRM 公共演示 | `osrmPublic` | `https://router.project-osrm.org/route/v1/driving` | 否 | 开放（`*`） |
| 本地 OSRM | `osrmLocal` | `http://localhost:5000/route/v1/driving`（经 nginx CORS 网关） | 否 | 由 nginx 补 `*` |
| 高德 | `amap` | 高德 Web 服务路径规划 | 是 | 需 JSONP（浏览器跨域） |

> OSRM 公共服务器免 Key、CORS 开放，返回 WGS-84 坐标，与 Carto/OSM 底图天然对齐，**无需 GCJ-02 纠偏**，是默认的轻量真实源（速率受限，适合轻度使用）。

## 坐标系对齐（关键！）

- **Carto / OSM / OSRM 均为 WGS-84**，三者零偏移，节点坐标可直接落在底图上。
- **高德为 GCJ-02（火星坐标）**，与 WGS-84 有偏移。规则：
  - 入库前若坐标是 WGS-84 → 请求高德前需 `wgs84ToGcj02`；
  - 高德返回 GCJ-02 → 入库前需 `gcj02ToWgs84` 纠偏，才能与 OSM 底图对齐。
  - 上述转换在 `src/lib/amap.ts` 已实现，调用高德时必须走此转换。

## 为什么不用「模拟数据」

项目明确禁止任何编造坐标/里程。原因是：

- 直线距离（`haversine`）只是**兜底估算**，用于真实源不可达时，且结果会标记为 `real=false`，不参与「真实路网里程占比」统计；
- 一旦允许随意造假，路径计算结果就失去参考意义，整套系统沦为玩具。

因此你看到界面上的「真实路网里程占比（realRatio）」正是用来提示**这段结论有多少是真实路网支撑的**。

## 地理编码与路径规划的调用方式差异

- **高德 Web 服务**：默认禁止浏览器跨域 `fetch`，一律用 `JSONP`（`jsonp()` 辅助函数，9s 超时）。
- **OSRM**：支持标准 `fetch`，可直接 `osrmMetrics()` / `osrmRoute()`。
- **OSM Nominatim**：标准 `fetch`，但有严格速率限制（真实浏览器可用，沙箱 IP 可能被拒）。

## 本地 OSRM 何时需要

当公共服务器速率受限、或需要离线/可控/全国路网时使用。详见 [本地 OSRM 部署](/guide/local-osrm)。
