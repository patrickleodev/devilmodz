import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function Page({ searchParams }: PageProps) {
  const params = new URLSearchParams();
  const orderId = searchParams?.orderId;

  if (typeof orderId === "string" && orderId) {
    params.set("orderId", orderId);
  }

  const query = params.toString();
  redirect(query ? `/payment-successful?${query}` : "/payment-successful");
}
