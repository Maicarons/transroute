#!/usr/bin/env bash
# 下载并构建本地 OSRM 路网数据（一次性，首次较慢）。
#
# 用法：
#   ./scripts/setup-osrm.sh guangdong      # 广东省（默认，约几百 MB，内存友好）
#   ./scripts/setup-osrm.sh beijing        # 北京市
#   ./scripts/setup-osrm.sh china          # 全国（约 1.5GB，extract 需 ~8GB 内存）
#
# 完成后运行：docker compose up -d   启动路由服务（localhost:5000）
set -euo pipefail

REGION="${1:-guangdong}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$REPO_ROOT/osrm-data"
mkdir -p "$DATA_DIR"

# Geofabrik 数据源：全国在 asia/ 下，省份在 asia/china/ 下
if [ "$REGION" = "china" ]; then
  PBF_URL="https://download.geofabrik.de/asia/china-latest.osm.pbf"
else
  PBF_URL="https://download.geofabrik.de/asia/china/${REGION}-latest.osm.pbf"
fi
PBF="$DATA_DIR/${REGION}-latest.osm.pbf"
OSRM_IMAGE="ghcr.io/project-osrm/osrm-backend:latest"

# 1) 下载 pbf（已存在则跳过）
if [ ! -f "$PBF" ]; then
  echo "==> 下载 OSM 数据: $REGION ($PBF_URL)"
  curl -fL "$PBF_URL" -o "$PBF"
else
  echo "==> 已存在 $PBF，跳过下载"
fi

# 2) extract + partition + customize（MLD 算法）
echo "==> 构建路由数据（首次较慢，取决于数据大小与机器性能）"
docker run --rm -v "$DATA_DIR:/data" "$OSRM_IMAGE" \
  osrm-extract -p /opt/car.lua "/data/${REGION}-latest.osm.pbf"
docker run --rm -v "$DATA_DIR:/data" "$OSRM_IMAGE" \
  osrm-partition "/data/${REGION}-latest.osrm"
docker run --rm -v "$DATA_DIR:/data" "$OSRM_IMAGE" \
  osrm-customize "/data/${REGION}-latest.osrm"

echo "==> 完成。现在运行: docker compose up -d"
echo "    然后在「真实道路」卡片选择「OSRM·本地」即可使用本地路由。"
