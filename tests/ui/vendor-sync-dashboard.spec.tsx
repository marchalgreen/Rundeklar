import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  HealthSummaryContent,
  type HealthSummaryContentProps,
} from '../../packages/web/src/components/vendor-sync/HealthSummary';
import {
  TrendBlocksContent,
  buildSparklineCells,
} from '../../packages/web/src/components/vendor-sync/TrendBlocks';

const sampleSummary: HealthSummaryContentProps = {
  metrics: {
    last24h: { total: 10, success: 6, failed: 3, avgDurationMs: 1500 },
    inProgress: [{ vendor: 'moscot', runId: 'run-1', startedAt: new Date().toISOString(), mode: 'preview' }],
  },
  loading: false,
  refreshing: false,
  error: null,
  onRefresh: () => Promise.resolve(),
  updatedAt: new Date('2024-04-01T10:00:00Z'),
};

test('HealthSummaryContent renders core metrics', () => {
  const markup = renderToStaticMarkup(<HealthSummaryContent {...sampleSummary} />);
  assert.ok(markup.includes('Succes (24t)'));
  assert.ok(markup.includes('6'));
  assert.ok(markup.includes('Fejl (24t)'));
  assert.ok(markup.includes('3'));
  assert.ok(markup.includes('I gang'));
});

test('TrendBlocksContent shows vendor sparkline characters', () => {
  const histories = [
    {
      vendor: 'moscot',
      runs: [
        { runId: 'a', status: 'success', totalItems: 5, durationMs: 1000, finishedAt: '2024-04-01T10:05:00Z' },
        { runId: 'b', status: 'error', totalItems: 3, durationMs: 500, finishedAt: '2024-03-30T09:05:00Z' },
        { runId: 'c', status: 'running', totalItems: null, durationMs: null, finishedAt: null },
      ],
    },
  ];
  const markup = renderToStaticMarkup(
    <TrendBlocksContent histories={histories} loading={false} error={null} />,
  );
  assert.ok(markup.includes('moscot'));
  assert.ok(markup.includes('✔︎'));
  assert.ok(markup.includes('✖︎'));
  assert.ok(markup.includes('▹'));
});

test('buildSparklineCells normalizes durations', () => {
  const cells = buildSparklineCells([
    { runId: '1', status: 'success', totalItems: 10, durationMs: 1000, finishedAt: '2024-01-01T00:00:00Z' },
    { runId: '2', status: 'success', totalItems: 10, durationMs: 5000, finishedAt: '2024-01-02T00:00:00Z' },
    { runId: '3', status: 'running', totalItems: null, durationMs: null, finishedAt: null },
  ]);
  assert.equal(cells.length, 3);
  assert.notEqual(cells[0].char, cells[1].char);
  assert.equal(cells[2].char, '▸');
});
