import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";

import { FIRES_URL } from "@/src/constant";
import { FirePoint } from "@/src/actions/maker.hook";

export const GET = async (req: NextRequest) => {
  const res = await axios.get(FIRES_URL);
  const text = res.data as string;
  const markers = await new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: FirePoint[] = (results.data as any[]).map((row) => {
          return {
            lat: parseFloat(row.latitude || row.lat),
            lng: parseFloat(row.longitude || row.lon || row.lng),
            raw: row,
          };
        });

        resolve(parsed);
      },
    });
  });

  return NextResponse.json({ data: markers, statusCode: 200 });
};
