/**
 * 单景点 SEO 实体绑定配置
 * ---------------------------------------------------------------
 * 全站唯一的“地理实体”数据源，供 JSON-LD、TDK、OG、地图嵌入、
 * NAP（名称 / 地址 / 电话）与权威外链统一调用，确保站点与
 * Google 地图 / 知识图谱中的实体信息完全一致。
 *
 * 更换景点时，只需修改此文件中的变量即可。
 */
export const attraction = {
  // ── 域名与实体标识 ──────────────────────────────────────────
  domain: 'shirakawapark.com',
  baseUrl: 'https://shirakawapark.com',

  // ── 名称 ───────────────────────────────────────────────────
  // 景点官方全称（用于 <h1>、页脚、结构化数据）
  fullName: 'Shirakawa Park',
  // 域名字面对应的常用俗称
  shortName: 'Shirakawa Park',

  // ── 行政区划 ───────────────────────────────────────────────
  city: 'Nagoya',
  province: 'Aichi',
  provinceCode: 'JP-23',
  country: 'Japan',
  countryCode: 'JP',
  postalCode: '460-0008',
  streetAddress: '2 Chome-17 Sakae, Naka Ward',

  // ── 地理坐标（与下方 Google 地图嵌入保持一致）──────────────
  latitude: 35.164063,
  longitude: 136.8997,

  // ── 联系方式 ───────────────────────────────────────────────
  telephone: '+81-52-261-6641',
  telephoneDisplay: '+81 52-261-6641',

  // ── 地图 ───────────────────────────────────────────────────
  mapsShareUrl: 'https://maps.app.goo.gl/7B4tpRmrTBHFkHQf8',
  mapsEmbedSrc:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5797.16488260343!2d136.89969980000004!3d35.164063!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6003772dac5cf8c3%3A0xa1b35ac6fa7d74c4!2sShirakawa%20Park!5e1!3m2!1szh-CN!2sus!4v1789097946231!5m2!1szh-CN!2sus',

  // ── 权威 .gov / .org 外链（当地政府 / 官方旅游局）──────────
  govTourismUrl: 'https://www.nagoya-info.jp/',
  govtCityUrl: 'https://www.city.nagoya.jp/',

  // ── 周边核心地标 ───────────────────────────────────────────
  nearbyLandmarks: ['Nagoya City Science Museum', 'Nagoya City Art Museum'],

  // ── 图片资源 ───────────────────────────────────────────────
  // 命名规范：shirakawa-park-<序号>.jpg / .webp，主视觉为 shirakawa-park-hero
  // 由 `npm run images:optimize` 从母版 assets/originals/gallery 统一生成
  galleryDir: '/gallery',
  galleryPrefix: '/gallery/shirakawa-park-',
  galleryCount: 24,
  heroImage: '/gallery/shirakawa-park-hero.jpg',
  heroImageWebp: '/gallery/shirakawa-park-hero.webp',
  heroImageWidth: 1600,
  heroImageHeight: 900,
  images: [1, 2, 3, 4, 5, 6],

  // ── 天气模块（用于构建期获取与前端刷新）─────────────────────
  timezone: 'Asia/Tokyo',
  localeTimeZone: 'Asia/Tokyo',

  // ── 评分（与 Google 地图资料一致）──────────────────────────
  ratingValue: 4.0,
  reviewCount: 7032,
  priceRange: 'Free',
};

export default attraction;
