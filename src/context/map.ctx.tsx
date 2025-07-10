"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GoogleMap, InfoWindow, LoadScript, Marker, GroundOverlay, Polygon } from "@react-google-maps/api";
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
};
const containerStyle = {
  width: "100%",
  height: "100%",
};

const MapContext = createContext<MapData | null>(null);

export const MapProvider = ({ children }: { children: React.ReactNode }) => {
  const [center, setCenter] = useState({ lat: 47.6062, lng: -122.3321 }); // 美国西雅图坐标
  const { markers } = useMapMarkers();
  const [currentMarker, setCurrentMarker] = useState<FirePoint | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setLoaded] = useBoolean();
  const [overlayData, setOverlayData] = useState<OverlayData | null>(null);
  const [closureMode, setClosureMode] = useBoolean();
  const { createClosure, closureData, createLoading, delClosure } = useClosureMarkers();
  const [currentClosure, setCurrentClosure] = useState<IRoadClosure | null>(null);
  const [route, setRoute] = useState<IRoutePath | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    // This is just an example of getting and using the map instance!!! don't just blindly copy!
    // const bounds = new window.google.maps.LatLngBounds(center);
    // map.fitBounds(bounds);
    setMap(map);
    setLoaded.setTrue();
  }, []);

  const Info = useMemo(() => {
    if (!currentMarker) {
      return null;
    }

    const { raw, lng, lat } = currentMarker!;
    const data = Object.entries(raw).map(([key, value]) => ({
      key,
      value,
    }));

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
      return <GroundOverlay bounds={overlayData.bbox} url={overlayData.data} />;
    }

    return null;
  }, [overlayData]);

  const polygon = useMemo(() => {
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
        <Polygon
          options={{
            strokeColor: "#FF0000",
            // fillOpacity: 0.5,
            strokeWeight: 2,
          }}
          paths={path}
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
          {polygon}
        </GoogleMap>
      </LoadScript>
      {children}
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
