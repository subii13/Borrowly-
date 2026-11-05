"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";
import { toggleFavouriteAction } from "@/app/actions/marketplace";

export function FavouriteButton({ listingId, initial, signedIn }: { listingId: string; initial: boolean; signedIn: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={saved}
      onClick={() => {
        if (!signedIn) return router.push(`/login?next=/listings/${listingId}`);
        start(async () => {
          const r = await toggleFavouriteAction(listingId);
          if (!r.ok) return void toast.error(r.error);
          setSaved(r.data);
          toast.success(r.data ? "Saved to favourites" : "Removed from favourites");
        });
      }}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-white px-3.5 text-sm font-medium hover:bg-canvas"
    >
      <Heart className={clsx("size-4", saved ? "fill-rose text-rose" : "text-ink-soft")} aria-hidden />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
