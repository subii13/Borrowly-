import { formatINR } from "@/lib/money";

type Point = { label: string; gross: number; net: number };

/** Server-rendered SVG bar chart (no client JS). Values are paise straight from the database. */
export function EarningsChart({ data, title }: { data: Point[]; title: string }) {
  const max = Math.max(...data.map((d) => d.gross), 1);
  const W = 640, H = 220, pad = 28, gap = 14;
  const bw = (W - pad * 2 - gap * (data.length - 1)) / data.length;
  const empty = data.every((d) => d.gross === 0);
  return (
    <figure className="card p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <span className="flex gap-4 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-100" />Gross</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand" />Your earnings</span>
        </span>
      </figcaption>
      {empty ? (
        <p className="py-14 text-center text-sm text-ink-soft">No completed transactions in this period yet. Earnings appear here once rentals or sales complete.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H + 24}`} className="mt-4 w-full" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${formatINR(d.net)}`).join(", ")}`}>
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={pad} x2={W - pad} y1={H - (H - 16) * t} y2={H - (H - 16) * t} stroke="#ECE3D7" strokeDasharray="3 4" />
          ))}
          {data.map((d, i) => {
            const x = pad + i * (bw + gap);
            const gh = ((H - 16) * d.gross) / max;
            const nh = ((H - 16) * d.net) / max;
            return (
              <g key={d.label}>
                <rect x={x} y={H - gh} width={bw} height={gh} rx={6} fill="#F6DACC" />
                <rect x={x + bw * 0.2} y={H - nh} width={bw * 0.6} height={nh} rx={5} fill="#B5482A" />
                {d.net > 0 && <text x={x + bw / 2} y={H - gh - 6} textAnchor="middle" fontSize="11" fill="#5E554D">{formatINR(d.net)}</text>}
                <text x={x + bw / 2} y={H + 18} textAnchor="middle" fontSize="12" fill="#8E847A">{d.label}</text>
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}
