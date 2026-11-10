import type { Metadata } from "next";
import Link from "next/link";
import { FileAudio, Mic, NotebookPen, Volume2 } from "lucide-react";
import { voiceConfigured } from "@/modules/voice/gnani";
import { SearchBar } from "@/components/marketplace/search-bar";

export const metadata: Metadata = { title: "Borrowly Voice", description: "Rent, list and record handovers by voice in Tamil, Tanglish and English, powered by Gnani AI." };

const FEATURES = [
  { icon: Mic, title: "Voice search", model: "Gnani Prisma v3.0 · speech to text", body: "Say what you need, where and when — “Naalaiku oru DSLR camera venum, RS Puram la, rendu naalukku”. Borrowly picks out the item, area and dates, filters results and pre-selects your dates on the booking calendar." },
  { icon: NotebookPen, title: "Speak to list", model: "Gnani Prisma v3.0 · code-mixed transcription", body: "Sellers describe an item in their own words — “Bosch drill, nalla condition, naalukku 180 rupees, deposit 1500”. The listing form fills in brand, category, condition and prices." },
  { icon: Volume2, title: "Spoken replies in Tamil", model: "Gnani Timbre v3.0 · text to speech", body: "Search results and booking summaries are read back in natural Tamil, with prices said as words — for people more comfortable listening than reading English screens." },
  { icon: FileAudio, title: "Voice handover notes", model: "Gnani Prisma v3.0 · speech to text", body: "At pickup and return, speak the condition notes instead of typing on a phone. They're saved as tamper-proof evidence on the booking." },
];

export default function VoicePage() {
  const live = voiceConfigured();
  return (
    <div className="container-page py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">Borrowly Voice</p>
        <h1 className="mt-2 text-4xl font-bold">Rent in the language you speak</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Coimbatore talks in Tamil and Tanglish, not in English search boxes. Borrowly Voice lets anyone search, list and record handovers by speaking — built on Gnani AI&apos;s Indian-language speech models.
        </p>
        <div className="mt-8"><SearchBar size="lg" /></div>
        {!live && <p className="mt-3 text-sm text-amber">Voice is not configured on this server (missing GNANI_API_KEY).</p>}
      </div>
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, model, body }) => (
          <div key={title} className="card p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand"><Icon className="size-5" /></span>
              <div>
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="text-xs text-ink-faint">{model}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-soft">{body}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 max-w-3xl space-y-3 text-sm text-ink-soft">
        <h2 className="text-lg font-bold text-ink">How it works</h2>
        <p>The browser records a short 16 kHz WAV clip. Borrowly&apos;s server sends it to Gnani Prisma v3.0 with <code>ta-IN,en-IN</code> and code-mix formatting, so English item names stay English inside Tamil sentences. A deterministic parser understands Tamil script and romanised Tanglish — number words like “rendu aayiram”, dates like “naalaiku” and areas like “பீளமேட்டில்”. Spoken replies are composed on the server from live search results and voiced by Gnani Timbre v3.0.</p>
        <p>The API key never reaches the browser, recordings are not stored, and every transcript is shown back to you before anything is saved. Try it as a seller on <Link href="/seller/listings/new" className="text-brand underline">Create listing</Link>, or on any booking&apos;s handover step.</p>
      </div>
    </div>
  );
}
