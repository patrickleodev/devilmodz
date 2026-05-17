import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = new URLSearchParams();
  const resolvedSearchParams = await searchParams;
  const orderId = resolvedSearchParams?.orderId;

  if (typeof orderId === "string" && orderId) {
    params.set("orderId", orderId);
  }

  const query = params.toString();
  redirect(query ? `/perfil?${query}` : "/perfil");
}
