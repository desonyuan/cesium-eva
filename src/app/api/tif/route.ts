import { NextResponse } from "next/server";

import { convertTiffToPng } from "@/src/utils/tif2png";
import { PYRECAST_BASE_URL } from "@/src/constant";

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const tifUrl = searchParams.get("url");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!tifUrl) {
    return new Response("Missing URL", { status: 400 });
  }
  const url = PYRECAST_BASE_URL + tifUrl;

  const response = await fetch(url);

  const arrayBuffer = await response.arrayBuffer();

  console.log("下载成功");
  const converRes = await convertTiffToPng(arrayBuffer, parseFloat(lat!), parseFloat(lng!));

  return NextResponse.json({
    statusCode: 200,
    data: {
      data: `data:image/png;base64,${converRes.buffer.toString("base64")}`,
      bbox: converRes.rectangle,
      width: converRes.width,
      height: converRes.height,
    },
  });
};
