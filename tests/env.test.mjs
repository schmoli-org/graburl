import assert from "node:assert/strict";
import { test } from "node:test";

import { parseEnvFile } from "../scripts/env.mjs";

test("parses KEY=VALUE pairs", () => {
  assert.deepEqual(parseEnvFile("FOO=bar\nBAZ=qux"), { FOO: "bar", BAZ: "qux" });
});

test("strips matching single or double quotes", () => {
  assert.deepEqual(parseEnvFile('FOO="bar baz"\nQUX=\'quoted\''), {
    FOO: "bar baz",
    QUX: "quoted"
  });
});

test("ignores comments and blank lines", () => {
  assert.deepEqual(parseEnvFile("# comment\n\nFOO=bar\n  # indented comment"), {
    FOO: "bar"
  });
});

test("ignores lines without an equals sign", () => {
  assert.deepEqual(parseEnvFile("not a pair\nFOO=bar"), { FOO: "bar" });
});

test("trims whitespace around keys and values", () => {
  assert.deepEqual(parseEnvFile("  FOO  =  bar  "), { FOO: "bar" });
});

test("keeps equals signs inside values", () => {
  assert.deepEqual(parseEnvFile("TOKEN=abc=def=="), { TOKEN: "abc=def==" });
});

test("handles CRLF line endings", () => {
  assert.deepEqual(parseEnvFile("FOO=bar\r\nBAZ=qux\r\n"), {
    FOO: "bar",
    BAZ: "qux"
  });
});
