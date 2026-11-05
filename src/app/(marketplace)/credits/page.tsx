import type { Metadata } from "next";
import credits from "../../../../public/images/credits.json";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Image credits" };

type Credit = { key: string; file: string; title: string; license: string; licenseUrl?: string; artist: string; page: string };

export default function CreditsPage() {
  const list = Object.values(credits as Record<string, Credit>);
  return (
    <ContentPage eyebrow="Credits" title="Image credits" intro="Demo photography is sourced from Wikimedia Commons under free licences, resized and cropped to a consistent 4:3 format. Thank you to the photographers below.">
      <ul className="!list-none !pl-0 divide-y divide-line rounded-2xl border border-line bg-white text-sm">
        {list.map((c) => (
          <li key={c.key} className="flex flex-col gap-0.5 p-4 sm:flex-row sm:justify-between">
            <span className="font-medium text-ink">{c.key}</span>
            <span>
              <a href={c.page} target="_blank" rel="noreferrer">{c.title.replace(/^File:/, "")}</a> · {c.artist} ·{" "}
              {c.licenseUrl ? <a href={c.licenseUrl} target="_blank" rel="noreferrer">{c.license}</a> : c.license}
            </span>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
