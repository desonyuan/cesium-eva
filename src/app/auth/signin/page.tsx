'use client'
import { API } from '@/src/utils/http';
import {
  LockOutlined,
  UserOutlined
} from '@ant-design/icons';
import {
  LoginFormPage,
  ProConfigProvider,
  ProFormSelect,
  ProFormText
} from '@ant-design/pro-components';
import { useRequest } from 'ahooks';
import { Button, Divider, message, Tabs, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type LoginType = 'register' | 'login';

const Page = () => {
  const [loginType, setLoginType] = useState<LoginType>('login');
  const { token } = theme.useToken();
  const router=useRouter()

  const { run, loading } = useRequest(async (data: Record<string, any>) => {
    const res = API.post("/user/login", {
      data
    })
    return res
  }, {
    manual: true,
    onSuccess(data, params) {
      message.success('Login successful');
      router.replace("/")
    },
  })

  const { run: registerRun, loading: registerLoading } = useRequest(async (data: Record<string, any>) => {
    const res = API.post("/user/register", {
      data
    })
    return res
  }, {
    manual: true,
    onSuccess(data, params) {
      message.success('Registration successful');
      router.replace("/")
    },
  })

  return (
    <div className='bg-black/90 h-screen'>
      <LoginFormPage
        loading={loading || registerLoading}
        backgroundVideoUrl="/lgbg.mp4"
        title="Wildfire risk control"
        submitter={{
          searchConfig: {
            submitText: <>{loginType === "login" ? "Login" : "Register"}</>,
          },
        }}
        actions={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
            }}
          >
            <Divider />
            <div>
              <Button type="link" onClick={() => {
                if (loginType === "login") {
                  setLoginType("register");
                } else {
                  setLoginType("login");
                }
              }}>
                {loginType === "login" ? "Register" : "Login"}
              </Button>
            </div>
          </div>
        }
        onFinish={async (values) => {
          const { username, password, confirmPassword, role } = values;
          console.log(values, '-------------');

          if (loginType === "login") {
            // Call login API
            run({
              username,
              password,
            })
          } else {
            if (password !== confirmPassword) {
              message.error('Passwords do not match');
              return;
            }
            // Call register API
            registerRun({
              username,
              password,
              role
            })
          }
        }}
      >
        <Tabs
          items={[
            { key: 'account', label: 'Login with username and password' },
          ]}
          centered
          activeKey={'login'}
        >
        </Tabs>
        {
          loginType === "login" ? <>
            <ProFormText
              name="username"
              label="Username"
              fieldProps={{
                size: 'large',
                prefix: (
                  <UserOutlined
                    style={{
                      color: token.colorText,
                    }}
                    className={'prefixIcon'}
                  />
                ),
              }}
              placeholder={'Username: admin or user'}
              rules={[
                {
                  required: true,
                  message: 'Please enter your username!',
                },
              ]}
            />
            <ProFormText.Password
              name="password"
              label="Password"
              fieldProps={{
                size: 'large',
                prefix: (
                  <LockOutlined
                    style={{
                      color: token.colorText,
                    }}
                    className={'prefixIcon'}
                  />
                ),
              }}
              placeholder={'Password: xxxx'}
              rules={[
                {
                  required: true,
                  message: 'Please enter your password',
                },
              ]}
            />
          </> : <>
            <ProFormText
              name="username"
              label="Username"
              fieldProps={{
                size: 'large',
                prefix: (
                  <UserOutlined
                    style={{
                      color: token.colorText,
                    }}
                    className={'prefixIcon'}
                  />
                ),
              }}
              placeholder={'Username: admin or user'}
              rules={[
                {
                  required: true,
                  message: 'Please enter your username!',
                },
                {
                  min: 5,
                  message: 'Username must be at least 5characters long',
                },
              ]}
            />
            <ProFormText.Password
              name="password"
              label="Password"
              fieldProps={{
                size: 'large',
                prefix: (
                  <LockOutlined
                    style={{
                      color: token.colorText,
                    }}
                    className={'prefixIcon'}
                  />
                ),
              }}
              placeholder={'Password: xxxx'}
              rules={[
                {
                  required: true,
                  message: 'Please enter your password',
                },
                { min: 5, message: 'Password must be at least 5 characters long' }
              ]}
            />
            <ProFormText.Password
              name="confirmPassword"
              label="Confirm Password"
              fieldProps={{
                size: 'large',
                prefix: (
                  <LockOutlined
                    style={{
                      color: token.colorText,
                    }}
                    className={'prefixIcon'}
                  />
                ),
              }}
              placeholder={'Password: xxxx'}
              rules={[
                {
                  required: true,
                  message: 'Please enter your password',
                },
              ]}
            />
            <ProFormSelect
              name="role"
              label="Role"
              initialValue={"USER"}
              options={[
                { label: 'User', value: 'USER' },
                { label: 'Admin', value: 'ADMIN' },
              ]}
              rules={[
                {
                  required: true,
                  message: 'Please select your role',
                },
              ]}
            />
          </>
        }
      </LoginFormPage>
    </div>
  );
};

export default () => {
  return (
    <ProConfigProvider dark>
      <Page />
    </ProConfigProvider>
  );
};