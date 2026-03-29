#!/usr/bin/env node
/**
 * Design Token Consistency Tests
 * Validates that generated outputs match tokens.json source of truth.
 */

const fs = require("fs");
const path = require("path");

const tokens = JSON.parse(
  fs.readFileSync(path.join(__dirname, "tokens.json"), "utf8")
);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

// --- Test CSS tokens ---
console.log("Testing css/tokens.css...");
const css = fs.readFileSync(path.join(__dirname, "css/tokens.css"), "utf8");

for (const [name, token] of Object.entries(tokens.colors)) {
  assert(
    css.includes(`--${name}: ${token.value}`),
    `CSS missing --${name}: ${token.value}`
  );
}

// --- Test Swift tokens ---
console.log("Testing swift/Theme.swift...");
const swift = fs.readFileSync(
  path.join(__dirname, "swift/Theme.swift"),
  "utf8"
);

assert(swift.includes("enum SudoTheme"), "Swift missing SudoTheme enum");
assert(swift.includes("import SwiftUI"), "Swift missing SwiftUI import");

for (const [name, token] of Object.entries(tokens.colors)) {
  const swiftName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  assert(
    swift.includes(`static let ${swiftName}`),
    `Swift missing ${swiftName} color`
  );
}

// --- Test JS tokens ---
console.log("Testing js/tokens.js...");
const js = fs.readFileSync(path.join(__dirname, "js/tokens.js"), "utf8");

for (const [name, token] of Object.entries(tokens.colors)) {
  const jsName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  assert(
    js.includes(`${jsName}: "${token.value}"`),
    `JS missing ${jsName}: "${token.value}"`
  );
}

// --- Test design rules ---
console.log("Testing design rules...");
assert(tokens.borders.radius === "0px", "Border radius must be 0px (no rounded corners)");
assert(tokens.colors.accent.value === "#00ff41", "Accent must be terminal green #00ff41");
assert(tokens.colors.bg.value === "#0a0a0a", "Background must be #0a0a0a");

// --- Results ---
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
