# 本地 OSRM 部署

默认真实里程来自 **OSRM 公共演示服务器**（免 Key、CORS 开放，但速率受限）。当你需要**离线、可控、无速率限制、或全国路网**时，可在本地自部署 OSRM。

整套方案由三个文件组成（均在仓库根目录）：

- `docker-compose.yml` —— 路由服务 + CORS 网关
- `nginx-osrm.conf` —— 为 `osrm-routed` 补 CORS 头
- `scripts/setup-osrm.sh` —— 下载并构建路网数据（一次性）

## 前置条件

- 已安装并启动 **Docker Desktop**（Windows 上需先打开 Docker Desktop GUI）。
- 能访问 Geofabrik 下载 OSM 数据（`download.geofabrik.de`）。

## 步骤一：准备路网数据

```bash
# 广东省（默认，约几百 MB，内存友好）
./scripts/setup-osrm.sh guangdong

# 也可换其他省份或全国：
./scripts/setup-osrm.sh beijing     # 北京市
./scripts/setup-osrm.sh china       # 全国（约 1.5GB，extract 需 ~8GB 内存）
```

脚本会：

1. 从 Geofabrik 下载 `<region>-latest.osm.pbf`（已存在则跳过）；
2. 用 `osrm-backend` 镜像依次执行 `osrm-extract` → `osrm-partition` → `osrm-customize`（MLD 算法）；
3. 产物落在 `./osrm-data/<region>-latest.osrm`。

## 步骤二：启动服务

```bash
docker compose up -d
```

启动两个容器：

| 容器 | 镜像 | 作用 | 端口 |
| --- | --- | --- | --- |
| `transroute-osrm` | `ghcr.io/project-osrm/osrm-backend` | `osrm-routed` 路由服务 | 仅 compose 内网 `:5000`（不直接对宿主开放） |
| `transroute-osrm-cors` | `nginx:alpine` | 反向代理 + 补 CORS 头 | 宿主 `:5000` |

## 为什么需要 nginx CORS 网关

`osrm-routed` 默认**不发送 CORS 头**，浏览器跨端口访问（dev server `:5173` → `:5000`）会被拦截。本 nginx 在容器网络内代理 `osrm:5000`，并补 `Access-Control-Allow-Origin: *`，使前端可跨源访问 `http://localhost:5000`。

```nginx
location / {
    add_header 'Access-Control-Allow-Origin' '*' always;
    # ... 预检 OPTIONS 处理
    proxy_pass http://osrm:5000;
}
```

> 因为 CORS 由 nginx 解决，前端直接访问 `http://localhost:5000`，**Vite 配置无需代理**（见 `vite.config.ts` 说明）。

## 步骤三：前端切换数据源

在应用的「真实道路」卡片选择 **OSRM·本地**（`routeSource: "osrmLocal"`），即可使用本地路由。无需任何额外前端配置。

代码层面，`src/lib/osrm.ts` 中：

```ts
export const OSRM_LOCAL_BASE = "http://localhost:5000/route/v1/driving";
```

`osrmMetrics()` / `osrmRoute()` 通过 `opts.baseUrl` 切换公共/本地源。

## 数据规模与资源参考

| 区域 | pbf 大小 | 内存需求 |
| --- | --- | --- |
| 省份（如 guangdong） | 约 162 MB | 约 3 GB |
| 全国（china） | 约 1.5 GB | 约 8 GB |

## 停止与清理

```bash
docker compose down          # 停止容器（保留 ./osrm-data 路网）
# 如需释放磁盘：rm -rf ./osrm-data
```

## 故障排查

- **`docker compose up` 报错找不到 `.osrm`**：忘记先跑 `setup-osrm.sh`，或 region 名不一致（`OSRM_REGION` 默认 `guangdong`）。
- **前端仍报 CORS**：确认 `transroute-osrm-cors` 容器已起且宿主 `:5000` 可访问；`curl http://localhost:5000/route/v1/driving/116.4,39.9;121.47,31.23?overview=false` 应返回 JSON。
- **全国路网构建慢/OOM**：extract 阶段内存不足，建议在内存 ≥ 8GB 的机器上构建，或先用省份数据。
