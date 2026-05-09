import test from 'node:test';
import assert from 'node:assert/strict';

import { READ_STATUS } from '../src/lib/adminMetrics.js';
import { STATUS_DOT_STYLES, STATUS_STYLES, statusLabel } from '../src/lib/adminStatus.js';

test('status chips have labels and visual classes for every read state', () => {
  for (const status of Object.values(READ_STATUS)) {
    assert.equal(statusLabel(status), status);
    assert.match(STATUS_STYLES[status], /border-/);
    assert.match(STATUS_DOT_STYLES[status], /bg-/);
  }
});

test('unknown status falls back to unavailable label', () => {
  assert.equal(statusLabel('not-a-real-status'), READ_STATUS.unavailable);
});
