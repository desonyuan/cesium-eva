import { message } from "antd";
import { ModernFetch } from "modern-fetch";

import { getToken, setToken } from "./token";
const BaseUrl = "/";
const prefix = "api";

// const RefreshToken = async () => {
//   const accessToken = await getAccessToken();
//   const response = await request(`${BaseUrl}/${prefix}/refresh-token`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       accessToken,
//     }),
//   });
//   const refreshToken = response.headers.get('authorization');
//   if (refreshToken) {
//     await setToken(refreshToken);
//   }
//   const resBody = await response.json();
//   if (resBody?.data?.accessToken) {
//     await setAccessToken(resBody.accessToken);
//   }
//   if (resBody?.data?.accessToken) {
//     await setAccessToken(resBody.accessToken);
//     return true;
//   } else {
//     return Promise.reject('refresh token error');
//   }
// };

// Create instance
const ApiInstance = new ModernFetch({
  baseUrl: BaseUrl,
  // prefix,
});

ApiInstance.addReqIntcp(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.set("authorization", token);
  }

  return config;
});
// Response interceptor
ApiInstance.addResIntcp(async (response, responseTyepe, retry) => {
  if (response.ok) {
    const status = response.status;

    // Request successful - support 200 and 201 status codes
    if (status === 200 || status === 201) {
      const _token = response.headers.get("authorization");

      if (_token) {
        setToken(_token);
      }
      if (responseTyepe === "text") {
        return await response.text();
      } else if (responseTyepe === "arrayBuffer") {
        return await response.arrayBuffer();
      }
      const json = await response.json();
      const statusCode = json.statusCode;

      switch (statusCode) {
        case 200:
        case 201: // Add support for 201 status code
          return json.data;
        case 401:
          message.error("Unauthorized access");

          // Logout current account
          // await Logout();
          return Promise.reject();
        // case 406: // refresh token expired, request new one
        //   await RefreshToken();
        //   return await retry();
        case 422:
        // Message.show({
        //   type: 'warning',
        //   title: 'Parameter validation error',
        //   content: json.message,
        // });
        // return Promise.reject(json.message);
        default:
          message.error(json.message);

          return Promise.reject(json.message);
      }
    } else if (status > 200 && status < 300) {
      return response.statusText;
    } else {
      return Promise.reject(response.statusText);
    }
  } else {
    return Promise.reject(response.statusText);
  }
});
// 添加错误拦截器
ApiInstance.addErrIntcp(async (err) => {});
const reqPublic = ApiInstance.create("");
const API = ApiInstance.create("/api");

export { reqPublic, API };
