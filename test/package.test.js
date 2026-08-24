import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = resolve(root, "package.json");

test("package metadata declares a web bundle and client entry", () => {
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  assert.equal(pkg.name, "dsh-prompt-optimizer");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.dsh?.bundle?.patch, "./cordis.patch.yml");
  assert.equal(pkg.dsh?.client?.platform, "web");
  assert.ok(Array.isArray(pkg.dsh?.client?.inject));
  assert.ok(pkg.exports["./client"]);
  assert.ok(pkg.exports["./optimize-remote"]);
});

test("Typert protocol is a peer dependency so Host Remotes share one marker registry", () => {
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  assert.equal(pkg.dependencies?.["@deepseek-ai/dsh-typert-protocol"], undefined);
  assert.equal(pkg.peerDependencies?.["@deepseek-ai/dsh-typert-protocol"], "^0.1.0-rc.8");
});

test("client inject edges name provider packages, not service keys", () => {
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  for (const entry of pkg.dsh?.client?.inject ?? []) {
    assert.match(entry, /^@deepseek-ai\//, `inject edge ${entry} is not a package name`);
  }
  assert.equal(pkg.peerDependencies?.["@deepseek-ai/dsh-client-ui-slots"], undefined);
});

test("required artifact files exist", () => {
  for (const file of [
    "lib/index.js",
    "lib/optimize-remote.js",
    "lib/client.js",
    "cordis.patch.yml",
    "README.md",
    "LICENSE",
  ]) {
    assert.ok(existsSync(resolve(root, file)), `missing ${file}`);
  }
});

test("cordis.patch.yml inserts the plugin row", () => {
  const patch = readFileSync(resolve(root, "cordis.patch.yml"), "utf8");
  assert.match(patch, /id: dsh-prompt-optimizer/);
  assert.match(patch, /name: 'dsh-prompt-optimizer'/);
});