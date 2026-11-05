"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clsx } from "clsx";
import { ArrowDown, ArrowUp, Check, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { AREAS, CONDITIONS, CONDITION_LABEL } from "@/lib/constants";
import { listingSchema, type ListingInput } from "@/lib/validation";
import type { ActionResult } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/primitives";

type Category = { id: string; name: string };
type FormImage = { id?: string; storageKey?: string; url: string };

const STEPS: { title: string; fields: FieldPath<ListingInput>[] }[] = [
  { title: "Product details", fields: ["title", "description", "brand", "model"] },
  { title: "Category & condition", fields: ["categoryId", "condition"] },
  { title: "Photos", fields: ["images"] },
  { title: "Pricing", fields: ["rentalEnabled", "purchaseEnabled", "dailyRate", "deposit", "salePrice", "stockQuantity", "minRentalDays", "maxRentalDays"] },
  { title: "Location", fields: ["area", "pincode"] },
  { title: "Preview & publish", fields: [] },
];

export function ListingWizard({ categories, initial, submit, mode }: { categories: Category[]; initial: ListingInput; submit: (input: unknown) => Promise<ActionResult<string>>; mode: "create" | "edit" }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useForm<ListingInput>({ resolver: zodResolver(listingSchema), defaultValues: initial, mode: "onTouched" });
  const { register, watch, setValue, trigger, formState, getValues, setError } = form;
  const v = watch();
  const images = (v.images ?? []) as FormImage[];
  const err = (k: string) => (formState.errors as Record<string, { message?: string }>)[k]?.message;

  const next = async () => {
    if (await trigger(STEPS[step].fields)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const upload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    const list = [...images];
    for (const file of Array.from(files).slice(0, 8 - list.length)) {
      const body = new FormData();
      body.set("file", file);
      body.set("scope", "listings");
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(`${file.name}: ${data.error ?? "upload failed"}`);
      else list.push({ storageKey: data.key, url: data.url });
    }
    setValue("images", list, { shouldValidate: true });
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  };
  const move = (i: number, d: number) => {
    const list = [...images];
    const [x] = list.splice(i, 1);
    list.splice(i + d, 0, x);
    setValue("images", list);
  };

  const save = (publish: boolean) =>
    start(async () => {
      setValue("publish", publish);
      if (!(await trigger())) {
        toast.error("Some fields need attention");
        const firstBad = STEPS.findIndex((s) => s.fields.some((f) => (formState.errors as Record<string, unknown>)[f]));
        if (firstBad >= 0) setStep(firstBad);
        return;
      }
      const r = await submit({ ...getValues(), publish });
      if (!r.ok) {
        for (const [k, m] of Object.entries(r.fieldErrors ?? {})) setError(k as FieldPath<ListingInput>, { message: m });
        return void toast.error(r.error);
      }
      toast.success(publish ? "Your listing is live" : "Saved as draft");
      router.push("/seller/listings");
      router.refresh();
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-2 overflow-x-auto scrollbar-none lg:flex-col">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button type="button" onClick={() => (i < step ? setStep(i) : undefined)} className={clsx("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap", i === step ? "bg-white font-semibold shadow-[var(--shadow-card)]" : "text-ink-soft")}>
              <span className={clsx("grid size-6 shrink-0 place-items-center rounded-full text-xs", i < step ? "bg-forest text-white" : i === step ? "border-2 border-forest text-forest" : "border border-line-strong")}>{i < step ? <Check className="size-3.5" /> : i + 1}</span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="card p-5 sm:p-7">
        <h2 className="text-xl font-bold">{STEPS[step].title}</h2>
        <div className="mt-6 space-y-5">
          {step === 0 && (
            <>
              <Field label="Title" htmlFor="title" error={err("title")} hint="e.g. Canon EOS 80D with 18-135mm lens"><input id="title" className="input" {...register("title")} /></Field>
              <Field label="Description" htmlFor="description" error={err("description")} hint="Condition, what's included, and anything a renter should know"><textarea id="description" className="input min-h-36" {...register("description")} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand (optional)" htmlFor="brand" error={err("brand")}><input id="brand" className="input" {...register("brand")} /></Field>
                <Field label="Model (optional)" htmlFor="model" error={err("model")}><input id="model" className="input" {...register("model")} /></Field>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <Field label="Category" htmlFor="categoryId" error={err("categoryId")}>
                <select id="categoryId" className="input" {...register("categoryId")}>
                  <option value="">Choose a category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <div>
                <p className="label">Condition</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CONDITIONS.map((c) => (
                    <label key={c} className={clsx("cursor-pointer rounded-lg border px-3 py-3 text-center text-sm", v.condition === c ? "border-forest bg-forest-50 font-semibold text-forest" : "border-line bg-white")}>
                      <input type="radio" value={c} className="sr-only" {...register("condition")} />
                      {CONDITION_LABEL[c]}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <div>
              <p className="text-sm text-ink-soft">Add up to 8 photos (JPEG, PNG or WebP, max 5 MB each). The first photo is the cover. Photos are re-encoded and location metadata is removed.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((img, i) => (
                  <div key={img.id ?? img.storageKey ?? img.url} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-canvas">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                    {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-forest px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
                    <div className="absolute right-1.5 top-1.5 flex gap-1">
                      {i > 0 && <button type="button" onClick={() => move(i, -1)} className="grid size-6 place-items-center rounded-full bg-white/90" aria-label="Move earlier"><ArrowUp className="size-3.5" /></button>}
                      {i < images.length - 1 && <button type="button" onClick={() => move(i, 1)} className="grid size-6 place-items-center rounded-full bg-white/90" aria-label="Move later"><ArrowDown className="size-3.5" /></button>}
                      <button type="button" onClick={() => setValue("images", images.filter((_, j) => j !== i), { shouldValidate: true })} className="grid size-6 place-items-center rounded-full bg-ink/70 text-white" aria-label="Remove photo"><X className="size-3.5" /></button>
                    </div>
                  </div>
                ))}
                {images.length < 8 && (
                  <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="grid aspect-[4/3] place-items-center rounded-lg border-2 border-dashed border-line-strong bg-white text-sm text-ink-soft hover:border-forest hover:text-forest">
                    <span className="flex flex-col items-center gap-1">{uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}{uploading ? "Uploading…" : "Add photos"}</span>
                  </button>
                )}
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} data-testid="listing-photo-input" />
              {err("images") && <p className="mt-2 text-sm text-rose">{err("images")}</p>}
            </div>
          )}
          {step === 3 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border p-4", v.rentalEnabled ? "border-forest bg-forest-50" : "border-line bg-white")}>
                  <input type="checkbox" className="mt-1 accent-forest" {...register("rentalEnabled")} />
                  <span><span className="block font-semibold">Available to rent</span><span className="text-sm text-ink-soft">Charge per day plus a refundable deposit</span></span>
                </label>
                <label className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border p-4", v.purchaseEnabled ? "border-forest bg-forest-50" : "border-line bg-white")}>
                  <input type="checkbox" className="mt-1 accent-forest" {...register("purchaseEnabled")} />
                  <span><span className="block font-semibold">Available to buy</span><span className="text-sm text-ink-soft">Sell it pre-owned for a fixed price</span></span>
                </label>
              </div>
              {err("rentalEnabled") && <p className="text-sm text-rose">{err("rentalEnabled")}</p>}
              {v.rentalEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Daily rate (₹)" htmlFor="dailyRate" error={err("dailyRate")}><input id="dailyRate" inputMode="decimal" className="input" {...register("dailyRate")} /></Field>
                  <Field label="Refundable deposit (₹)" htmlFor="deposit" error={err("deposit")}><input id="deposit" inputMode="decimal" className="input" {...register("deposit")} /></Field>
                  <Field label="Minimum days" htmlFor="minRentalDays" error={err("minRentalDays")}><input id="minRentalDays" type="number" min={1} className="input" {...register("minRentalDays")} /></Field>
                  <Field label="Maximum days" htmlFor="maxRentalDays" error={err("maxRentalDays")}><input id="maxRentalDays" type="number" min={1} className="input" {...register("maxRentalDays")} /></Field>
                </div>
              )}
              {v.purchaseEnabled && <Field label="Selling price (₹)" htmlFor="salePrice" error={err("salePrice")}><input id="salePrice" inputMode="decimal" className="input" {...register("salePrice")} /></Field>}
              <Field label="Units in stock" htmlFor="stockQuantity" error={err("stockQuantity")} hint="How many identical units you have"><input id="stockQuantity" type="number" min={1} className="input" {...register("stockQuantity")} /></Field>
              <p className="text-xs text-ink-faint">Borrowly keeps a commission on completed transactions; you see the exact split on every booking.</p>
            </>
          )}
          {step === 4 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Area in Coimbatore" htmlFor="area" error={err("area")}>
                <select id="area" className="input" {...register("area", { onChange: (e) => { const a = AREAS.find((x) => x.name === e.target.value); if (a) setValue("pincode", a.pincode); } })}>
                  <option value="">Choose area</option>
                  {AREAS.map((a) => <option key={a.name}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Pincode" htmlFor="pincode" error={err("pincode")}><input id="pincode" inputMode="numeric" className="input" {...register("pincode")} /></Field>
              <p className="text-xs text-ink-faint sm:col-span-2">Only the area and pincode are public. Your exact pickup address (from your seller profile) is shared after you confirm a booking.</p>
            </div>
          )}
          {step === 5 && (
            <div className="overflow-hidden rounded-xl border border-line">
              {images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[0].url} alt="" className="aspect-[16/9] w-full object-cover" />
              )}
              <div className="p-5">
                <p className="text-xs text-ink-soft">{categories.find((c) => c.id === v.categoryId)?.name} · {v.condition && CONDITION_LABEL[v.condition]} · {v.area}</p>
                <h3 className="mt-1 text-lg font-bold">{v.title || "Untitled listing"}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{v.description}</p>
                <p className="mt-3 text-sm font-semibold">
                  {v.rentalEnabled && `₹${v.dailyRate}/day (deposit ₹${v.deposit || 0})`} {v.rentalEnabled && v.purchaseEnabled && " · "} {v.purchaseEnabled && `Buy ₹${v.salePrice}`}
                </p>
                <p className="mt-1 text-xs text-ink-faint">{images.length} photo(s) · {String(v.stockQuantity)} unit(s)</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
          <div className="flex gap-2">
            {step === STEPS.length - 1 ? (
              <>
                <Button type="button" variant="secondary" disabled={pending} onClick={() => save(false)}>{mode === "edit" ? "Save changes" : "Save draft"}</Button>
                <Button type="button" disabled={pending} onClick={() => save(true)} data-testid="publish-listing">{pending && <Loader2 className="size-4 animate-spin" />}Publish</Button>
              </>
            ) : (
              <Button type="button" onClick={next} disabled={uploading}>Continue</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
