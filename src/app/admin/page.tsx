import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../../pages/api/auth/[...nextauth]";
import { isAdminRole } from "../../lib/admin";
import AdminDashboard from "./dashboard";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { roles?: string[] } | undefined;

  if (!session || !isAdminRole(sessionUser?.roles)) {
    redirect("/");
  }

  return <AdminDashboard />;
}
