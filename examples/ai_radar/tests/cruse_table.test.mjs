// Checks that a table widget a model sends with object columns or object rows becomes the
// plain lists the runtime renders, instead of failing ("Render Cruse could not complete").
// Run from the repository root: node --test "examples/ai_radar/tests/*.test.mjs"
import assert from "node:assert/strict";
import test from "node:test";
import { normalizePresentation } from "../runtime/cruse.js";

test("a table with object columns and object rows is turned into plain lists", () => {
  const { presentation, issues } = normalizePresentation({
    version: 1,
    components: [{
      kind: "table",
      id: "hackathons",
      columns: [{ key: "name", label: "Hackathon" }, { key: "prize", label: "Prize" }, { key: "left", label: "Time left" }],
      rows: [
        { name: "Kiroween 2026", prize: "$100,000", left: "14 days" },
        { name: { text: "Codegeist 2026" }, prize: 120000 },
      ],
    }],
  });
  assert.deepEqual(issues, []);
  const [table] = presentation.components;
  assert.deepEqual(table.columns, ["Hackathon", "Prize", "Time left"]);
  assert.deepEqual(table.rows, [["Kiroween 2026", "$100,000", "14 days"], ["Codegeist 2026", 120000, null]]);
});

test("a table in the expected form is unchanged, and a broken one says what form it needs", () => {
  const good = normalizePresentation({ version: 1, components: [{ kind: "table", id: "t", columns: ["Name", "Prize"], rows: [["Kiroween", "$100,000"]] }] });
  assert.deepEqual(good.presentation.components[0].rows, [["Kiroween", "$100,000"]]);
  const bad = normalizePresentation({ version: 1, components: [{ kind: "table", id: "t", columns: [{ key: "x" }, 7], rows: [] }] });
  assert.equal(bad.presentation, null);
  assert.match(bad.issues[0], /"columns":\["Name","Prize"\]/);
});
