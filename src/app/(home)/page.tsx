"use client";

import { Cartesian3, Color } from 'cesium';
import { FC, useEffect } from "react";

import { useMapMarkers } from "../../actions/maker.hook";
import { useCesium } from "../../context/cesium.context";
import Left from '@/src/components/sidebar/Left';

const Home: FC = () => {
  const { viewer } = useCesium();
  const { markers } = useMapMarkers()
  // 加载entity
  useEffect(() => {
    if (viewer && markers.length) {
      // Your code here
      markers.forEach((row, idx) => {
        const { lat, lng, raw } = row
        const descriptionHTML = `<table border="1">
            ${Object.entries(raw).map(([key, value]) => `
                <tr>
                  <td>${key}:</td>
                  <td>${value}</td>
                </tr>
              `).join("")
          }
          </table>`;
        viewer.entities.add({
          id: `fire-${idx}`,
          position: Cartesian3.fromDegrees(lng, lat),
          point: {
            pixelSize: 10,
            color: Color.RED,
          },
          description: descriptionHTML,
          name: row.raw.name,
          billboard: {
            image: '/fire.png',
            width: 32,
            height: 32,
          },
          properties: { ...raw, type: 'fire' }
        })

      })
      viewer.zoomTo(viewer.entities)
    }
  }, [viewer, markers])

  return <>
    <Left />
  </>;
};

export default Home;
