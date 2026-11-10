"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";

type Img = { id: string; url: string; alt: string };

export function Gallery({ images, title }: { images: Img[]; title: string }) {
  const list = images.length ? images : [{ id: "placeholder", url: "", alt: title }];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const go = (d: number) => setIndex((i) => (i + d + list.length) % list.length);
  const current = list[index];

  return (
    <div>
      <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-white">
        <SafeImage key={current.id} src={current.url} alt={current.alt} fill priority sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" />
        <button type="button" onClick={() => setZoom(true)} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-sm" aria-label="View larger">
          <Expand className="size-4" />
        </button>
        {list.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-sm" aria-label="Previous image"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-sm" aria-label="Next image"><ChevronRight className="size-5" /></button>
            <span className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-2.5 py-0.5 text-xs text-white">{index + 1} / {list.length}</span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
          {list.map((img, i) => (
            <button key={img.id} type="button" onClick={() => setIndex(i)} aria-label={`Show image ${i + 1}`} aria-current={i === index} className={clsx("relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg border-2", i === index ? "border-brand" : "border-transparent opacity-80 hover:opacity-100")}>
              <SafeImage src={img.url} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4" role="dialog" aria-modal="true" aria-label={title} onClick={() => setZoom(false)}>
          <button className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white" aria-label="Close"><X className="size-5" /></button>
          <div className="relative aspect-[4/3] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <SafeImage src={current.url} alt={current.alt} fill sizes="100vw" className="rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
