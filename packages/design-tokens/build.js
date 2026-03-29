#!/usr/bin/env node
/**
 * Design Token Builder
 * Reads tokens.json and generates platform-specific files:
 *   - css/tokens.css     (CSS custom properties)
 *   - swift/Theme.swift  (SwiftUI theme constants)
 *   - js/tokens.js       (JS/TS export)
 */

const fs = require("fs");
const path = require("path");

const tokens = JSON.parse(
  fs.readFileSync(path.join(__dirname, "tokens.json"), "utf8")
);

// --- CSS Output ---
function buildCSS(tokens) {
  const lines = [
    "/* AUTO-GENERATED from tokens.json — do not edit directly */",
    ":root {",
  ];

  for (const [name, token] of Object.entries(tokens.colors)) {
    lines.push(`  --${name}: ${token.value};`);
  }

  lines.push("}");
  return lines.join("\n") + "\n";
}

// --- Swift Output ---
function buildSwift(tokens) {
  const lines = [
    "// AUTO-GENERATED from tokens.json — do not edit directly",
    "import SwiftUI",
    "",
    "enum SudoTheme {",
    "    // MARK: - Colors",
  ];

  for (const [name, token] of Object.entries(tokens.colors)) {
    const swiftName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const hex = token.value.replace("#", "");

    if (hex.length === 8) {
      // Has alpha
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const a = parseInt(hex.substring(6, 8), 16);
      lines.push(
        `    static let ${swiftName} = Color(red: ${r}/255.0, green: ${g}/255.0, blue: ${b}/255.0, opacity: ${a}/255.0)`
      );
    } else {
      lines.push(`    static let ${swiftName} = Color(hex: 0x${hex.toUpperCase()})`);
    }
  }

  lines.push("");
  lines.push("    // MARK: - Typography");
  lines.push("    static let monoFont: Font = .system(.body, design: .monospaced)");
  lines.push(
    "    static func mono(size: CGFloat, weight: Font.Weight = .regular) -> Font {"
  );
  lines.push(
    "        .system(size: size, weight: weight, design: .monospaced)"
  );
  lines.push("    }");

  lines.push("");
  lines.push("    // MARK: - Borders");
  lines.push("    static let borderRadius: CGFloat = 0");
  lines.push("    static let borderWidth: CGFloat = 1");

  lines.push("");
  lines.push("    // MARK: - Spacing");
  for (const [name, value] of Object.entries(tokens.spacing)) {
    const numValue = parseInt(value);
    const swiftName = name === "2xl" ? "xxl" : name;
    lines.push(`    static let spacing${swiftName.charAt(0).toUpperCase() + swiftName.slice(1)}: CGFloat = ${numValue}`);
  }

  lines.push("}");
  return lines.join("\n") + "\n";
}

// --- JS Output ---
function buildJS(tokens) {
  const lines = [
    "// AUTO-GENERATED from tokens.json — do not edit directly",
    "",
    "export const colors = {",
  ];

  for (const [name, token] of Object.entries(tokens.colors)) {
    const jsName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    lines.push(`  ${jsName}: "${token.value}",`);
  }
  lines.push("};");

  lines.push("");
  lines.push("export const spacing = {");
  for (const [name, value] of Object.entries(tokens.spacing)) {
    lines.push(`  "${name}": "${value}",`);
  }
  lines.push("};");

  lines.push("");
  lines.push("export const borders = {");
  lines.push(`  radius: "${tokens.borders.radius}",`);
  lines.push(`  width: "${tokens.borders.width}",`);
  lines.push("};");

  return lines.join("\n") + "\n";
}

// --- Write outputs ---
const cssDir = path.join(__dirname, "css");
const swiftDir = path.join(__dirname, "swift");
const jsDir = path.join(__dirname, "js");

fs.mkdirSync(cssDir, { recursive: true });
fs.mkdirSync(swiftDir, { recursive: true });
fs.mkdirSync(jsDir, { recursive: true });

fs.writeFileSync(path.join(cssDir, "tokens.css"), buildCSS(tokens));
fs.writeFileSync(path.join(swiftDir, "Theme.swift"), buildSwift(tokens));
fs.writeFileSync(path.join(jsDir, "tokens.js"), buildJS(tokens));

console.log("✓ Generated css/tokens.css");
console.log("✓ Generated swift/Theme.swift");
console.log("✓ Generated js/tokens.js");
