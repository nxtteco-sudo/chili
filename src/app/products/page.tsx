import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ButtonLink, Card, PageHeader, PageSkeleton, SectionTitle, TypeIcon } from "@/components/ui";
import { getProductUsage, getToday, type ProductUsage } from "@/lib/data";
import { relativeDay } from "@/lib/dates";
import { formatQty, formatRm } from "@/lib/format";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Racun & baja: prices, waiting periods and how much was used"
        action={
          <ButtonLink href="/products/new">
            <Plus className="size-5" /> <span>Add product</span>
          </ButtonLink>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <Products />
      </Suspense>
    </>
  );
}

async function Products() {
  const [today, usage] = await Promise.all([getToday(), getProductUsage()]);
  const groups = [
    { title: "Pesticides · Racun", items: usage.filter((u) => u.product.category === "pesticide") },
    { title: "Fertilizers · Baja", items: usage.filter((u) => u.product.category === "fertilizer") },
  ];
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.title}>
          <SectionTitle>{g.title}</SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {g.items
                .sort((a, z) => z.totalCost - a.totalCost)
                .map((u) => (
                  <ProductRow key={u.product.id} usage={u} today={today} />
                ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}

function ProductRow({ usage: u, today }: { usage: ProductUsage; today: string }) {
  const p = u.product;
  return (
    <li>
      <Link href={`/products/${p.id}`} className="product-row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
        <TypeIcon type={p.category === "pesticide" ? "spray" : "fertilizer"} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{p.name}</p>
          <p className="truncate text-sm text-ink-2">
            {p.subtype} · {formatQty(p.packSize, p.unit)} for {formatRm(p.packPriceRm)}
            {p.phiDays !== undefined && ` · ${p.phiDays}-day wait`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular text-[15px] font-medium">{formatRm(u.totalCost)}</p>
          <p className="text-sm text-muted">
            {u.uses ? `${u.uses}× · ${relativeDay(u.lastUsed!, today).toLowerCase()}` : "Not used yet"}
          </p>
        </div>
      </Link>
    </li>
  );
}
