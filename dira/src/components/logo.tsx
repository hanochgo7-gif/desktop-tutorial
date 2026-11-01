// The mark: a house with two windows, one lit and one not — the same room before and after.
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="7" fill="var(--color-prussian)" />
      <path d="M16 6.2 26.2 14.6v10.6H5.8V14.6Z" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinejoin="round" />
      <rect x="9" y="16.6" width="5.9" height="4.8" rx="1" fill="#fff" />
      <rect x="17.1" y="16.6" width="5.9" height="4.8" rx="1" fill="#fff" opacity=".38" />
    </svg>
  );
}

export function Logo({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="display text-[21px] leading-none font-medium tracking-tight">{name}</span>
    </span>
  );
}
