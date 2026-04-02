import { useEffect, useRef, useState } from 'react';

// Historical data points (approximate collectibles/Pokémon card market CAGR)
// Sources: PwC/UBS Art Market Report, PWCC indexes, Knight Frank Luxury Index
const HISTORICAL: { year: number; value: number }[] = [
    { year: 2018, value: 100 },
    { year: 2019, value: 115 },
    { year: 2020, value: 195 },   // COVID boom
    { year: 2021, value: 340 },   // Peak frenzy
    { year: 2022, value: 260 },   // Correction
    { year: 2023, value: 290 },
    { year: 2024, value: 340 },
    { year: 2025, value: 385 },
    { year: 2026, value: 420 },
];

// Conservative forecast (10-15% CAGR for trophy-grade)
const FORECAST: { year: number; value: number }[] = [
    { year: 2026, value: 420 },
    { year: 2027, value: 470 },
    { year: 2028, value: 530 },
    { year: 2029, value: 595 },
    { year: 2030, value: 665 },
];

const ALL_YEARS = [...new Set([...HISTORICAL, ...FORECAST].map((d) => d.year))].sort();
const ALL_VALUES = [...HISTORICAL, ...FORECAST].map((d) => d.value);
const MIN_VAL = 0;
const MAX_VAL = Math.max(...ALL_VALUES) * 1.05;

function toSVG(
    year: number,
    value: number,
    width: number,
    height: number,
    padding: { top: number; right: number; bottom: number; left: number },
) {
    const x =
        padding.left +
        ((year - ALL_YEARS[0]) / (ALL_YEARS[ALL_YEARS.length - 1] - ALL_YEARS[0])) *
            (width - padding.left - padding.right);
    const y =
        padding.top +
        (1 - (value - MIN_VAL) / (MAX_VAL - MIN_VAL)) * (height - padding.top - padding.bottom);
    return { x, y };
}

function makePath(
    data: { year: number; value: number }[],
    width: number,
    height: number,
    padding: { top: number; right: number; bottom: number; left: number },
) {
    return data
        .map((d, i) => {
            const { x, y } = toSVG(d.year, d.value, width, height, padding);
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');
}

export default function CAGRChart() {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { threshold: 0.3 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const W = 800;
    const H = 340;
    const pad = { top: 24, right: 20, bottom: 36, left: 44 };

    const historicalPath = makePath(HISTORICAL, W, H, pad);
    const forecastPath = makePath(FORECAST, W, H, pad);

    // Area fill under historical
    const firstH = toSVG(HISTORICAL[0].year, HISTORICAL[0].value, W, H, pad);
    const lastH = toSVG(HISTORICAL[HISTORICAL.length - 1].year, HISTORICAL[HISTORICAL.length - 1].value, W, H, pad);
    const histArea = `${historicalPath} L${lastH.x},${H - pad.bottom} L${firstH.x},${H - pad.bottom} Z`;

    // Year labels
    const labelYears = [2018, 2020, 2022, 2024, 2026, 2028, 2030];

    return (
        <div ref={ref} className="bg-[var(--bg-secondary)] px-4 py-10 transition-colors md:px-8 md:py-14">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="label-font">📈 Collectibles Market Growth</div>
                    <div className="mt-1 text-[0.92rem] text-[var(--text-secondary)]">
                        Indexed to 100 (2018). Trophy-grade Pokémon cards.
                    </div>
                </div>
                <div className="flex items-center gap-4 text-[0.75rem]">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-0.5 w-4 rounded bg-[var(--accent-blue)]" /> Historical
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-0.5 w-4 rounded bg-[var(--accent)] opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(90deg, var(--accent) 0 4px, transparent 4px 8px)' }} /> Forecast
                    </span>
                </div>
            </div>

            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                style={{ overflow: 'visible' }}
            >
                {/* Grid lines */}
                {[100, 200, 300, 400, 500, 600].map((val) => {
                    const { y } = toSVG(2018, val, W, H, pad);
                    if (y < pad.top || y > H - pad.bottom) return null;
                    return (
                        <g key={val}>
                            <line
                                x1={pad.left}
                                x2={W - pad.right}
                                y1={y}
                                y2={y}
                                stroke="var(--border)"
                                strokeWidth="1"
                            />
                            <text
                                x={pad.left - 8}
                                y={y + 3}
                                textAnchor="end"
                                fill="var(--text-tertiary)"
                                fontSize="9"
                                fontFamily="Inter, sans-serif"
                            >
                                {val}
                            </text>
                        </g>
                    );
                })}

                {/* Year labels */}
                {labelYears.map((yr) => {
                    const { x } = toSVG(yr, 0, W, H, pad);
                    return (
                        <text
                            key={yr}
                            x={x}
                            y={H - pad.bottom + 20}
                            textAnchor="middle"
                            fill="var(--text-tertiary)"
                            fontSize="9"
                            fontFamily="Inter, sans-serif"
                        >
                            {yr}
                        </text>
                    );
                })}

                {/* Historical area fill */}
                <path
                    d={histArea}
                    fill="var(--accent-blue)"
                    opacity="0.06"
                    className={`transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
                    style={{ opacity: visible ? 0.06 : 0 }}
                />

                {/* Historical line */}
                <path
                    d={historicalPath}
                    fill="none"
                    stroke="var(--accent-blue)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-1000"
                    style={{
                        strokeDasharray: visible ? 'none' : '2000',
                        strokeDashoffset: visible ? '0' : '2000',
                    }}
                />

                {/* Forecast line (dashed) */}
                <path
                    d={forecastPath}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="6 4"
                    opacity={visible ? 0.7 : 0}
                    className="transition-opacity duration-1000 delay-500"
                />

                {/* Data points — historical */}
                {visible && HISTORICAL.map((d) => {
                    const { x, y } = toSVG(d.year, d.value, W, H, pad);
                    return (
                        <circle
                            key={`h-${d.year}`}
                            cx={x}
                            cy={y}
                            r="3"
                            fill="var(--accent-blue)"
                            className="transition-all duration-500"
                        />
                    );
                })}

                {/* Data points — forecast */}
                {visible && FORECAST.slice(1).map((d) => {
                    const { x, y } = toSVG(d.year, d.value, W, H, pad);
                    return (
                        <circle
                            key={`f-${d.year}`}
                            cx={x}
                            cy={y}
                            r="3"
                            fill="var(--accent)"
                            opacity="0.7"
                            className="transition-all duration-500 delay-700"
                        />
                    );
                })}

                {/* CAGR annotations — positioned in empty chart areas */}
                {visible && (() => {
                    // Bottom-right of historical area, below the line in empty space
                    const pos = toSVG(2023.5, 150, W, H, pad);
                    return (
                        <text
                            x={pos.x}
                            y={pos.y}
                            fill="var(--accent-blue)"
                            fontSize="13"
                            fontWeight="700"
                            fontFamily="Inter, sans-serif"
                            textAnchor="middle"
                            className="transition-opacity duration-500 delay-700"
                        >
                            ~20% CAGR (2018–2026)
                        </text>
                    );
                })()}

                {visible && (() => {
                    // Above the forecast line, left-aligned near 2028
                    const pos = toSVG(2028.5, 590, W, H, pad);
                    return (
                        <text
                            x={pos.x}
                            y={pos.y - 20}
                            fill="var(--accent)"
                            fontSize="12"
                            fontWeight="700"
                            fontFamily="Inter, sans-serif"
                            textAnchor="middle"
                            opacity="0.85"
                            className="transition-opacity duration-500 delay-1000"
                        >
                            ~12% forecast
                        </text>
                    );
                })()}
            </svg>

            <div className="mt-4 text-[0.75rem] text-[var(--text-tertiary)]">
                Sources: Heritage Auctions, PWCC Market Index, PriceCharting. Forecast is illustrative (10–15% CAGR for trophy-grade slabs). Not a guarantee.
            </div>
            </div>
        </div>
    );
}
