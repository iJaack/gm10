export default function DisplayCaseSVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 500"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <defs>
        {/* Background gradient */}
        <linearGradient id="dc-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--case-bg-top)" />
          <stop offset="100%" stopColor="var(--case-bg-bottom)" />
        </linearGradient>

        {/* Shelf reflection gradient */}
        <linearGradient id="dc-refl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--case-reflection)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--case-reflection)" stopOpacity="0" />
        </linearGradient>

        {/* Neon glow filter */}
        <filter id="dc-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Radial ambient glow — replaces hard ring strokes */}
        <radialGradient id="dc-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="var(--neon-ring)" stopOpacity="0.18" />
          <stop offset="55%"  stopColor="var(--neon-ring)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="var(--neon-ring)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. Background */}
      <rect width="1200" height="500" fill="url(#dc-bg)" />


      {/* 3. Shelf surface (perspective trapezoid) */}
      <polygon
        points="100,360 1100,360 1080,390 120,390"
        fill="var(--case-shelf)"
      />

      {/* 4. Card slots — left side: 3 slots */}
      <rect x="120" y="140" width="68" height="205" rx="2" fill="var(--card-slot)" />
      <rect x="200" y="150" width="68" height="200" rx="2" fill="var(--card-slot)" />
      <rect x="280" y="145" width="68" height="202" rx="2" fill="var(--card-slot)" />
      {/* Right side: 3 slots */}
      <rect x="852" y="145" width="68" height="202" rx="2" fill="var(--card-slot)" />
      <rect x="932" y="150" width="68" height="200" rx="2" fill="var(--card-slot)" />
      <rect x="1012" y="140" width="68" height="205" rx="2" fill="var(--card-slot)" />
      {/* Centre 3 stubs (behind real cards — very faint) */}
      <rect x="450" y="155" width="65" height="195" rx="2" fill="var(--card-slot)" opacity="0.4" />
      <rect x="570" y="148" width="65" height="205" rx="2" fill="var(--card-slot)" opacity="0.4" />
      <rect x="690" y="155" width="65" height="195" rx="2" fill="var(--card-slot)" opacity="0.4" />


      {/* 5. Ambient neon glow (soft radial, no hard ring strokes) */}
      <ellipse cx="600" cy="245" rx="320" ry="280" fill="url(#dc-halo)" />


      {/* 7. Floor reflection below shelf */}
      <polygon
        points="130,390 1070,390 1050,450 150,450"
        fill="url(#dc-refl)"
      />
    </svg>
  );
}
