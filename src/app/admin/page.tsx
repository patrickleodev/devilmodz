"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAdminRole } from "../../lib/admin";
import AdminDashboard from "./dashboard";

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionUser = session?.user as { roles?: string[] } | undefined;

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session || !isAdminRole(sessionUser?.roles)) {
      router.replace("/");
    }
  }, [router, session, sessionUser?.roles, status]);

  if (status === "loading") {
    return <main className="px-6 py-10 text-white">Carregando painel...</main>;
  }

  if (!session || !isAdminRole(sessionUser?.roles)) {
    return null;
  }

  return <AdminDashboard />;
}
