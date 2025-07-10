"use client";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { LoginFormPage, ProFormSelect, ProFormText } from "@ant-design/pro-components";
import { useRequest } from "ahooks";
import { Button, Divider, message, Tabs, theme } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { User } from "@prisma/client";

import { API } from "@/src/utils/http";
import { useUser } from "@/src/hooks/useUser";

type LoginType = "register" | "login";

const Page = () => {
  const [loginType, setLoginType] = useState<LoginType>("login");
  const { token } = theme.useToken();
  const router = useRouter();
  const { setUserInfo } = useUser();

  const { run, loading } = useRequest(
    async (data: Record<string, any>) => {
      const res = API.post<User>("/auth/login", {
        data,
      });

      return res;
    },
    {
      manual: true,
      onSuccess(data, params) {
        setUserInfo(data);
        message.success("Login successful");
        router.replace("/");
      },
    },
  );

  const { run: registerRun, loading: registerLoading } = useRequest(
    async (data: Record<string, any>) => {
      const res = API.post<User>("/auth/register", {
        data,
      });

      return res;
    },
    {
      manual: true,
      onSuccess(data, params) {
        message.success("Registration successful");
        setUserInfo(data);
        router.replace("/");
      },
    },
  );

  return (
    <div className="bg-black/90 h-screen">
      <LoginFormPage
        actions={
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <Divider />
            <div>
              <Button
                type="link"
                onClick={() => {
                  if (loginType === "login") {
                    setLoginType("register");
                  } else {
                    setLoginType("login");
                  }
                }}
              >
                {loginType === "login" ? "Register" : "Login"}
              </Button>
            </div>
          </div>
        }
        backgroundVideoUrl="/lgbg.mp4"
        loading={loading || registerLoading}
        submitter={{
          searchConfig: {
            submitText: <>{loginType === "login" ? "Login" : "Register"}</>,
          },
        }}
        title="Wildfire risk control"
        onFinish={async (values) => {
          const { username, password, confirmPassword, role } = values;

          console.log(values, "-------------");

          if (loginType === "login") {
            // Call login API
            run({
              username,
              password,
            });
          } else {
            if (password !== confirmPassword) {
              message.error("Passwords do not match");

              return;
            }
            // Call register API
            registerRun({
              username,
              password,
              role,
            });
          }
        }}
      >
        <Tabs centered activeKey={"login"} items={[{ key: "account", label: "Login with username and password" }]} />
        {loginType === "login" ? (
          <>
            <ProFormText
              fieldProps={{
                size: "large",
                prefix: (
                  <UserOutlined
                    className={"prefixIcon"}
                    style={{
                      color: token.colorText,
                    }}
                  />
                ),
              }}
              label="Username"
              name="username"
              placeholder={"Username: admin or user"}
              rules={[
                {
                  required: true,
                  message: "Please enter your username!",
                },
              ]}
            />
            <ProFormText.Password
              fieldProps={{
                size: "large",
                prefix: (
                  <LockOutlined
                    className={"prefixIcon"}
                    style={{
                      color: token.colorText,
                    }}
                  />
                ),
              }}
              label="Password"
              name="password"
              placeholder={"Password: xxxx"}
              rules={[
                {
                  required: true,
                  message: "Please enter your password",
                },
              ]}
            />
          </>
        ) : (
          <>
            <ProFormText
              fieldProps={{
                size: "large",
                prefix: (
                  <UserOutlined
                    className={"prefixIcon"}
                    style={{
                      color: token.colorText,
                    }}
                  />
                ),
              }}
              label="Username"
              name="username"
              placeholder={"Username: admin or user"}
              rules={[
                {
                  required: true,
                  message: "Please enter your username!",
                },
                {
                  min: 5,
                  message: "Username must be at least 5characters long",
                },
              ]}
            />
            <ProFormText.Password
              fieldProps={{
                size: "large",
                prefix: (
                  <LockOutlined
                    className={"prefixIcon"}
                    style={{
                      color: token.colorText,
                    }}
                  />
                ),
              }}
              label="Password"
              name="password"
              placeholder={"Password: xxxx"}
              rules={[
                {
                  required: true,
                  message: "Please enter your password",
                },
                { min: 5, message: "Password must be at least 5 characters long" },
              ]}
            />
            <ProFormText.Password
              fieldProps={{
                size: "large",
                prefix: (
                  <LockOutlined
                    className={"prefixIcon"}
                    style={{
                      color: token.colorText,
                    }}
                  />
                ),
              }}
              label="Confirm Password"
              name="confirmPassword"
              placeholder={"Password: xxxx"}
              rules={[
                {
                  required: true,
                  message: "Please enter your password",
                },
              ]}
            />
            <ProFormSelect
              initialValue={"USER"}
              label="Role"
              name="role"
              options={[
                { label: "User", value: "USER" },
                { label: "Admin", value: "ADMIN" },
              ]}
              rules={[
                {
                  required: true,
                  message: "Please select your role",
                },
              ]}
            />
          </>
        )}
      </LoginFormPage>
    </div>
  );
};

export default Page;
