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
      {/* Flat background; shelves and slots retain the display structure. */}
      <rect width="1200" height="500" fill="var(--bg-secondary)" />

      {/* Shelf surface (perspective trapezoid) */}
      <polygon
        points="100,360 1100,360 1080,390 120,390"
        fill="var(--case-shelf)"
      />

      {/* Card slots — left side: 3 slots */}
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
    </svg>
  );
}
