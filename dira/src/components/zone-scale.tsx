// The zone scale: eleven tonal zones from black to white (after Ansel Adams' Zone System),
// with bars showing how much of the photo falls in each. Real measurements, not decoration.

const ZONE_GRAYS = Array.from({ length: 11 }, (_, i) => {
  // Mid-point L* of each zone -> sRGB grey.
  const L = ((i + 0.5) * 100) / 11;
  const y = L > 8 ? Math.pow((L + 16) / 116, 3) : (L * 27) / 24389;
  const c = y <= 0.0031308 ? y * 12.92 : 1.055 * Math.pow(y, 1 / 2.4) - 0.055;
  const v = Math.round(c * 255);
  return `rgb(${v} ${v} ${v})`;
});

type Props = {
  rows: { label: string; zones: number[]; tone: "muted" | "accent" }[];
  caption?: string;
  dark?: boolean;
  /** Text equivalent for screen readers. */
  summary: string;
};

export function ZoneScale({ rows, caption, dark = false, summary }: Props) {
  const max = Math.max(0.0001, ...rows.flatMap((r) => r.zones));
  return (
    <figure className="m-0">
      <div role="img" aria-label={summary} className="grid gap-2" dir="ltr">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[3.5rem_1fr] items-end gap-3">
            <span className={`text-[12.5px] font-semibold ${dark ? "text-white/70" : "text-ink-3"}`}>{r.label}</span>
            <div className="grid h-12 grid-cols-11 items-end gap-[3px]">
              {r.zones.map((z, i) => (
                <div
                  key={i}
                  className={`rounded-t-[2px] ${r.tone === "accent" ? (dark ? "bg-[#9db4ee]" : "bg-prussian") : dark ? "bg-white/35" : "bg-ink-3/45"}`}
                  style={{ height: `${Math.max(2, (z / max) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[3.5rem_1fr] gap-3">
          <span />
          <div className="grid h-3 grid-cols-11 gap-[3px]" aria-hidden="true">
            {ZONE_GRAYS.map((g, i) => (
              <div key={i} className="rounded-[2px]" style={{ background: g, boxShadow: i > 8 ? "inset 0 0 0 1px rgb(0 0 0 / 0.08)" : undefined }} />
            ))}
          </div>
        </div>
      </div>
      {caption && <figcaption className={`mt-3 text-[13px] ${dark ? "text-white/60" : "text-ink-3"}`}>{caption}</figcaption>}
    </figure>
  );
}
