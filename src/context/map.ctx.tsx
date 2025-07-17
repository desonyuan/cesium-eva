"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, InfoWindow, LoadScript, Marker, GroundOverlay, Polyline } from "@react-google-maps/api";
import { Button, Popconfirm, Table } from "antd";
import { useBoolean } from "ahooks";
import { Actions } from "ahooks/lib/useBoolean";
import dayjs from "dayjs";

import { FirePoint, IRoadClosure, useClosureMarkers, useMapMarkers } from "../actions/maker.hook";
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

let overlayWindow: google.maps.InfoWindow;
let markerWindow: google.maps.InfoWindow;

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

export const MapProvider = ({ children }: { children: React.ReactNode }) => {
  const [center, setCenter] = useState({ lat: 47.6062, lng: -122.3321 }); // 美国西雅图坐标
  const { markers } = useMapMarkers();
  const [currentMarker, setCurrentMarker] = useState<FirePoint | null>(null);
  const [tifUrl, setTifUrl] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setLoaded] = useBoolean();
  const [overlayData, setOverlayData] = useState<OverlayData | null>(null);
  const [closureMode, setClosureMode] = useBoolean();
  const { createClosure, closureData, createLoading, delClosure } = useClosureMarkers();
  const [currentClosure, setCurrentClosure] = useState<IRoadClosure | null>(null);
  const [route, setRoute] = useState<IRoutePath | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    // This is just an example of getting and using the map instance!!! don't just blindly copy!
    // const bounds = new window.google.maps.LatLngBounds(center);
    // map.fitBounds(bounds);
    setMap(map);
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

              console.log(`点击位置经纬度：${lat}, ${lng}`);
              console.log(`像素值：R=${r}, G=${g}, B=${b}, A=${a}`);

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

    return (
      <>
        {/* <Marker
          icon={{ url: "/user.png", scaledSize: new window.google.maps.Size(42, 42) }}
          position={{ lat: route.start[0], lng: route.start[1] }}
        /> */}
        <Polyline
          options={{
            strokeColor: "#FF0000",
            // fillOpacity: 0.5,
            strokeWeight: 2,
          }}
          path={path}
        />
      </>
    );
  }, [route]);

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

  //  fit逃生路线
  useEffect(() => {
    if (route && map) {
      const path = route.route.map(([lat, lng]) => ({ lat, lng }));
      //fit
      const bounds = new google.maps.LatLngBounds();

      path.forEach(({ lat, lng }) => {
        bounds.extend(new google.maps.LatLng(lat, lng));
      });
      map.fitBounds(bounds);
    }
  }, [route, map]);

  // fit到Marker
  useEffect(() => {
    if (markers.length > 0 && map) {
      const bounds = new google.maps.LatLngBounds();

      markers.forEach(({ lat, lng }) => {
        bounds.extend(new google.maps.LatLng(lat, lng));
      });
      map.fitBounds(bounds);
    }
  }, [markers, map]);

  return (
    <MapContext.Provider
      value={{
        setTifUrl,
        loaded: isLoaded,
        setCenter,
        currentMarker,
        setCurrentMarker,
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
          center={center}
          mapContainerStyle={containerStyle}
          zoom={5}
          onClick={(e) => {
            if (closureMode && !createLoading) {
              // 设定封路
              createClosure(e.latLng!.toJSON());
            }

            setCurrentMarker(null);
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
          {ClosureInfo}
          {overlay}
          {polyline}
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
