
import { fromUrl,fromArrayBuffer } from 'geotiff';
import proj4 from 'proj4';
import sharp from 'sharp';

export async function convertTiffToPng(buf: ArrayBuffer) {
  const tiff = await fromArrayBuffer(buf);
  const image = await tiff.getImage();
  const bbox = image.getBoundingBox();
  // 获取影像数据
  const width = image.getWidth();
  const height = image.getHeight();
  // 获取空间信息
  const tiepoint = image.getTiePoints()[0];
  const scale = image.getFileDirectory().ModelPixelScale;

  const originX = tiepoint.x;
  const originY = tiepoint.y;
  const scaleX = scale[0];
  const scaleY = scale[1];

  const minX = originX;
  const maxY = originY;
  const maxX = originX + width * scaleX;
  const minY = originY - height * scaleY;

  const EPSG = `EPSG:${image.getGeoKeys().ProjectedCSTypeGeoKey}`;
  console.log(`📌 投影信息: ${EPSG}`);

  // 投影转换 EPSG:32612 → EPSG:4326
  proj4.defs(EPSG, '+proj=utm +zone=12 +datum=WGS84 +units=m +no_defs');

  const toWgs84 = proj4(EPSG, 'EPSG:4326');
  const [west, south] = toWgs84.forward([minX, minY]);
  const [east, north] = toWgs84.forward([maxX, maxY]);

  console.log(`📌 地理边界: [${west.toFixed(6)}, ${south.toFixed(6)}] → [${east.toFixed(6)}, ${north.toFixed(6)}]`);

  const values = (await image.readRasters({ interleave: true })) as any as number[]; // 单波段 float32
  // 归一化像素值到 [0,255]
  let min = Infinity, max = -Infinity;
  for (const v of values) {
    if (v === 0 || isNaN(v)) continue;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }

  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const norm = Math.max(0, Math.min((v - min) / (max - min), 1));
    const gray = Math.round(norm * 255);
    pixels[i * 3 + 0] = gray;
    pixels[i * 3 + 1] = gray;
    pixels[i * 3 + 2] = gray;
  }
  const rectangle = { west, south, east, north };

  const buffer = await sharp(buf, {
    // raw: {
    //   width,
    //   height,
    //   channels: 3
    // }
  })
    .png()
    .toBuffer();

  console.log('✅ 转换完成：');
  return {
    rectangle,
    buffer,
    width,
    height
  }
}
