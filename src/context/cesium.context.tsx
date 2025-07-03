"use client";
import { BingMapsImageryProvider, BingMapsStyle, Cartesian2, defined, Entity, Ion, IonImageryProvider, SceneMode, ScreenSpaceEventType, Viewer } from "cesium";
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { CESIUM_TOKEN } from "@/config/cesium";
import { MapProvider } from "./map.context";

type ContentType = {
  viewer: Viewer;
  curEntity: Entity | null;
  getCloseModel: () => boolean;
};

const Context = createContext<ContentType>(undefined as any as ContentType);

const CesiumContext: FC<PropsWithChildren> = ({ children }) => {
  const [_viewer, setViewer] = useState<Viewer>(undefined as any as Viewer);
  const [curEntity, setCurEntity] = useState<Entity | null>(null);
  const addCloseMode = useRef(false)

  const getCloseModel = useCallback(() => addCloseMode.current, [])

  useEffect(() => {
    window.CESIUM_BASE_URL = "/cesium";
    Ion.defaultAccessToken = CESIUM_TOKEN;
    const viewer = new Viewer("container", {
      geocoder: false,
      navigationHelpButton: false,
      baseLayerPicker: false,
      sceneMode: SceneMode.SCENE2D,
      infoBox: true,
      // imageryProvider: false
    });

    setViewer(viewer);

    (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "none"; // Hide the credit container
    IonImageryProvider.fromAssetId(3).then((provider) => {
      viewer.imageryLayers.addImageryProvider(provider);
    });



    viewer.screenSpaceEventHandler.setInputAction((click: { position: Cartesian2 }) => {

      const picked = viewer.scene.pick(click.position)
      if (defined(picked) && picked.id) {
        const entity = picked.id as Entity
        const position = entity.position?.getValue(viewer.clock.currentTime)
        setCurEntity(entity);
        if (position) {
          viewer.selectedEntity = entity;
        }
      } else {
        viewer.selectedEntity = undefined;
        setCurEntity(null);
        // 如果是添加封路模式，则在地图上新增entity
        if (getCloseModel()) {
          //将click position转换为世界坐标
          const worldPosition = viewer.scene.pickPosition(click.position);
          if (worldPosition) {
            // 添加一个实体
            const entity = viewer.entities.add({
              position: worldPosition,
              billboard: {
                image: '/x.png',
                width: 32,
                height: 32,
              },
            });
            setCurEntity(entity);
          }
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK)



    return () => {
      viewer.destroy();
    };
  }, []);

  return (
    <Context.Provider value={{ viewer: _viewer, curEntity, getCloseModel }}>
      <MapProvider>
        <section className="h-screen" id="container" />
        {children}
      </MapProvider>
    </Context.Provider>
  );
};

export default CesiumContext;

export const useCesium = () => {
  return useContext(Context);
};
