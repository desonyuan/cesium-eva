import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface CustomFireFeature {
  type: "Feature";
  properties: {
    OBJECTID: number;
    type: string;
    Shape__Area: number;
    Shape__Length: number;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface CustomFirePoint {
  id: number;
  lat: number;
  lng: number;
  properties: {
    OBJECTID: number;
    type: string;
    Shape__Area: number;
    Shape__Length: number;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export const GET = async () => {
  try {
    // 读取fire_combined.geojson文件
    const filePath = path.join(process.cwd(), "src", "script", "squa", "outputs", "fire_combined.geojson");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const geoJsonData = JSON.parse(fileContent);

    // 转换为自定义火点格式
    const customFirePoints: CustomFirePoint[] = geoJsonData.features.map((feature: CustomFireFeature) => {
      // 计算多边形的中心点作为标记位置
      const coordinates = feature.geometry.coordinates[0];
      const centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
      const centerLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;

      return {
        id: feature.properties.OBJECTID,
        lat: centerLat,
        lng: centerLng,
        properties: feature.properties,
        geometry: feature.geometry,
      };
    });

    return NextResponse.json({ 
      data: customFirePoints, 
      statusCode: 200 
    });
  } catch (error) {
    console.error("Error reading custom fires:", error);
    return NextResponse.json({ 
      error: "Failed to load custom fires", 
      statusCode: 500 
    }, { status: 500 });
  }
};
