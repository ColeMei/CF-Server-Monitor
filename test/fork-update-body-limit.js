import assert from 'node:assert/strict';
import { handleUpdate, UPDATE_MAX_REQUEST_BYTES } from '../src/handlers/update.js';

// D1 must never be reached by an oversized or unauthenticated report.
const untouchedEnv = () => {
  const state = { touched: false };
  return {
    state,
    env: {
      API_SECRET: 'secret',
      DB: { prepare() { state.touched = true; throw new Error('D1 must not be touched'); } }
    }
  };
};
const ctx = { waitUntil() {} };
const post = (body, headers = {}, extra = {}) => new Request('https://example.com/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body,
  ...extra
});
const chunkedBody = (totalBytes, chunkBytes = 64 * 1024) => {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= totalBytes) { controller.close(); return; }
      const n = Math.min(chunkBytes, totalBytes - sent);
      controller.enqueue(new Uint8Array(n).fill(0x20));
      sent += n;
    }
  });
};

// 1. Declared Content-Length over the limit: rejected before parsing.
{
  const { env, state } = untouchedEnv();
  const res = await handleUpdate(post('{}', { 'Content-Length': String(UPDATE_MAX_REQUEST_BYTES + 1) }), env, ctx);
  assert.equal(res.status, 413);
  assert.equal(res.headers.get('X-CFSM-Agent-Status'), 'payload_too_large');
  assert.equal(state.touched, false);
}

// 2. Chunked body with no Content-Length over the limit: upstream's header check misses this.
{
  const { env, state } = untouchedEnv();
  const req = post(chunkedBody(UPDATE_MAX_REQUEST_BYTES + 4096), {}, { duplex: 'half' });
  assert.equal(req.headers.get('Content-Length'), null);
  const res = await handleUpdate(req, env, ctx);
  assert.equal(res.status, 413);
  assert.equal(state.touched, false);
}

// 3. A realistic schema-v3 report (60 samples x 5 latency targets) passes the guard and
//    reaches the secret check.
{
  const latency = Object.fromEntries(['MEL', 'MYS', 'TYO', 'USW', 'CN'].map(t => [t, { ms: 123.4, loss: 0 }]));
  const metrics = { cpu: 12.5, mem: 40.1, disk: 38, rx: 123456789, tx: 987654321, latency_profile: 'melbourne-global-v1', latency };
  const report = {
    id: 'body-limit-test', secret: 'wrong', metrics,
    samples: Array.from({ length: 60 }, (_, i) => ({ ts: 1795356216000 + i * 1000, metrics })),
    collect_interval: 1, report_interval: 60
  };
  const body = JSON.stringify(report);
  assert.ok(body.length < UPDATE_MAX_REQUEST_BYTES / 4, `realistic report is ${body.length} bytes`);
  const { env, state } = untouchedEnv();
  const res = await handleUpdate(post(body), env, ctx);
  assert.equal(res.status, 401);
  assert.equal(state.touched, false);
}

// 4. Invalid JSON still takes the pre-existing error path, not 413.
{
  const { env } = untouchedEnv();
  const res = await handleUpdate(post('{not json'), env, ctx);
  assert.notEqual(res.status, 413);
}

console.log('fork update body limit: ok');
