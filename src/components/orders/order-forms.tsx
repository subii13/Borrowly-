"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";
import type { ActionResult } from "@/lib/errors";
import { DISPUTE_CATEGORY_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ImageUploader, type Uploaded } from "@/components/forms/image-uploader";

/** Confirms a handover/return step with an optional note and photos (immutable evidence). */
export function ConfirmStepForm({ action, label, help }: { action: (input: unknown) => Promise<ActionResult<unknown>>; label: string; help: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-xl border border-forest/20 bg-forest-50/50 p-4">
      <p className="font-semibold">{label}</p>
      <p className="mt-0.5 text-sm text-ink-soft">{help}</p>
      <textarea className="input mt-3 min-h-20 bg-white" placeholder="Condition notes (e.g. accessories included, any marks)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} aria-label="Condition notes" />
      <div className="mt-3"><ImageUploader scope="evidence" value={photos} onChange={setPhotos} label="Add evidence photos" /></div>
      <p className="mt-2 text-xs text-ink-faint">Evidence is visible only to you, the other party and Borrowly admins, and cannot be edited after submission.</p>
      <Button
        className="mt-3"
        disabled={pending}
        data-testid="confirm-step"
        onClick={() =>
          start(async () => {
            const r = await action({ note, photoKeys: photos.map((p) => p.storageKey) });
            if (!r.ok) return void toast.error(r.error);
            toast.success(r.message ?? "Confirmed");
            setNote("");
            setPhotos([]);
            router.refresh();
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {label}
      </Button>
    </div>
  );
}

export function ReviewForm({ action }: { action: (input: unknown) => Promise<ActionResult<unknown>> }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="card p-5">
      <p className="font-semibold">Leave a review</p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setRating(i)}>
            <Star className={clsx("size-7", i <= rating ? "fill-amber text-amber" : "text-line-strong")} />
          </button>
        ))}
      </div>
      <textarea className="input mt-3 min-h-24" placeholder="How was the item and the handover?" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} aria-label="Review" />
      <Button
        className="mt-3"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action({ rating, comment });
            if (!r.ok) return void toast.error(r.fieldErrors ? Object.values(r.fieldErrors)[0] : r.error);
            toast.success(r.message ?? "Review posted");
            router.refresh();
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" />}Post review
      </Button>
    </div>
  );
}

export function DisputeForm({ action, onDone }: { action: (input: unknown) => Promise<ActionResult<string>>; onDone?: string }) {
  const router = useRouter();
  const [category, setCategory] = useState("CONDITION_MISMATCH");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="d-cat">What went wrong?</label>
        <select id="d-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(DISPUTE_CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="d-desc">Describe the issue</label>
        <textarea id="d-desc" className="input min-h-32" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="What happened, when, and what outcome you're looking for." />
      </div>
      <div>
        <p className="label">Supporting photos (optional)</p>
        <ImageUploader scope="disputes" value={photos} onChange={setPhotos} />
      </div>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action({ category, description, evidenceKeys: photos.map((p) => p.storageKey) });
            if (!r.ok) return void toast.error(r.fieldErrors ? Object.values(r.fieldErrors)[0] : r.error);
            toast.success("Dispute submitted — our team will review it");
            router.push(onDone ?? `/account/disputes/${r.data}`);
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" />}Submit dispute
      </Button>
    </div>
  );
}
