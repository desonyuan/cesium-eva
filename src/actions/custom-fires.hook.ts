import { useRequest } from "ahooks";

import { API } from "../utils/http";

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

export const useCustomFires = () => {
  const { data, loading, error } = useRequest(() => {
    return API.get<CustomFirePoint[]>("/custom-fires");
  });

  return {
    customFires: data || [],
    loading,
    error,
  };
};
