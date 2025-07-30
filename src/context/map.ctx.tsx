"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, InfoWindow, LoadScript, Marker, GroundOverlay, Polyline, Polygon } from "@react-google-maps/api";

import { Button, Popconfirm, Table } from "antd";
import { useBoolean } from "ahooks";
import { Actions } from "ahooks/lib/useBoolean";
import dayjs from "dayjs";

import { CustomFirePoint, useCustomFires } from "../actions/custom-fires.hook";
import { ShelterData, useShelters } from "../actions/shelters.hook";

import { createRoot } from "react-dom/client";

import { FirePoint, IRoadClosure, useClosureMarkers, useMapMarkers, useReportMarkers } from "../actions/maker.hook";
import { OverlayData } from "../components/sidebar/Left";
type Point = { lat: number; lng: number };

export interface IRoutePath {
  route: number[][];
  cost_s: number;
  n_points: number;
  start: number[];
  destination: number[];
}

type MapData = {
  loaded: boolean;
  setCenter: (center: Point) => void;
  currentMarker: FirePoint | null;
  setCurrentMarker: (marker: FirePoint | null) => void;

  currentCustomFire: CustomFirePoint | null;
  setCurrentCustomFire: (fire: CustomFirePoint | null) => void;
  currentShelter: ShelterData | null;
  setCurrentShelter: (shelter: ShelterData | null) => void;
  showShelters: boolean;
  setShowShelters: (show: boolean) => void;
  refreshShelters: () => void;
  map: google.maps.Map;
  setOverlayData: (data: OverlayData | null) => void;
  closureMode: boolean;
  setClosureMode: Actions;
  route: IRoutePath | null;
  setRoute: (route: IRoutePath | null) => void;
  setTifUrl: (url: string | null) => void;
};
const containerStyle = {
  width: "100%",
  height: "100%",
};

const MapContext = createContext<MapData | null>(null);

export const MapProvider = ({ children }: { children: React.ReactNode }) => {
  const [center, setCenter] = useState({ lat: 47.6062, lng: -122.3321 }); // 美国西雅图坐标
  const { markers } = useMapMarkers();
  const { reportMarkers, delReport } = useReportMarkers();
  const [currentMarker, setCurrentMarker] = useState<FirePoint | null>(null);
  const [tifUrl, setTifUrl] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setLoaded] = useBoolean();
  const [overlayData, setOverlayData] = useState<OverlayData | null>(null);
  const [closureMode, setClosureMode] = useBoolean();
  const { createClosure, closureData, createLoading, delClosure } = useClosureMarkers();
  const [currentClosure, setCurrentClosure] = useState<IRoadClosure | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [route, setRouteState] = useState<IRoutePath | null>(null);
  const { customFires } = useCustomFires();
  const { shelters, refresh: refreshShelters } = useShelters();
  const [currentCustomFire, setCurrentCustomFire] = useState<CustomFirePoint | null>(null);
  const [currentShelter, setCurrentShelter] = useState<ShelterData | null>(null);
  const [showShelters, setShowShelters] = useState<boolean>(false);

  let overlayWindow: google.maps.InfoWindow;

  const excludedKeys = ["xlo", "xhi", "ylo", "yhi", "irwinid", "htb"];

  const getUnit = (tifUrl: string) => {
    if (tifUrl.indexOf("flame-length") > -1) {
      return "ft";
    } else if (tifUrl.indexOf("hours-since-burned") > -1) {
      return "hours";
    } else if (tifUrl.indexOf("spread-rate") > -1) {
      return "ft/min";
    } else {
      return "s";
    }
  };
  // 添加一个强制清除标志
  const [forceClear, setForceClear] = useState(false);

  // 自定义setRoute函数，处理强制清除
  const setRoute = useCallback((newRoute: IRoutePath | null) => {
    if (newRoute === null) {
      // 清除路径时，先设置强制清除标志
      setForceClear(true);
      setTimeout(() => {
        setRouteState(null);
        setForceClear(false);
      }, 100);
    } else {
      setRouteState(newRoute);
    }
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    // This is just an example of getting and using the map instance!!! don't just blindly copy!
    // const bounds = new window.google.maps.LatLngBounds(center);
    // map.fitBounds(bounds);
    setMap(map);
    map.data.loadGeoJson("/res/CalFire_Perimeters_(NIFC_FIRIS)_Public_View_-.geojson");
    setLoaded.setTrue();
  }, []);

  const canvasSize = useMemo(() => {
    if (overlayData) {
      const { width, height } = overlayData;

      return { width, height };
    }

    return { width: 0, height: 0 };
  }, [overlayData]);

  const Info = useMemo(() => {
    if (!currentMarker) {
      return null;
    }

    const { raw, lng, lat } = currentMarker!;
    const data = Object.entries(raw)
      .map(([key, value]) => {
        if (excludedKeys.includes(key)) {
          return null;
        }

        return { key, value };
      })
      .filter(Boolean);

    return (
      <InfoWindow
        options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
        position={{ lat, lng }}
        onCloseClick={() => {
          setCurrentMarker(null);
        }}
      >
        <Table
          bordered
          className="w-[400px]"
          columns={[
            { title: "", dataIndex: "key", key: "key", colSpan: 0, className: "p-2! h-10!" },
            { title: "", dataIndex: "value", key: "value", colSpan: 0, className: "p-2! h-10!" },
          ]}
          dataSource={data}
        />
      </InfoWindow>
    );
  }, [currentMarker]);

  const CustomFireInfo = useMemo(() => {
    if (!currentCustomFire) {
      return null;
    }

    const { lat, lng, properties } = currentCustomFire;
    const data: { key: string; value: string }[] = [];

    data.push({ key: "Object ID", value: properties.OBJECTID.toString() });
    data.push({ key: "Type", value: properties.type });
    data.push({ key: "Area", value: `${properties.Shape__Area.toFixed(2)} sq units` });
    data.push({ key: "Perimeter", value: `${properties.Shape__Length.toFixed(2)} units` });
    data.push({ key: "Location", value: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });

    return (
      <InfoWindow
        options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
        position={{ lat, lng }}
        onCloseClick={() => {
          setCurrentCustomFire(null);
        }}
      >
        <div className="w-[300px] bg-white bg-opacity-85 backdrop-blur-md rounded-lg p-4 shadow-xl border border-white border-opacity-30">
          <h3 className="text-lg font-bold mb-3 text-red-600 drop-shadow-sm">🔥 Fire Perimeter</h3>
          <div className="bg-white bg-opacity-40 rounded-md p-2">
            <Table
              bordered
              size="small"
              columns={[
                { title: "Property", dataIndex: "key", key: "key", width: "40%" },
                { title: "Value", dataIndex: "value", key: "value", width: "60%" },
              ]}
              dataSource={data}
              pagination={false}
              className="transparent-table"
            />
          </div>
        </div>
      </InfoWindow>
    );
  }, [currentCustomFire]);

  const ShelterInfo = useMemo(() => {
    if (!currentShelter) {
      return null;
    }

    const { lat, lng, shelterId, capacity, region } = currentShelter;
    const data: { key: string; value: string }[] = [];

    data.push({ key: "Shelter ID", value: shelterId });
    data.push({ key: "Region", value: region.toUpperCase() });
    data.push({ key: "Capacity", value: `${capacity} people` });
    data.push({ key: "Location", value: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });

    return (
      <InfoWindow
        options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
        position={{ lat, lng }}
        onCloseClick={() => {
          setCurrentShelter(null);
        }}
      >
        <div className="w-[300px]">
          <h3 className="text-lg font-bold mb-2 text-blue-600">🏠 Emergency Shelter</h3>
          <Table
            bordered
            size="small"
            columns={[
              { title: "Property", dataIndex: "key", key: "key", width: "40%" },
              { title: "Value", dataIndex: "value", key: "value", width: "60%" },
            ]}
            dataSource={data}
            pagination={false}
          />
        </div>
      </InfoWindow>
    );
  }, [currentShelter]);

  const ClosureInfo = useMemo(() => {
    if (!currentClosure) {
      return null;
    }

    const { lng, lat } = currentClosure!;
    const data: { key: string; value: string }[] = [];

    data.push({ key: "Location", value: `${lat}, ${lng}` });
    data.push({ key: "Created At", value: dayjs(currentClosure.createdAt).format("YYYY-MM-DD HH:mm:ss") });
    data.push({ key: "User", value: currentClosure.User.username });

    return (
      <InfoWindow
        options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
        position={{ lat, lng }}
        onCloseClick={() => {
          setCurrentClosure(null);
        }}
      >
        <div className="flex flex-col gap-y-5">
          <Table
            bordered
            className="w-[400px]"
            columns={[
              { title: "", dataIndex: "key", key: "key", colSpan: 0, className: "p-2! h-10!" },
              { title: "", dataIndex: "value", key: "value", colSpan: 0, className: "p-2! h-10!" },
            ]}
            dataSource={data}
            pagination={false}
          />
          <div className="flex items-center justify-end">
            <Popconfirm
              cancelText="No"
              description="Are you sure to delete this?"
              okText="Yes"
              title="Delete"
              // onCancel={cancel}
              onConfirm={() => {
                delClosure(currentClosure.id).then(() => {
                  setCurrentClosure(null);
                });
              }}
            >
              <Button danger>Delete</Button>
            </Popconfirm>
          </div>
        </div>
      </InfoWindow>
    );
  }, [currentClosure]);
  // 路径版本计数器，用于强制重新渲染
  const [routeVersion, setRouteVersion] = useState(0);
  // 存储当前的polyline实例
  const [polylineInstance, setPolylineInstance] = useState<google.maps.Polyline | null>(null);

  const routeComponents = useMemo(() => {
    // 如果强制清除或没有路径，返回null确保组件被完全移除
    if (forceClear || !route) {
      return null;
    }

    const path = route.route.map(([lat, lng]) => ({ lat, lng }));
    const startPoint = { lat: route.start[0], lng: route.start[1] };

    return (
      <>
        {/* 路径线 */}
        <Polyline
          key={`route-${routeVersion}`}
          options={{
            strokeColor: "#FF0000",
            strokeWeight: 3,
            strokeOpacity: 0.9,
            zIndex: 1000,
          }}
          path={path}
          onLoad={(polyline) => {
            setPolylineInstance(polyline);
          }}
          onUnmount={() => {
            setPolylineInstance(null);
          }}
        />
        {/* 起点用户标记 */}
        <Marker
          key={`start-point-${routeVersion}`}
          icon={{ url: "/user.png", scaledSize: new window.google.maps.Size(42, 42) }}
          position={startPoint}
          title="Start Point"
          zIndex={1001}
        />
      </>
    );
  }, [route, routeVersion, forceClear]);
  const overlay = useMemo(() => {
    if (overlayData) {
      const bounds = overlayData.bbox;

      return (
        <GroundOverlay
          bounds={bounds}
          url={overlayData.data}
          onClick={(e) => {
            const lat = e.latLng!.lat();
            const lng = e.latLng!.lng();
            const img = document.createElement("img");

            img.src = overlayData.data;
            img.onload = () => {
              const canvas = canvasRef.current!;
              const { width, height } = img;

              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext("2d")!;

              ctx.clearRect(0, 0, width, height);

              ctx.drawImage(img, 0, 0);
              const x = Math.floor(((lng - bounds.west) / (bounds.east - bounds.west)) * canvas.width);
              const y = Math.floor(((bounds.north - lat) / (bounds.north - bounds.south)) * canvas.height);

              const pixel = ctx.getImageData(x, y, 1, 1).data;
              const [r, g, b, a] = pixel;

              if (r != 0 || g != 0 || b != 0 || a != 0) {
                // 计算原始值（反向映射）
                const minValue = overlayData.min; // 来自 jsonData
                const maxValue = overlayData.max; // 来自 jsonData
                const t = r / 255;
                const originalValue = maxValue - t * (maxValue - minValue);

                if (!overlayWindow) {
                  overlayWindow = new google.maps.InfoWindow();
                }
                const unit = getUnit(tifUrl!);

                overlayWindow.setPosition({ lat, lng });
                overlayWindow.setContent(`${originalValue.toFixed(2)} ${unit}`);
                overlayWindow.open({
                  map,
                });
                // console.log(`估算原始值（火点强度）：${originalValue.toFixed(2)}`);
              }
            };
          }}
        />
      );
    }

    return null;
  }, [overlayData, map, tifUrl]);

  const polyline = useMemo(() => {
    if (!route) {
      return null;
    }

    const path = route.route.map(([lat, lng]) => ({ lat, lng }));
    const startPoint = { lat: route.start[0], lng: route.start[1] };

    return (
      <>
        {/* 路径线 */}
        <Polyline
          key={`route-${routeVersion}`}
          options={{
            strokeColor: "#FF0000",
            strokeWeight: 3,
            strokeOpacity: 0.9,
            zIndex: 1000,
          }}
          path={path}
          onLoad={(polyline) => {
            setPolylineInstance(polyline);
          }}
          onUnmount={() => {
            setPolylineInstance(null);
          }}
        />
        {/* 起点用户标记 */}
        <Marker
          key={`start-point-${routeVersion}`}
          icon={{ url: "/user.png", scaledSize: new window.google.maps.Size(42, 42) }}
          position={startPoint}
          title="Start Point"
          zIndex={1001}
        />
      </>
    );
  }, [route, routeVersion, forceClear]);

  // 自定义火点多边形
  const customFirePolygon = useMemo(() => {
    if (!currentCustomFire) {
      return null;
    }

    const coordinates = currentCustomFire.geometry.coordinates[0];
    const path = coordinates.map(([lng, lat]) => ({ lat, lng }));

    return (
      <Polygon
        key={`custom-fire-${currentCustomFire.id}`}
        options={{
          fillColor: "#FF6600",
          fillOpacity: 0.3,
          strokeColor: "#FF6600",
          strokeWeight: 2,
          strokeOpacity: 0.8,
        }}
        paths={path}
      />
    );
  }, [currentCustomFire]);

  // 当route改变时，更新版本号
  useEffect(() => {
    setRouteVersion((prev) => prev + 1);
  }, [route]);

  // 当强制清除时，直接操作Google Maps API
  useEffect(() => {
    if (forceClear && polylineInstance) {
      polylineInstance.setMap(null);
      setPolylineInstance(null);
    }
  }, [forceClear, polylineInstance]);

  // 适应覆盖区域
  useEffect(() => {
    if (map && overlayData) {
      // 4. 调整视角到覆盖区域
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(overlayData.bbox.south, overlayData.bbox.west),
        new google.maps.LatLng(overlayData.bbox.north, overlayData.bbox.east),
      );

      map.fitBounds(bounds);
    }
  }, [overlayData, map]);

  //  fit逃生路线 - 优化版本
  useEffect(() => {
    if (route && map) {
      console.log("🔍 开始自动缩放到路径位置...", route);

      const path = route.route.map(([lat, lng]) => ({ lat, lng }));

      // 创建边界框包含整个路径
      const bounds = new google.maps.LatLngBounds();

      path.forEach(({ lat, lng }) => {
        bounds.extend(new google.maps.LatLng(lat, lng));
      });

      // 添加起点和终点确保完整覆盖
      bounds.extend(new google.maps.LatLng(route.start[0], route.start[1]));
      bounds.extend(new google.maps.LatLng(route.destination[0], route.destination[1]));

      console.log("📍 路径边界:", {
        start: route.start,
        destination: route.destination,
        pathPoints: path.length,
      });

      // 使用动画效果平滑缩放到路径
      map.fitBounds(bounds, {
        top: 50, // 顶部边距
        right: 50, // 右侧边距
        bottom: 50, // 底部边距
        left: 50, // 左侧边距
      });

      // 延迟设置最小缩放级别，避免过度放大
      setTimeout(() => {
        const currentZoom = map.getZoom();
        console.log("🔍 当前缩放级别:", currentZoom);
        if (currentZoom && currentZoom > 16) {
          console.log("⚠️ 缩放级别过高，调整到16级");
          map.setZoom(16);
        }
      }, 500);
    }
  }, [route, map]);

  // fit到Marker - 但不在有路径时触发
  useEffect(() => {
    if (markers.length > 0 && map && !route) {
      console.log("🔍 自动缩放到火点标记位置...");
      const bounds = new google.maps.LatLngBounds();

      markers.forEach(({ lat, lng }) => {
        bounds.extend(new google.maps.LatLng(lat, lng));
      });
      map.fitBounds(bounds);
    }
  }, [markers, map, route]);

  return (
    <MapContext.Provider
      value={{
        setTifUrl,
        loaded: isLoaded,
        setCenter,
        currentMarker,
        setCurrentMarker,
        currentCustomFire,
        setCurrentCustomFire,
        currentShelter,
        setCurrentShelter,
        showShelters,
        setShowShelters,
        refreshShelters,
        map: map!,
        setOverlayData,
        closureMode,
        setClosureMode,
        route,
        setRoute,
      }}
    >
      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <GoogleMap
          key={`map-${routeVersion}`}
          center={center}
          mapContainerStyle={containerStyle}
          zoom={5}
          onClick={(e) => {
            if (closureMode && !createLoading) {
              // 设定封路
              createClosure(e.latLng!.toJSON());
            }

            setCurrentMarker(null);
            setCurrentCustomFire(null);
            setCurrentShelter(null);
          }}
          onLoad={onLoad}
        >
          {isLoaded &&
            markers.map((m, index) => {
              return (
                <Marker
                  key={index}
                  icon={{ url: "/fire.png", scaledSize: new window.google.maps.Size(32, 32) }}
                  position={{ lat: m.lat, lng: m.lng }}
                  onClick={() => {
                    setCurrentMarker(m);
                    setCurrentClosure(null);
                    setCurrentCustomFire(null);
                    setCurrentShelter(null);
                  }}
                />
              );
            })}
          {isLoaded &&
            reportMarkers.map((m, index) => {
              return (
                <Marker
                  key={index}
                  icon={{ url: "/fire.png", scaledSize: new window.google.maps.Size(32, 32) }}
                  position={{ lat: m.lat, lng: m.lng }}
                  onClick={(e) => {
                    const container = document.createElement("div");

                    // 使用 React 18 的 root API
                    const root = createRoot(container);

                    root.render(
                      <Button
                        type="primary"
                        onClick={() => {
                          delReport(m.id).then(() => {
                            // 处理删除成功后的逻辑
                            info.close();
                          });
                        }}
                      >
                        删除
                      </Button>,
                    );

                    var info = new google.maps.InfoWindow({
                      pixelOffset: new window.google.maps.Size(0, -30),
                      position: { lat: m.lat, lng: m.lng },
                      content: container,
                    });

                    // new window.google.maps.Size(0, -30)
                    // 将 MyComponent 转换成 HTML 字符串
                    info.open(map);
                  }}
                />
              );
            })}

          {isLoaded &&
            showShelters &&
            shelters.map((shelter) => {
              return (
                <Marker
                  key={`shelter-${shelter.id}`}
                  icon={{ url: "/x.png", scaledSize: new window.google.maps.Size(32, 32) }}
                  position={{ lat: shelter.lat, lng: shelter.lng }}
                  onClick={() => {
                    setCurrentMarker(null);
                    setCurrentClosure(null);
                    setCurrentCustomFire(null);
                    setCurrentShelter(shelter);
                  }}
                />
              );
            })}

          {isLoaded &&
            closureData.map((m, index) => {
              return (
                <Marker
                  key={index}
                  icon={{ url: "/barrier.png", scaledSize: new window.google.maps.Size(42, 42) }}
                  position={{ lat: m.lat, lng: m.lng }}
                  onClick={() => {
                    setCurrentMarker(null);
                    setCurrentClosure(m);
                  }}
                />
              );
            })}
          {Info}

          {CustomFireInfo}
          {ShelterInfo}
          {ClosureInfo}
          {overlay}
          {customFirePolygon}
          {routeComponents}
        </GoogleMap>
      </LoadScript>
      {children}
      <canvas
        ref={canvasRef}
        className="absolute -z-10 left-0 top-0"
        height={canvasSize.height}
        width={canvasSize.width}
      />
    </MapContext.Provider>
  );
};

export const useMapContext = () => {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error("useMapContext must be used within a MapProvider");
  }

  return context;
};
