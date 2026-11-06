"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { ListingDraft } from "@/modules/voice/understand";
import { MicButton } from "./mic-button";

type Result = { transcript: string; language: string | null; draft: ListingDraft };

/**
 * "Speak to list": the seller describes the item in Tamil, Tanglish or English; Gnani Prisma
 * transcribes it and the form is pre-filled. Everything stays editable before publishing.
 */
export function VoiceListingAssist({ onDraft }: { onDraft: (d: ListingDraft) => void }) {
  const [last, setLast] = useState<Result | null>(null);
  return (
    <div className="rounded-xl border border-forest/20 bg-forest-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 font-semibold text-ink"><Sparkles className="size-4 text-forest" />Describe it by voice</p>
          <p className="mt-0.5 text-sm text-ink-soft">Speak in Tamil, Tanglish or English — e.g. <span lang="ta">“Bosch drill, nalla condition, naalukku 180 rupees, deposit 1500”</span>.</p>
        </div>
        <MicButton<Result>
          purpose="listing"
          variant="pill"
          label="Speak to list"
          maxSeconds={25}
          onResult={(r) => {
            setLast(r);
            onDraft(r.draft);
            toast.success("Filled the form from your description — check and edit anything.");
          }}
        />
      </div>
      {last && (
        <div className="mt-3 border-t border-forest/15 pt-3 text-sm">
          <p className="text-ink-soft"><span className="font-medium text-ink">Heard:</span> “{last.transcript}”</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {last.draft.understood.map((u) => (
              <span key={u} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-line"><CheckCircle2 className="size-3 text-forest" />{u}</span>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-faint">Transcribed by Gnani Prisma{last.language ? ` (${last.language})` : ""}. Add photos in step 3.</p>
        </div>
      )}
    </div>
  );
}
