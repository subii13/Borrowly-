export function ContentPage({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-14">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-2 text-4xl font-bold">{title}</h1>
      {intro && <p className="mt-4 text-lg text-ink-soft">{intro}</p>}
      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink-soft [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_a]:text-forest [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
    </div>
  );
}
