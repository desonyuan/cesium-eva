
import { useRequest } from 'ahooks';
import { API } from '../utils/http';

export type FirePoint = {
  lat: number;
  lng: number;
  raw: IRow;
};
interface IRow {
  name: string;
  date: string;
  longitude: string;
  latitude: string;
  prettyname: string;
  acres: string;
  containper: string;
  xlo: string;
  xhi: string;
  ylo: string;
  yhi: string;
  irwinid: string;
  htb: string;
  modis: string;
  viirs: string;
  wfigs: string;
  firis: string;
  'fireguard ': string;
}

export const useMapMarkers = () => {
  const {data} = useRequest(() => {
      return API.get<FirePoint[]>("/fires")
  });
  return {markers: data || []};
};
