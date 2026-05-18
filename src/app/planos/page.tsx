import { ensureDataSource } from "@/lib/db";
import { Product } from "@/entities/Product";
import { productToStoreProduct } from "@/lib/catalog";
import PlanosPageClient from "./PlanosPageClient";
import InfoBanner from "@/components/InfoBanner";

export const dynamic = "force-dynamic";

export default async function PlanosPage() {
  const dataSource = await ensureDataSource({ skipMaintenance: true });
  const productRepository = dataSource.getRepository(Product);
  const products = await productRepository.find({ order: { price: "ASC" } });
  const catalogProducts = products.filter((product) => !(product.tags || []).includes("custom:plan"));
  const publicProducts = catalogProducts.filter((product) => (product.tags || []).includes("public"));
  const initialProducts = (publicProducts.length > 0 ? publicProducts : catalogProducts).map(productToStoreProduct);

  return (
    <>
      <PlanosPageClient initialProducts={initialProducts} />
      <InfoBanner />
    </>
  );
}
