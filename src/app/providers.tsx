"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import Header from "@/components/Header";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <Header />
      {children}
    </SessionProvider>
  );
}
