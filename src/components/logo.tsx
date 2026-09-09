import Link from "next/link";

/** Coverage Calls triangle mark — outlined per DESIGN.md §1. */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="logo-mark-svg"
    >
      <defs>
        <linearGradient id="cc-logo-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C084FC" />
          <stop offset="1" stopColor="#7A3EF2" />
        </linearGradient>
      </defs>
      {/* Outer outlined triangle — stroke gradient, transparent center */}
      <path
        d="M16 4.5 28.5 26.5H3.5L16 4.5Z"
        fill="none"
        stroke="url(#cc-logo-grad)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Inner nested triangle stroke for double-line weight */}
      <path
        d="M16 11.5 23 24.5H9L16 11.5Z"
        fill="none"
        stroke="url(#cc-logo-grad)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/** Full lockup: uses final brand image coveragecallsfinal.png */
export function Logo({ size = 26, className = "", height }: { size?: number; className?: string; height?: number }) {
  const h = height ?? size;
  return (
    <Link className={`logo ${className}`} href="/" aria-label="Coverage Calls home" style={{ display: "inline-flex", alignItems: "center" }}>
      <img
        src="/images/coveragecallsfinal.png"
        alt="Coverage Calls"
        width={Math.round(h * 3.2)}
        height={h}
        style={{ height: h, width: "auto", objectFit: "contain", display: "block" }}
      />
    </Link>
  );
}
