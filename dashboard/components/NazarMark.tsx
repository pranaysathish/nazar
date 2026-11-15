// The nazar charm: the logo of the app (same design as app/icon.svg, the favicon).
export default function NazarMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} role="img" aria-label="nazar logo">
      <circle cx="16" cy="16" r="15" fill="#3ecfbb" />
      <circle cx="16" cy="16" r="10.6" fill="#ffffff" />
      <circle cx="16" cy="16" r="7.1" fill="#1f9e8f" />
      <circle cx="16" cy="16" r="3.9" fill="#0a0a0a" />
      <circle cx="17.6" cy="14.4" r="1.15" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}
