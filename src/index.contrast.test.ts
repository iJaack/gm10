import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const indexCss = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8');

/**
 * Forma spec Part 1, gm10 (`src/index.css`).
 *
 * Contrast uses the WCAG 2.x relative-luminance ratio. Alpha colors are
 * blended over the page background (`--bg-primary`) before the ratio is
 * computed, matching the reference contrast script. Ratios are read from the
 * stylesheet; they are not hard-coded expected results.
 */

type Rgb = { r: number; g: number; b: number; a: number };
type ThemeName = 'dark' | 'light';

type CssRule = {
    selector: string;
    declarations: Map<string, string>;
};

const TEXT_CONTRAST = 4.5;
const FOCUS_CONTRAST = 3;
const BACKGROUND_TOKENS = ['--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-elevated'] as const;
const TEXT_TOKENS = ['--text-secondary', '--text-tertiary', '--accent-text'] as const;
const ACCENT_TEXT_SELECTORS = ['.pixel-label-warning', '.pixel-message-title', '.v2-label'] as const;
const TERTIARY_LABEL_SELECTORS = ['.label-font', '.pixel-divider-label', '.pixel-stat-label', '.pixel-media-eyebrow'] as const;

const rules = parseRules(indexCss);

describe('gm10 focus token and contrast (src/index.css)', () => {
    it('defines --accent-text as #7d5800 in the light theme and #f0c030 in the dark theme', () => {
        const problems = [
            expectColor('light', '--accent-text', hexColor('#7d5800')),
            expectColor('dark', '--accent-text', hexColor('#f0c030')),
        ].filter((problem): problem is string => problem !== null);

        expect(problems).toEqual([]);
    });

    it('defines --focus as var(--accent-text) in both themes', () => {
        const problems = (['light', 'dark'] as const).flatMap((theme) => {
            const value = themeTokens(theme).get('--focus');
            if (value === undefined) return [`${theme} --focus is not defined`];
            if (!isCustomProperty(value, '--accent-text')) {
                return [`${theme} --focus is ${value}, expected var(--accent-text)`];
            }
            return [];
        });

        expect(problems).toEqual([]);
    });

    it('draws a 2px solid var(--focus) outline on :focus-visible and not on mouse :focus', () => {
        const problems: string[] = [];
        const focusVisibleRules = rules.filter((rule) => selectorTargets(rule.selector, ':focus-visible'));

        if (focusVisibleRules.length === 0) {
            problems.push('no :focus-visible rule in src/index.css');
        }

        for (const rule of focusVisibleRules) {
            if (usesFillAccent(rule)) {
                problems.push(`${rule.selector} uses var(--accent) for the focus ring`);
            }
            if (removesOutline(rule) && !hasEquivalentFocusIndicator(rule)) {
                problems.push(`${rule.selector} sets outline: none on :focus-visible without a 2px var(--focus) replacement`);
            }
            if (!hasFocusOutline(rule)) {
                const outline = rule.declarations.get('outline') ?? '(missing)';
                problems.push(`${rule.selector} outline is "${outline}", expected 2px solid var(--focus)`);
            }
        }

        for (const rule of rules) {
            if (!selectorTargets(rule.selector, ':focus') || selectorTargets(rule.selector, ':focus-visible')) continue;
            const paintsOutline = rule.declarations.has('outline') || rule.declarations.has('outline-color');
            if (!paintsOutline || removesOutline(rule)) continue;
            problems.push(`${rule.selector} paints an outline on :focus, so a mouse click shows the ring`);
        }

        expect(problems).toEqual([]);
    });

    it('raises tertiary and light secondary text alphas and keeps dark secondary at 0.58', () => {
        const problems = [
            expectColor('dark', '--text-tertiary', rgbaColor(245, 240, 232, 0.55)),
            expectColor('light', '--text-tertiary', rgbaColor(26, 21, 16, 0.66)),
            expectColor('light', '--text-secondary', rgbaColor(26, 21, 16, 0.72)),
            expectColor('dark', '--text-secondary', rgbaColor(245, 240, 232, 0.58)),
        ].filter((problem): problem is string => problem !== null);

        expect(problems).toEqual([]);
    });

    it.each(ACCENT_TEXT_SELECTORS)('%s uses var(--accent-text) for text', (selector) => {
        const color = ruleDeclaration(selector, 'color');
        expect(normalizeCustomProperty(color)).toBe('var(--accent-text)');
    });

    it('uppercase labels resolve to the corrected tertiary color in both themes', () => {
        const problems = TERTIARY_LABEL_SELECTORS.flatMap((selector) => {
            const declared = ruleDeclaration(selector, 'color');
            return (['dark', 'light'] as const).flatMap((theme) => {
                const expected = theme === 'dark'
                    ? rgbaColor(245, 240, 232, 0.55)
                    : rgbaColor(26, 21, 16, 0.66);
                const resolved = declared ? resolveColor(declared, themeTokens(theme)) : null;
                if (resolved && sameColor(resolved, expected)) return [];
                return [
                    `${selector} in ${theme} is ${declared ?? 'missing'} -> ${resolved ? formatColor(resolved) : 'unresolved'}, expected ${formatColor(expected)}`,
                ];
            });
        });

        expect(problems).toEqual([]);
    });

    it('parsed text tokens meet 4.5:1 on bg, secondary, tertiary, and elevated backgrounds', () => {
        const report = contrastReport(TEXT_TOKENS, TEXT_CONTRAST);
        expect(report.failures, report.measured.join('\n')).toEqual([]);
    });

    it('parsed --focus meets 3:1 on bg, secondary, tertiary, and elevated backgrounds', () => {
        const report = contrastReport(['--focus'], FOCUS_CONTRAST);
        const outlineColor = focusVisibleOutlineColor();
        if (outlineColor) {
            for (const theme of ['dark', 'light'] as const) {
                report.measured.push(...measureResolved(theme, `current :focus-visible outline ${outlineColor}`, outlineColor, FOCUS_CONTRAST).measured);
                if (!themeTokens(theme).has('--focus')) {
                    report.failures.push(
                        ...measureResolved(theme, `current :focus-visible outline ${outlineColor}`, outlineColor, FOCUS_CONTRAST).failures,
                    );
                }
            }
        }
        expect(report.failures, report.measured.join('\n')).toEqual([]);
    });
});

function contrastReport(tokens: readonly string[], minimum: number): { measured: string[]; failures: string[] } {
    const measured: string[] = [];
    const failures: string[] = [];
    for (const theme of ['dark', 'light'] as const) {
        for (const token of tokens) {
            const raw = themeTokens(theme).get(token);
            if (raw === undefined) {
                failures.push(`${theme} ${token} is not defined`);
                continue;
            }
            const result = measureResolved(theme, `${token} ${raw}`, raw, minimum);
            measured.push(...result.measured);
            failures.push(...result.failures);
        }
    }
    return { measured, failures };
}

function measureResolved(theme: ThemeName, label: string, raw: string, minimum: number): { measured: string[]; failures: string[] } {
    const measured: string[] = [];
    const failures: string[] = [];
    const tokens = themeTokens(theme);
    const pageRaw = tokens.get('--bg-primary');
    const page = pageRaw ? resolveColor(pageRaw, tokens) : null;
    if (!page || page.a < 1) {
        failures.push(`${theme} --bg-primary is missing or not an opaque page background`);
        return { measured, failures };
    }

    const foreground = resolveColor(raw, tokens);
    if (!foreground) {
        failures.push(`${theme} ${label} could not be parsed`);
        return { measured, failures };
    }
    const ink = opaqueOver(foreground, page);

    for (const backgroundToken of BACKGROUND_TOKENS) {
        const backgroundRaw = tokens.get(backgroundToken);
        const background = backgroundRaw ? resolveColor(backgroundRaw, tokens) : null;
        if (!backgroundRaw || !background) {
            failures.push(`${theme} ${backgroundToken} is missing`);
            continue;
        }
        const surface = opaqueOver(background, page);
        const ratio = contrastRatio(ink, surface);
        const line = `${theme} ${label} on ${backgroundToken} ${backgroundRaw} = ${ratio.toFixed(2)}:1`;
        measured.push(line);
        if (ratio + 1e-9 < minimum) failures.push(`${line} is below ${minimum.toFixed(1)}:1`);
    }
    return { measured, failures };
}

function expectColor(theme: ThemeName, token: string, expected: Rgb): string | null {
    const raw = themeTokens(theme).get(token);
    if (raw === undefined) return `${theme} ${token} is not defined`;
    const parsed = resolveColor(raw, themeTokens(theme));
    if (!parsed || !sameColor(parsed, expected)) {
        return `${theme} ${token} is ${raw}${parsed ? ` (${formatColor(parsed)})` : ''}, expected ${formatColor(expected)}`;
    }
    return null;
}

function themeTokens(theme: ThemeName): Map<string, string> {
    const tokens = new Map<string, string>();
    for (const rule of rules) {
        if (!selectorMatchesTheme(rule.selector, theme)) continue;
        for (const [property, value] of rule.declarations) {
            if (property.startsWith('--')) tokens.set(property, value);
        }
    }
    return tokens;
}

function selectorMatchesTheme(selector: string, theme: ThemeName): boolean {
    return selectorList(selector).some((part) => {
        if (part === ':root') return true;
        const themeSelector = theme === 'dark' ? 'dark' : 'light';
        return part === `[data-theme='${themeSelector}']` || part === `[data-theme="${themeSelector}"]`;
    });
}

function ruleDeclaration(selector: string, property: string): string | undefined {
    const wanted = normalizeSelector(selector);
    const match = [...rules].reverse().find((rule) => selectorList(rule.selector).includes(wanted));
    return match?.declarations.get(property);
}

function focusVisibleOutlineColor(): string | undefined {
    const rule = [...rules].reverse().find((candidate) => selectorTargets(candidate.selector, ':focus-visible'));
    const outline = rule?.declarations.get('outline') ?? rule?.declarations.get('outline-color');
    if (!outline) return undefined;
    return outline.match(/var\(\s*--[\w-]+\s*\)|#[0-9a-f]{3,8}|rgba?\([^)]+\)/i)?.[0];
}

function selectorTargets(selector: string, pseudo: ':focus' | ':focus-visible'): boolean {
    return selectorList(selector).some((part) => {
        if (pseudo === ':focus-visible') return part.includes(':focus-visible');
        return /:focus(?!-visible)/.test(part);
    });
}

function usesFillAccent(rule: CssRule): boolean {
    return [...rule.declarations.values()].some((value) => /var\(\s*--accent\s*\)/.test(value));
}

function removesOutline(rule: CssRule): boolean {
    const outline = rule.declarations.get('outline')?.trim().toLowerCase();
    const style = rule.declarations.get('outline-style')?.trim().toLowerCase();
    return outline === 'none' || outline === '0' || outline === '0px' || style === 'none';
}

function hasFocusOutline(rule: CssRule): boolean {
    const outline = rule.declarations.get('outline')?.replace(/\s+/g, ' ').trim();
    if (outline && /^2px solid var\(\s*--focus\s*\)$/i.test(outline)) return true;
    const width = rule.declarations.get('outline-width')?.trim();
    const style = rule.declarations.get('outline-style')?.trim().toLowerCase();
    const color = rule.declarations.get('outline-color')?.trim();
    return width === '2px' && style === 'solid' && !!color && isCustomProperty(color, '--focus');
}

function hasEquivalentFocusIndicator(rule: CssRule): boolean {
    if (hasFocusOutline(rule)) return true;
    const shadow = rule.declarations.get('box-shadow')?.replace(/\s+/g, ' ') ?? '';
    return /var\(\s*--focus\s*\)/.test(shadow) && /(?:^|[^\d.])2px(?:[^\d.]|$)/.test(shadow);
}

function isCustomProperty(value: string | undefined, name: string): boolean {
    return normalizeCustomProperty(value) === `var(${name})`;
}

function normalizeCustomProperty(value: string | undefined): string {
    if (!value) return 'missing';
    const reference = value.trim().match(/^var\(\s*(--[\w-]+)\s*\)$/);
    return reference?.[1] ? `var(${reference[1]})` : value.trim();
}

function resolveColor(value: string, tokens: Map<string, string>, seen = new Set<string>()): Rgb | null {
    const trimmed = value.trim();
    const reference = trimmed.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/);
    if (reference) {
        const name = reference[1];
        if (!name || seen.has(name)) return null;
        seen.add(name);
        const next = tokens.get(name);
        if (next) return resolveColor(next, tokens, seen);
        return reference[2] ? resolveColor(reference[2], tokens, seen) : null;
    }
    return parseColor(trimmed);
}

function parseColor(value: string): Rgb | null {
    const hex = value.match(/^#([0-9a-f]{3,8})$/i);
    if (hex?.[1]) {
        const digits = hex[1];
        const expanded = digits.length <= 4
            ? [...digits].map((channel) => channel + channel).join('')
            : digits;
        if (expanded.length !== 6 && expanded.length !== 8) return null;
        return {
            r: Number.parseInt(expanded.slice(0, 2), 16),
            g: Number.parseInt(expanded.slice(2, 4), 16),
            b: Number.parseInt(expanded.slice(4, 6), 16),
            a: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
        };
    }

    const rgb = value.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)$/i);
    if (!rgb?.[1] || !rgb[2] || !rgb[3]) return null;
    return {
        r: Number(rgb[1]),
        g: Number(rgb[2]),
        b: Number(rgb[3]),
        a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
}

function opaqueOver(color: Rgb, page: Rgb): Rgb {
    if (color.a >= 1 - 1e-6) return { r: color.r, g: color.g, b: color.b, a: 1 };
    return {
        r: quantize(color.a * color.r + (1 - color.a) * page.r),
        g: quantize(color.a * color.g + (1 - color.a) * page.g),
        b: quantize(color.a * color.b + (1 - color.a) * page.b),
        a: 1,
    };
}

/** Python 3 round-half-to-even, used by the reference contrast script. */
function quantize(channel: number): number {
    const floor = Math.floor(channel);
    const fraction = channel - floor;
    if (Math.abs(fraction - 0.5) < 1e-6) return floor % 2 === 0 ? floor : floor + 1;
    return Math.round(channel);
}

function relativeLuminance(color: Rgb): number {
    const channel = (value: number) => {
        const srgb = value / 255;
        return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
    const lighter = relativeLuminance(foreground);
    const darker = relativeLuminance(background);
    const [high, low] = lighter >= darker ? [lighter, darker] : [darker, lighter];
    return (high + 0.05) / (low + 0.05);
}

function sameColor(actual: Rgb, expected: Rgb): boolean {
    return Math.abs(actual.r - expected.r) < 0.01
        && Math.abs(actual.g - expected.g) < 0.01
        && Math.abs(actual.b - expected.b) < 0.01
        && Math.abs(actual.a - expected.a) < 1e-6;
}

function formatColor(color: Rgb): string {
    const channels = `${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}`;
    if (color.a >= 1 - 1e-6) return `rgb(${channels})`;
    return `rgba(${channels}, ${Number(color.a.toFixed(4))})`;
}

function hexColor(hex: string): Rgb {
    const parsed = parseColor(hex);
    if (!parsed) throw new Error(`invalid fixture color ${hex}`);
    return parsed;
}

function rgbaColor(r: number, g: number, b: number, a: number): Rgb {
    return { r, g, b, a };
}

function parseRules(css: string): CssRule[] {
    const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const parsed: CssRule[] = [];
    let index = 0;

    while (index < source.length) {
        while (index < source.length && /\s/.test(source[index] ?? '')) index += 1;
        if (index >= source.length) break;
        if (source[index] === ';') {
            index += 1;
            continue;
        }

        const open = source.indexOf('{', index);
        const semicolon = source.indexOf(';', index);
        if (open === -1 || (semicolon !== -1 && semicolon < open)) {
            index = semicolon === -1 ? source.length : semicolon + 1;
            continue;
        }

        const selector = normalizeSelector(source.slice(index, open));
        let depth = 1;
        let cursor = open + 1;
        while (cursor < source.length && depth > 0) {
            if (source[cursor] === '{') depth += 1;
            else if (source[cursor] === '}') depth -= 1;
            cursor += 1;
        }
        const body = source.slice(open + 1, cursor - 1);
        if (selector.startsWith('@')) {
            if (!selector.startsWith('@keyframes') && !selector.startsWith('@font-face')) {
                parsed.push(...parseRules(body));
            }
        } else if (selector) {
            parsed.push({ selector, declarations: parseDeclarations(body) });
        }
        index = cursor;
    }

    return parsed;
}

function parseDeclarations(body: string): Map<string, string> {
    const declarations = new Map<string, string>();
    let current = '';
    let depth = 0;
    const commit = () => {
        const part = current.trim();
        current = '';
        if (!part) return;
        const colon = part.indexOf(':');
        if (colon === -1) return;
        const property = part.slice(0, colon).trim().toLowerCase();
        const value = part.slice(colon + 1).replace(/!important\s*$/i, '').trim();
        declarations.set(property, value);
    };

    for (const character of body) {
        if (character === '(' || character === '[' || character === '{') depth += 1;
        else if (character === ')' || character === ']' || character === '}') depth = Math.max(0, depth - 1);
        if (character === ';' && depth === 0) {
            commit();
            continue;
        }
        current += character;
    }
    commit();
    return declarations;
}

function selectorList(selector: string): string[] {
    return selector.split(',').map((part) => part.trim()).filter(Boolean);
}

function normalizeSelector(selector: string): string {
    return selector.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
}
