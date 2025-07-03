"use client";

import type { ThemeProviderProps } from "next-themes";

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";
import { ConfigProvider, theme } from "antd";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}



export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>{children}</ConfigProvider>
    </AntdRegistry>
  );
}
