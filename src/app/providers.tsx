"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main
          className={`flex flex-1 flex-col ${
            isHome
              ? ""
              : "bg-[linear-gradient(180deg,#090b16_0%,#05060b_100%)] bg-no-repeat"
          }`}
        >
          {children}
        </main>
        <Footer />
      </div>
    </SessionProvider>
  );
}
