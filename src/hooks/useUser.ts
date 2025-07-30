"use client";

import { useCallback, useEffect, useState } from "react";
import { User } from "@prisma/client";

import { localStore } from "../utils/localStore";

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);

  const getUserInfo = useCallback(() => {
    const userInfo = localStore.get("user");

    if (userInfo) {
      setUser(userInfo);
    }
  }, []);

  const setUserInfo = useCallback((userInfo: User) => {
    setUser(userInfo);
    localStore.set("user", userInfo);
  }, []);

  useEffect(() => {
    getUserInfo();
  }, []);

  return { user, setUserInfo };
};
