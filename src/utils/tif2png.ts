import { fromArrayBuffer } from "geotiff";
import sharp from "sharp";

export async function convertTiffToPng(buf: ArrayBuffer, centerLat: number, centerLng: number) {
  const tiff = await fromArrayBuffer(buf);
  const image = await tiff.getImage();
  const [pixelWidth, pixelHeight] = image.getResolution();
  const width = image.getWidth();
  const height = image.getHeight();

  // 计算总米数
  const totalWidthMeters = width * Math.abs(pixelWidth);
  const totalHeightMeters = height * Math.abs(pixelHeight);

  // 米转度
  const latSpan = totalHeightMeters / 111000;
  const lngSpan = totalWidthMeters / (111000 * Math.cos((centerLat * Math.PI) / 180));

  // 计算边界
  const rectangle = {
    north: centerLat + latSpan / 2,
    south: centerLat - latSpan / 2,
    east: centerLng + lngSpan / 2,
    west: centerLng - lngSpan / 2,
  };

  console.log("转换后 WGS84 Bounds:", rectangle);

  const raster = (await image.readRasters({ interleave: true })) as any as number[];

  const rawData = raster; // 单通道灰度图

  // 创建 RGBA 图像 Buffer
  const rgbaBuffer = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const value = rawData[i];

    // 设置 RGB
    rgbaBuffer[i * 4] = value; // R
    rgbaBuffer[i * 4 + 1] = value; // G
    rgbaBuffer[i * 4 + 2] = value; // B

    // 如果是黑色或白色，alpha = 0；其他 alpha = 255
    if (value === 0 || value === 255) {
      rgbaBuffer[i * 4 + 3] = 0;
    } else {
      rgbaBuffer[i * 4 + 3] = 255;
    }
  }

  // 保存为 PNG
  const buffer = await sharp(rgbaBuffer, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  console.log("✅ 转换完成：");

  return {
    rectangle,
    buffer,
    width,
    height,
  };
}
