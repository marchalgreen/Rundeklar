import assert from 'node:assert/strict';
import test from 'node:test';

import {
  scaffoldNormalizationAdapter,
  validateNormalizationAdapter,
} from '../../scripts/vendors/sdk.ts';

test.skip('scaffoldNormalizationAdapter builds plan for new vendor', async () => {});

test('scaffoldNormalizationAdapter rejects duplicates without --force', async () => {
  await assert.rejects(() =>
    scaffoldNormalizationAdapter({
      slug: 'moscot',
      dryRun: true,
    }),
  );
});

test('validateNormalizationAdapter confirms MOSCOT registration', async () => {
  const result = await validateNormalizationAdapter({ slug: 'moscot' });
  assert.equal(result.ok, true);
  assert(result.checks.some((check) => check.name === 'adapter registered in index' && check.ok));
});
