import Link from "next/link";
import Image from "next/image";
import type { Shop } from "@/lib/types";

export default function ShopCard({ shop }: { shop: Shop }) {
  return (
    <Link
      href={`/trips?shop=${shop.id}`}
      className="focus-ring group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white transition-transform hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="relative h-28 w-full bg-krachiao-light">
        {shop.image_url ? (
          <Image src={shop.image_url} alt={shop.name} fill className="object-cover" />
        ) : (
          <div className="ikat-wash flex h-full items-center justify-center font-display text-2xl text-krachiao-dark">
            {shop.name.charAt(0)}
          </div>
        )}
        {shop.order_count > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-turmeric px-2 py-0.5 text-xs font-medium text-ink shadow-sm">
            หิ้วแล้ว {shop.order_count} ครั้ง
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-medium text-ink group-hover:text-krachiao">
          {shop.name}
        </h3>
        {shop.category && (
          <p className="mt-0.5 text-xs text-ink/50">{shop.category}</p>
        )}
      </div>
    </Link>
  );
}
