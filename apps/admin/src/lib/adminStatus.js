import { READ_STATUS } from './adminMetrics.js';

export const STATUS_LABELS = {
    [READ_STATUS.live]: 'live',
    [READ_STATUS.configured]: 'configured',
    [READ_STATUS.fallback]: 'fallback',
    [READ_STATUS.partial]: 'partial',
    [READ_STATUS.unavailable]: 'unavailable',
    [READ_STATUS.error]: 'error',
    [READ_STATUS.stale]: 'stale',
};

export const STATUS_STYLES = {
    [READ_STATUS.live]: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
    [READ_STATUS.configured]: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
    [READ_STATUS.fallback]: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    [READ_STATUS.partial]: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    [READ_STATUS.unavailable]: 'border-white/10 bg-white/5 text-gray-300',
    [READ_STATUS.error]: 'border-red-300/25 bg-red-300/10 text-red-100',
    [READ_STATUS.stale]: 'border-orange-300/25 bg-orange-300/10 text-orange-100',
};

export const STATUS_DOT_STYLES = {
    [READ_STATUS.live]: 'bg-emerald-300',
    [READ_STATUS.configured]: 'bg-sky-300',
    [READ_STATUS.fallback]: 'bg-amber-300',
    [READ_STATUS.partial]: 'bg-amber-300',
    [READ_STATUS.unavailable]: 'bg-gray-500',
    [READ_STATUS.error]: 'bg-red-300',
    [READ_STATUS.stale]: 'bg-orange-300',
};

export function statusLabel(status) {
    return STATUS_LABELS[status] ?? STATUS_LABELS[READ_STATUS.unavailable];
}
