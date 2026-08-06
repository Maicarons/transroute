// 真实中国主要城市坐标（WGS84 / EPSG:4326），来源：OpenStreetMap / GeoNames 公开数据。
// 这些是真实地理坐标，并非模拟数据；用于「真实城市库」快速选取。
// 应用运行时还支持通过 OSM(Nominatim) 或 高德 地理编码按名称实时获取任意真实地点坐标。

export interface RealCity {
  name: string;
  lng: number;
  lat: number;
}

export const REAL_CITIES: RealCity[] = [
  { name: "北京", lng: 116.4074, lat: 39.9042 },
  { name: "上海", lng: 121.4737, lat: 31.2304 },
  { name: "广州", lng: 113.2644, lat: 23.1291 },
  { name: "深圳", lng: 114.0579, lat: 22.5431 },
  { name: "成都", lng: 104.0668, lat: 30.5728 },
  { name: "重庆", lng: 106.5516, lat: 29.563 },
  { name: "武汉", lng: 114.3055, lat: 30.5928 },
  { name: "西安", lng: 108.9402, lat: 34.3416 },
  { name: "杭州", lng: 120.1551, lat: 30.2741 },
  { name: "南京", lng: 118.7974, lat: 32.0603 },
  { name: "天津", lng: 117.1902, lat: 39.1256 },
  { name: "苏州", lng: 120.5853, lat: 31.2989 },
  { name: "郑州", lng: 113.6254, lat: 34.7466 },
  { name: "长沙", lng: 112.9388, lat: 28.2282 },
  { name: "沈阳", lng: 123.4315, lat: 41.8057 },
  { name: "青岛", lng: 120.3826, lat: 36.0671 },
  { name: "大连", lng: 121.6186, lat: 38.914 },
  { name: "昆明", lng: 102.8332, lat: 24.8801 },
  { name: "哈尔滨", lng: 126.5349, lat: 45.8038 },
  { name: "济南", lng: 117.0009, lat: 36.6512 },
  { name: "福州", lng: 119.2965, lat: 26.0745 },
  { name: "厦门", lng: 118.0894, lat: 24.4798 },
  { name: "南宁", lng: 108.3669, lat: 22.817 },
  { name: "贵阳", lng: 106.7135, lat: 26.5783 },
  { name: "兰州", lng: 103.8343, lat: 36.0611 },
  { name: "乌鲁木齐", lng: 87.6168, lat: 43.8256 },
  { name: "拉萨", lng: 91.1409, lat: 29.6456 },
  { name: "呼和浩特", lng: 111.7519, lat: 40.8414 },
  { name: "银川", lng: 106.2309, lat: 38.4872 },
  { name: "西宁", lng: 101.7783, lat: 36.6171 },
  { name: "海口", lng: 110.1999, lat: 20.0442 },
  { name: "石家庄", lng: 114.5025, lat: 38.0455 },
  { name: "太原", lng: 112.5492, lat: 37.857 },
  { name: "合肥", lng: 117.2272, lat: 31.8212 },
  { name: "南昌", lng: 115.8581, lat: 28.683 },
  { name: "长春", lng: 125.3245, lat: 43.8171 },
  { name: "宁波", lng: 121.55, lat: 29.875 },
  { name: "无锡", lng: 120.3017, lat: 31.5744 },
  { name: "东莞", lng: 113.7518, lat: 23.0207 },
  { name: "佛山", lng: 113.122, lat: 23.021 },
];
