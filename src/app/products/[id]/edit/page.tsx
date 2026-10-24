import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteProduct } from "@/app/actions";
import { DeleteButton } from "@/components/form-ui";
import { ProductForm } from "@/components/product-form";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { getProduct, getProductUsage } from "@/lib/data";

export const metadata: Metadata = { title: "Edit product" };

export default function EditProductPage(props: PageProps<"/products/[id]/edit">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<PageSkeleton />}>
        <EditProduct params={props.params} />
      </Suspense>
    </div>
  );
}

async function EditProduct({ params }: { params: PageProps<"/products/[id]/edit">["params"] }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const used = (await getProductUsage()).find((u) => u.product.id === id)?.uses ?? 0;
  return (
    <>
      <PageHeader
        title="Edit product"
        subtitle={used ? `Used in ${used} entries. Waiting-period changes only affect new sprays.` : undefined}
        action={
          used === 0 && (
            <DeleteButton action={deleteProduct} fields={{ id }} confirmText={`Delete ${product.name}?`} />
          )
        }
      />
      <ProductForm product={product} defaultCategory={product.category} cancelHref={`/products/${id}`} />
    </>
  );
}
