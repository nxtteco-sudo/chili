import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { ActivityRow } from "@/components/activity-row";
import { ButtonLink, Card, EmptyState, Field, PageSkeleton, SectionTitle, TypeIcon } from "@/components/ui";
import { getActivities, getProduct, getProductUsage, getProducts, getToday } from "@/lib/data";
import { dayKey, formatLong, relativeDay } from "@/lib/dates";
import { formatQty } from "@/lib/format";

export default function ProductPage(props: PageProps<"/products/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductDetail params={props.params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: { params: PageProps<"/products/[id]">["params"] }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const [today, products, history, usage] = await Promise.all([
    getToday(),
    getProducts(),
    getActivities({ productId: id }),
    getProductUsage(),
  ]);
  const u = usage.find((x) => x.product.id === id)!;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> Products
        </Link>
        <ButtonLink href={`/products/${product.id}/edit`} variant="secondary">
          <Pencil className="size-4" /> Edit
        </ButtonLink>
      </div>

      <header className="flex items-center gap-4">
        <TypeIcon type={product.category === "pesticide" ? "spray" : "fertilizer"} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="text-[15px] text-ink-2">{product.subtype}</p>
        </div>
      </header>

      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {product.activeIngredient && <Field label="Active ingredient">{product.activeIngredient}</Field>}
          {product.npk && <Field label="NPK">{product.npk}</Field>}
          <Field label="Measured in">{product.unit}</Field>
          {product.phiDays !== undefined && <Field label="Waiting period">{product.phiDays} days</Field>}
          <Field label="Times used">{u.uses}</Field>
          <Field label="Total used">{formatQty(u.totalQty, product.unit)}</Field>
          {u.lastUsed && (
            <Field label="Last used">
              {formatLong(u.lastUsed)} ({relativeDay(u.lastUsed, today).toLowerCase()})
            </Field>
          )}
        </dl>
        {product.notes && (
          <div className="mt-4 border-t border-line pt-3">
            <Field label="Notes">{product.notes}</Field>
          </div>
        )}
      </Card>

      <section>
        <SectionTitle>Usage history</SectionTitle>
        {history.length === 0 ? (
          <EmptyState>Not used yet.</EmptyState>
        ) : (
          <Card>
            <div className="divide-y divide-line">
              {history.map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  products={products}
                  dateLabel={formatLong(dayKey(a.occurredAt))}
                />
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
