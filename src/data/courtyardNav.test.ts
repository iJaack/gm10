import { describe, expect, it } from 'vitest';
import { extractCourtyardNetWorthUsd, parseMoneyAmount } from './courtyardNav';

describe('courtyard profile NAV parsing', () => {
    it('extracts net worth from a labeled profile payload', () => {
        const html = '<script>{"props":{"netWorth":"$346.25","collection":"gm10xyz"}}</script>';

        expect(extractCourtyardNetWorthUsd(html)).toBe(346.25);
    });

    it('extracts compact money suffixes near net worth labels', () => {
        const html = '<main><h2>Net worth</h2><div class="value">$1.2K</div></main>';

        expect(extractCourtyardNetWorthUsd(html)).toBe(1200);
    });

    it('returns undefined for malformed or missing profile values', () => {
        expect(extractCourtyardNetWorthUsd('<main>No profile total</main>')).toBeUndefined();
    });

    it('parses money suffixes', () => {
        expect(parseMoneyAmount('2.5', 'M')).toBe(2_500_000);
        expect(parseMoneyAmount('3,000')).toBe(3000);
    });
});
