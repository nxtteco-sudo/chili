import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductForm } from "@/components/product-form";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { oneOf, param } from "@/lib/params";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage(props: PageProps<"/products/new">) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New product" subtitle="Add a racun or baja so it can be picked when logging" />
      <Suspense fallback={<PageSkeleton />}>
        <NewProduct searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function NewProduct({ searchParams }: { searchParams: PageProps<"/products/new">["searchParams"] }) {
  const sp = await searchParams;
  const category = oneOf(param(sp, "category"), ["pesticide", "fertilizer"] as const) ?? "pesticide";
  const returnTo = param(sp, "return");
  return (
    <ProductForm
      defaultCategory={category}
      returnTo={returnTo}
      cancelHref={returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/products"}
    />
  );
}
