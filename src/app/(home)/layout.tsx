import CesiumContext from '@/src/context/cesium.context';
import { FC, PropsWithChildren, } from 'react';

interface IProps {}

const Layout:FC<PropsWithChildren<IProps>>=({children})=>{
return <CesiumContext>
  {children}
</CesiumContext>
}

export default Layout