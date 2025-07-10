"use client";

import { useBoolean, useRequest } from "ahooks";
import { Button, Card, Cascader, Form, Input, Modal, Spin } from "antd";

import { Option, useOptions } from "@/src/actions/tif.hook";
import { useMapContext } from "@/src/context/map.ctx";
import { API } from "@/src/utils/http";

import {} from "cesium";
import { FC, PropsWithChildren, useEffect, useMemo, useState } from "react";

import { useUser } from "@/src/hooks/useUser";
import { useEscape } from "@/src/actions/closure.hook";

export type OverlayData = {
  data: string;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  width: number;
  height: number;
};

interface IProps {}
const Left: FC<PropsWithChildren<IProps>> = () => {
  const { options, getOptions, loading: firstLoading } = useOptions();
  const { loading, runAsync: loadOption } = useOptions();
  const [values, setValues] = useState<(string | number | null)[]>([]);
  const [list, setList] = useState<Option[]>([]);
  const { currentMarker, setOverlayData, setClosureMode, closureMode, setRoute } = useMapContext();
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useBoolean();
  const { createEscape, loading: loadingEscape } = useEscape();
  const [form] = Form.useForm();

  const { run: loadTif, loading: loadingTif } = useRequest(
    (tifUrl: string, lat: number, lng: number) => {
      return API.get<OverlayData>("/tif", { data: { url: tifUrl, lat, lng } });
    },
    {
      manual: true,
      onSuccess(data) {
        setOverlayData(data);
      },
    },
  );

  const loadData = async (selectedOptions: Option[]) => {
    const lastItem = selectedOptions[selectedOptions.length - 1];

    if (lastItem) {
      const target = selectedOptions.map((item) => item.value).join("");

      loadOption(`${currentMarker?.raw!.name}/${target}`).then((res) => {
        lastItem.children = res;
        setList([...list]);
      });
    }
  };

  const onChange = async (vals: (string | number | null)[]) => {
    setValues(vals);
    const tifUrl = `${currentMarker?.raw!.name}/${vals.join("")}`;

    setOverlayData(null);
    //加载tif文件
    loadTif(tifUrl, currentMarker!.lat, currentMarker!.lng);
  };
  //
  const handleClosure = async () => {
    const values = await form.validateFields();

    const res = await createEscape(values);

    setRoute(res);
    setIsModalOpen.setFalse();
  };

  useMemo(() => {
    if (currentMarker) {
      setValues([]);
      getOptions(`${currentMarker.raw.name}/`);
    }
  }, [currentMarker]);

  useEffect(() => {
    if (options.length) {
      setList(options);
    }
  }, [options]);

  return (
    <div className="absolute top-28 left-2">
      <Card
        classNames={{ body: "gap-5" }}
        extra={loadingTif && <Spin />}
        style={{ width: 300 }}
        title="Fire spread forecast"
        variant="borderless"
      >
        <div className="flex flex-col gap-y-5">
          <Cascader
            className="w-full!"
            loadData={loadData}
            loading={firstLoading || loading}
            options={list}
            placeholder="Please select"
            value={values}
            onChange={onChange}
          />
          {user && user.role === "ADMIN" && (
            <>
              <Button type={closureMode ? "primary" : "default"} onClick={() => setClosureMode.toggle()}>
                {closureMode ? "Done" : "Set closure"}
              </Button>
            </>
          )}
          <Button type="primary" onClick={setIsModalOpen.setTrue}>
            Planning the path
          </Button>
        </div>
      </Card>
      <Modal
        closable={{ "aria-label": "Custom Close Button" }}
        okButtonProps={{
          loading: loadingEscape,
        }}
        open={isModalOpen}
        title="Please enter your latitude and longitude"
        onCancel={setIsModalOpen.setFalse}
        onOk={handleClosure}
      >
        <Form form={form} layout="vertical">
          <Form.Item required label="Latitude" name="latitude" rules={[{ required: true }]}>
            <Input required placeholder="Latitude" />
          </Form.Item>
          <Form.Item required label="Longitude" name="longitude" rules={[{ required: true }]}>
            <Input required placeholder="Longitude" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Left;
