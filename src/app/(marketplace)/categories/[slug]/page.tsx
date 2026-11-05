import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { searchParamsSchema } from "@/modules/listings/search";
import { Results } from "@/components/marketplace/results";
import { SafeImage } from "@/components/ui/safe-image";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await db.category.findUnique({ where: { slug: (await params).slug } });
  return { title: c?.name ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) notFound();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const filters = searchParamsSchema.parse({ ...raw, category: slug });
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <SafeImage src={category.imageUrl} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/85 via-ink/60 to-ink/20" />
        <div className="container-page py-14 text-white sm:py-20">
          <nav className="text-sm text-white/70">
            <Link href="/explore" className="hover:text-white">Explore</Link> / {category.name}
          </nav>
          <h1 className="mt-3 text-4xl font-bold text-white">{category.name}</h1>
          <p className="mt-2 max-w-xl text-white/85">{category.description}</p>
        </div>
      </section>
      <div className="container-page py-10">
        <Results filters={filters} basePath={`/categories/${slug}`} lockCategory={slug} rawParams={raw} />
      </div>
    </>
  );
}
