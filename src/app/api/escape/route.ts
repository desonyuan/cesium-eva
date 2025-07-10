import { exec } from "child_process";
import { join } from "path";

import { NextResponse } from "next/server";

import { SCRIPT_PATH } from "@/src/constant";

export const POST = async (req: Request) => {
  const { latitude, longitude } = await req.json();

  const geojson = await new Promise<string>((resolve, reject) => {
    exec(`python ${join(SCRIPT_PATH, "evac_sim.py")} ${longitude} ${latitude} --json`, (error, stdout) => {
      if (error) {
        reject(new Response("Internal Server Error", { status: 500 }));
      }
      resolve(stdout);
    });
  });

  return NextResponse.json({
    data: JSON.parse(geojson),
    statusCode: 200,
  });
};
