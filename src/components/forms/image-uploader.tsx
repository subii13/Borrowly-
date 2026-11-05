"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export type Uploaded = { storageKey: string; preview: string };

/** Uploads images to /api/uploads and reports storage keys. Previews use local object URLs. */
export function ImageUploader({ scope, value, onChange, max = 6, label = "Add photos" }: { scope: "evidence" | "disputes" | "listings"; value: Uploaded[]; onChange: (v: Uploaded[]) => void; max?: number; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const next = [...value];
    for (const file of Array.from(files).slice(0, max - value.length)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5 MB`);
        continue;
      }
      const body = new FormData();
      body.set("file", file);
      body.set("scope", scope);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(data.error ?? "Upload failed");
      else next.push({ storageKey: data.key, preview: URL.createObjectURL(file) });
    }
    onChange(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((img, i) => (
        <div key={img.storageKey} className="relative size-20 overflow-hidden rounded-lg border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.preview} alt={`Upload ${i + 1}`} className="size-full object-cover" />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink/70 text-white" aria-label="Remove photo">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {value.length < max && (
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="grid size-20 place-items-center rounded-lg border border-dashed border-line-strong bg-white text-ink-soft hover:border-forest hover:text-forest" aria-label={label}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
    </div>
  );
}
