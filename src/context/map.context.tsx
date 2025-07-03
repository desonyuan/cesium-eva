'use client';

import {createContext, useContext, useState} from 'react';
import { FirePoint } from '../actions/maker.hook';

type Point = {lat: number; lng: number};

type MapData = {
  center: Point;
  loaded: boolean;
  setCenter: (center: Point) => void;
  setLoaded: (loaded: boolean) => void;
  currentMarker: FirePoint | null;
  setCurrentMarker: (marker: FirePoint | null) => void;
};

const MapContext = createContext<MapData | null>(null);

export const MapProvider = ({children}: {children: React.ReactNode}) => {
  const [center, setCenter] = useState<Point>({lat: 47.6062, lng: -122.3321}); // 美国西雅图坐标
  const [loaded, setLoaded] = useState(false);
  const [currentMarker, setCurrentMarker] = useState<FirePoint | null>(null);

  return (
    <MapContext.Provider value={{center, loaded, setLoaded, setCenter, currentMarker, setCurrentMarker}}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};
