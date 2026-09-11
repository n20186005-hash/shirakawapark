/**
 * 图片资产处理流水线
 * ---------------------------------------------------------------
 * 目录约定
 *   母版（不进仓库、不部署）：assets/originals/gallery/shirakawapark-<n>.jpg
 *   产物（部署）：            public/gallery/shirakawa-park-<n>.jpg / .webp
 *                             public/gallery/shirakawa-park-hero.jpg / .webp
 *
 * 命名规范：shirakawa-park-<序号>，主视觉固定为 shirakawa-park-hero。
 *
 * 用法：npm run images:optimize
 *
 * 首次运行会自动把 public/gallery 下的历史文件迁移到母版目录，
 * 之后每次运行都从母版重新生成产物，可安全重复执行。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const MASTERS_DIR = path.join(ROOT, 'assets', 'originals', 'gallery');
const OUT_DIR = path.join(ROOT, 'public', 'gallery');

const MASTER_PREFIX = 'shirakawapark-';
const TARGET_PREFIX = 'shirakawa-park-';

// 画廊图：网格单元最大约 370 CSS px，最长边 1200px 足以覆盖高 DPR 屏，
// 同时限制横幅与竖幅，避免竖幅照片产生多余像素。
const GALLERY_MAX_SIDE = 1200;
const GALLERY_JPEG = { quality: 80, progressive: true, mozjpeg: true };
const GALLERY_WEBP = { quality: 74, effort: 5 };

// 首页主视觉：固定 16:9，便于在 og:image 中声明尺寸
const HERO_WIDTH = 1600;
const HERO_HEIGHT = 900;
const HERO_JPEG = { quality: 78, progressive: true, mozjpeg: true };
const HERO_WEBP = { quality: 70, effort: 5 };

const ALL_INDEXES = Array.from({ length: 24 }, (_, i) => i + 1);
const HERO_SOURCE_INDEX = 1;

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/** 把历史原图从 public/ 迁移到母版目录，避免把数十 MB 原图部署上线 */
async function migrateMasters() {
  if (!(await exists(OUT_DIR))) return 0;
  const entries = await fs.readdir(OUT_DIR);
  const legacy = entries.filter(
    (f) => f.startsWith(MASTER_PREFIX) && f.toLowerCase().endsWith('.jpg')
  );
  if (legacy.length === 0) return 0;

  await fs.mkdir(MASTERS_DIR, { recursive: true });
  for (const file of legacy) {
    const from = path.join(OUT_DIR, file);
    const to = path.join(MASTERS_DIR, file);
    if (await exists(to)) continue;
    await fs.rename(from, to);
  }
  return legacy.length;
}

async function masterFor(index) {
  const master = path.join(MASTERS_DIR, `${MASTER_PREFIX}${index}.jpg`);
  return (await exists(master)) ? master : null;
}

async function main() {
  const migrated = await migrateMasters();
  if (migrated > 0) {
    console.log(`已迁移 ${migrated} 张原图到 assets/originals/gallery（母版目录，不部署）\n`);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const report = [];
  let heroMeta = null;
  let masterTotal = 0;

  for (const index of ALL_INDEXES) {
    const master = await masterFor(index);
    if (!master) {
      report.push({ index, status: 'skipped' });
      continue;
    }

    masterTotal += (await fs.stat(master)).size;
    const meta = await sharp(master, { failOn: 'none' }).metadata();

    // 每次从母版重新编码，保证结果确定；fit:inside 保证长边不超过上限且不变形
    const encode = () =>
      sharp(master, { failOn: 'none' })
        .rotate()
        .resize({
          width: GALLERY_MAX_SIDE,
          height: GALLERY_MAX_SIDE,
          fit: 'inside',
          withoutEnlargement: true,
        });

    const jpgOut = path.join(OUT_DIR, `${TARGET_PREFIX}${index}.jpg`);
    const webpOut = path.join(OUT_DIR, `${TARGET_PREFIX}${index}.webp`);

    await encode().jpeg(GALLERY_JPEG).toFile(jpgOut);
    await encode().webp(GALLERY_WEBP).toFile(webpOut);

    if (index === HERO_SOURCE_INDEX) {
      const heroJpg = path.join(OUT_DIR, `${TARGET_PREFIX}hero.jpg`);
      const heroWebp = path.join(OUT_DIR, `${TARGET_PREFIX}hero.webp`);
      const crop = () =>
        sharp(master, { failOn: 'none' })
          .rotate()
          .resize({ width: HERO_WIDTH, height: HERO_HEIGHT, fit: 'cover', position: 'centre' });
      await crop().jpeg(HERO_JPEG).toFile(heroJpg);
      await crop().webp(HERO_WEBP).toFile(heroWebp);
      heroMeta = {
        jpg: (await fs.stat(heroJpg)).size,
        webp: (await fs.stat(heroWebp)).size,
      };
    }

    report.push({
      index,
      status: 'ok',
      src: `${meta.width}x${meta.height}`,
      jpg: (await fs.stat(jpgOut)).size,
      webp: (await fs.stat(webpOut)).size,
    });
  }

  const outTotal = (
    await Promise.all(
      (
        await fs.readdir(OUT_DIR)
      )
        .filter((f) => f.startsWith(TARGET_PREFIX))
        .map(async (f) => (await fs.stat(path.join(OUT_DIR, f))).size)
    )
  ).reduce((a, b) => a + b, 0);

  console.log('处理结果：');
  for (const row of report) {
    console.log(
      row.status === 'ok'
        ? `  ${TARGET_PREFIX}${row.index}  源 ${row.src} → JPG ${kb(row.jpg)} / WebP ${kb(row.webp)}`
        : `  ${TARGET_PREFIX}${row.index}  跳过（缺少母版）`
    );
  }
  if (heroMeta) {
    console.log(
      `  ${TARGET_PREFIX}hero  ${HERO_WIDTH}x${HERO_HEIGHT} → JPG ${kb(heroMeta.jpg)} / WebP ${kb(heroMeta.webp)}`
    );
  }
  if (masterTotal > 0) {
    console.log(
      `\n画廊母版合计 ${(masterTotal / 1024 / 1024).toFixed(1)} MB → 上线产物合计 ${(outTotal / 1024 / 1024).toFixed(1)} MB`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
