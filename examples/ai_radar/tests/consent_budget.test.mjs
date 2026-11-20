// Checks that the time a consent card waits for the visitor does not use up the question's
// 90-second budget: otherwise a visitor who reads the card for a while gets "Skipped <partner>:
// the composition deadline was reached" right after they agree.
// Run from the repository root: node --test "examples/ai_radar/tests/*.test.mjs"
import assert from "node:assert/strict";
import test from "node:test";
import { dispatchToolCall } from "../runtime/runner.js";

test("the query's deadline moves on by the time the visitor took to answer the card", async () => {
  const deadline = Date.now() + 50;
  const composition = { remoteCalls: 0, peerCalls: new Map(), maxRemoteCalls: 4, maxCallsPerPeer: 1, agentCalls: 0, maxAgentCalls: 24, deadline };
  const ctx = {
    baseOrigin: "http://127.0.0.1:8094",
    composition,
    trace: { note() {}, start() { return "s"; }, end() {}, update() {} },
    // The visitor reads the card for 150 ms, then declines, so nothing is fetched.
    requestConsent: () => new Promise((resolve) => setTimeout(() => resolve("decline"), 150)),
  };
  const answer = await dispatchToolCall(ctx, { kind: "remote", url: "https://partner.example/partner_network", label: "Partner" }, { request: "x" }, null, []);
  assert.match(String(answer), /declined/);
  assert.ok(composition.deadline >= deadline + 140, "The card's waiting time is added back.");
});
