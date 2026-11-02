import { BRAND, HOUSE_PATH, MARK_BOX, WINDOW_DARK, WINDOW_LIT } from "@/lib/brand";

// The mark from the Canva logo: a house with one lit and one dark window — before and after.
export function LogoMark({ size = 30, className, onDark = false }: { size?: number; className?: string; onDark?: boolean }) {
  const blue = onDark ? "#ffffff" : BRAND.blue;
  return (
    <svg
      width={(size * MARK_BOX.w) / MARK_BOX.h}
      height={size}
      viewBox={`0 0 ${MARK_BOX.w} ${MARK_BOX.h}`}
      aria-hidden="true"
      className={className}
    >
      <path d={HOUSE_PATH} fill={blue} fillRule="evenodd" />
      <rect x={WINDOW_LIT.x} y={WINDOW_LIT.y} width={WINDOW_LIT.w} height={WINDOW_LIT.h} fill={BRAND.yellow} />
      <rect x={WINDOW_DARK.x} y={WINDOW_DARK.y} width={WINDOW_DARK.w} height={WINDOW_DARK.h} fill={blue} />
    </svg>
  );
}

export function Logo({ name, onDark = false }: { name: string; onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark onDark={onDark} />
      <span className={`text-[20px] font-bold leading-none tracking-tight ${onDark ? "text-white" : "text-[#093484]"}`}>{name}</span>
    </span>
  );
}
