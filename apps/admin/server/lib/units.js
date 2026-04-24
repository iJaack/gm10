export function parseDecimalUnits(value, decimals) {
  const input = String(value ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(input)) {
    throw new Error(`Invalid decimal amount: ${value}`);
  }
  const [whole, fraction = ''] = input.split('.');
  const padded = `${fraction}${'0'.repeat(decimals)}`.slice(0, decimals);
  return `${BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0')}`;
}

export function formatDecimalUnits(rawValue, decimals, maxFractionDigits = 6) {
  const raw = BigInt(rawValue ?? '0');
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;
  if (fraction === 0n || maxFractionDigits === 0) return whole.toString();
  const padded = fraction.toString().padStart(decimals, '0');
  const trimmed = padded.slice(0, maxFractionDigits).replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

export function addBps(rawValue, bps) {
  const raw = BigInt(rawValue ?? '0');
  return ((raw * BigInt(10_000 + bps)) + 9_999n) / 10_000n;
}
