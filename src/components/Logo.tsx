interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <clipPath id="logo-circle">
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>

      {/* Background */}
      <circle cx="50" cy="50" r="48" fill="var(--logo-mountain)" />

      {/* Geodesic dome facets — top half */}
      <g clipPath="url(#logo-circle)">
        {/* Centre top triangle */}
        <polygon points="50,4 35,28 65,28"        fill="var(--logo-dome-light)" stroke="var(--logo-dome-line)" strokeWidth="0.8" />
        {/* Row 2 — 4 triangles */}
        <polygon points="50,4 20,28 35,28"         fill="var(--logo-dome-dark)"  stroke="var(--logo-dome-line)" strokeWidth="0.8" />
        <polygon points="50,4 65,28 80,28"         fill="var(--logo-dome-dark)"  stroke="var(--logo-dome-line)" strokeWidth="0.8" />
        <polygon points="35,28 20,28 28,50"        fill="var(--logo-dome-light)" stroke="var(--logo-dome-line)" strokeWidth="0.8" />
        <polygon points="65,28 80,28 72,50"        fill="var(--logo-dome-light)" stroke="var(--logo-dome-line)" strokeWidth="0.8" />
        {/* Row 3 — wider triangles toward horizon */}
        <polygon points="35,28 65,28 50,50"        fill="var(--logo-dome-dark)"  stroke="var(--logo-dome-line)" strokeWidth="0.8" />
        <polygon points="20,28 28,50 4,44"         fill="var(--logo-dome-dark)"  stroke="var(--logo-dome-line)" strokeWidth="0.8" />
        <polygon points="80,28 96,44 72,50"        fill="var(--logo-dome-dark)"  stroke="var(--logo-dome-line)" strokeWidth="0.8" />
        <polygon points="4,44 28,50 14,62"         fill="var(--logo-dome-light)" stroke="var(--logo-dome-line)" strokeWidth="0.8" />
        <polygon points="96,44 86,62 72,50"        fill="var(--logo-dome-light)" stroke="var(--logo-dome-line)" strokeWidth="0.8" />

        {/* Horizontal divider band */}
        <rect x="2" y="47" width="96" height="8" fill="var(--logo-divider)" opacity="0.9" />

        {/* Mountain silhouette — bottom half */}
        <path
          d="M2,55 L2,98 L98,98 L98,55 L85,55 L72,72 L62,60 L50,80 L38,60 L28,72 L15,55 Z"
          fill="var(--logo-mountain)"
        />

        {/* Snow caps */}
        <path
          d="M62,60 L50,80 L38,60 L42,65 L50,74 L58,65 Z"
          fill="rgba(200,220,255,0.15)"
        />
      </g>

      {/* Outer circle stroke */}
      <circle cx="50" cy="50" r="48" stroke="var(--logo-divider)" strokeWidth="1.5" fill="none" />

      {/* Center button ring */}
      <circle cx="50" cy="51" r="9"  fill="var(--logo-button-ring)" />
      {/* Center button */}
      <circle cx="50" cy="51" r="6"  fill="var(--logo-button)" />
      <circle cx="50" cy="51" r="3.5" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}
