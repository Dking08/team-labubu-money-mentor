"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  createInitialAppProfileState,
  loadStoredAppProfileState,
  persistAppProfileState,
  type AppProfileState,
} from "@/lib/financial-profile";

interface ProfileContextValue {
  state: AppProfileState;
  setAppState: Dispatch<SetStateAction<AppProfileState>>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setAppState] = useState<AppProfileState>(createInitialAppProfileState());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setAppState(loadStoredAppProfileState());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    persistAppProfileState(state);
  }, [state, isHydrated]);

  const value = useMemo(
    () => ({
      state,
      setAppState,
    }),
    [state]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useFinancialProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useFinancialProfile must be used inside ProfileProvider");
  }

  return {
    profile: context.state.profile,
    aaData: context.state.aa_data,
    setAppState: context.setAppState,
  };
}
