'use client';

import { Option, useOptions } from '@/src/actions/tif.hook';
import { PYRECAST_BASE_URL } from '@/src/constant';
import { useCesium } from '@/src/context/cesium.context';
import { Card, Cascader } from 'antd';
import { FC, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import {} from 'cesium'
import { loadTiffAndRender } from '@/src/utils/tif';
interface IProps { }

const Left: FC<PropsWithChildren<IProps>> = () => {
  const { options, getOptions, loading: firstLoading } = useOptions();

  const { options: data, loading, runAsync: loadOption } = useOptions();

  const [list, setList] = useState<Option[]>([]);

  const { curEntity, viewer } = useCesium()

  const loadData = async (selectedOptions: Option[]) => {
    const lastItem = selectedOptions[selectedOptions.length - 1]
    if (lastItem) {
      const target = selectedOptions.map(item => item.value).join('');

      loadOption(`${curEntity!.name}/${target}`).then((res) => {
        lastItem.children = res;
        setList([...list]);
      });
    }
  }

  const onChange=async (vals:(string|number|null)[])=>{
      const tifUrl=`${curEntity!.name}/${vals.join('')}`
      //加载tif文件
      if(viewer){
        await loadTiffAndRender(viewer, tifUrl);
      }
  }

  useMemo(() => {
    if (curEntity) {
      getOptions(`${curEntity.name}/`)
    }
  }, [curEntity])

  useEffect(() => {
    if (options.length) {
      setList(options)
    }
  }, [options])

  return (
    <div className="absolute top-16 left-3">
      <Card title="Fire spread forecast" variant="borderless" style={{ width: 300 }}>
        <Cascader placeholder="Please select" options={list} loading={firstLoading || loading} className='w-full!' loadData={loadData} onChange={onChange} />
      </Card>
    </div>
  );
};

export default Left;
