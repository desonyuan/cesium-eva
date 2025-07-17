import axios from "axios";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";

import { PYRECAST_BASE_URL } from "@/src/constant";

export const GET = async (req: NextRequest) => {
  const query = new URL(req.nextUrl);
  const targetUrl = query.searchParams.get("target") || "";
  const url = PYRECAST_BASE_URL + targetUrl;

  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const links = $("td a")
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter((href) => href && href !== "../");

  const isLevel1 = targetUrl.split("/").length === 2;

  const result = links
    .map((link) => {
      const isDir = link.endsWith("/");
      const isTif = link.endsWith(".tif");

      if (isDir) {
        let label = link.slice(0, -1);
        const isNumber = Number.isFinite(Number(label));

        if (isNumber) {
          const num = Number(label);

          switch (num) {
            case 10:
              label = "Smallest (10th percentile)";
              break;
            case 30:
              label = "Smaller (30th percentile)";
              break;
            case 50:
              label = "Median (50th percentile)";
              break;
            case 70:
              label = "Larger (70th percentile)";
              break;
            case 90:
              label = "Largest (90th percentile)";
              break;
            default:
              break;
          }
        }

        return {
          value: isLevel1 ? `${link}elmfire/landfire/` : link,
          label,
          isLeaf: false,
        };
      } else {
        if (isTif) {
          return {
            value: link,
            label: link.slice(0, -4),
            isLeaf: true,
          };
        }
      }
    })
    .filter((item) => item !== undefined);

  return NextResponse.json({
    data: result,
    statusCode: 200,
  });
};
