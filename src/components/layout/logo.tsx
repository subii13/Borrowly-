import Link from "next/link";

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Borrowly home">
      <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
        <rect width="64" height="64" rx="16" fill={tone === "dark" ? "#245C46" : "#F7F7F4"} />
        <path
          d="M20 16h14.5c7.2 0 11.5 3.6 11.5 9.2 0 3.6-1.9 6.3-5 7.5 4 1.1 6.5 4.2 6.5 8.4 0 6.4-4.8 10.9-12.6 10.9H20V16Zm8 6.6v8.2h5.6c2.9 0 4.4-1.5 4.4-4.1s-1.6-4.1-4.5-4.1H28Zm0 14.4v8.4h6.4c3.1 0 4.9-1.6 4.9-4.2 0-2.6-1.8-4.2-4.9-4.2H28Z"
          fill={tone === "dark" ? "#F7F7F4" : "#245C46"}
        />
      </svg>
      <span className={`font-display text-xl font-extrabold tracking-tight ${tone === "dark" ? "text-ink" : "text-white"}`}>Borrowly</span>
    </Link>
  );
}
