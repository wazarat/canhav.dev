#!/usr/bin/env node
/**
 * Copy rule checker. User-facing strings under app/, components/, content/
 * and lib/ carry no em dashes and no colons (URLs, code spans and the
 * "Worked example:" teaching-card prefix excepted). Run with
 *
 *   npm run check:copy
 *
 * The scan walks every .ts and .tsx file through the TypeScript compiler
 * API and looks only at string literals, template literal chunks and JSX
 * text, so comments never count. A colon is a hit when whitespace follows
 * it or when it ends a final chunk (a template head or middle ending in a
 * colon is a code join such as a Map key). Tailwind classes ("md:flex"),
 * times ("12:30") and URLs ("https://") never put whitespace after a colon,
 * so they need no allowlist. A line containing "copy-ok" is skipped.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOTS = ["app", "components", "content", "lib"];
/** Files whose strings are not platform copy, each with the reason. */
const SKIP = new Map([
  ["lib/indexer.ts", "GraphQL query text"],
  ["lib/agents-indexer.ts", "GraphQL query text"],
  ["lib/dune.ts", "server log messages"],
  ["lib/export-md.ts", "markdown export, handled with the docs pass"],
]);
const SCHEME_RE = /^(https?|mailto|data|ipfs|tel):$/;
const ALLOWED_PREFIX = "Worked example:";
const ESCAPE = "copy-ok";
const EM_DASH = "—";

const K = ts.SyntaxKind;
const FINAL = new Set([K.StringLiteral, K.NoSubstitutionTemplateLiteral, K.TemplateTail, K.JsxText]);
const CHUNK = new Set([...FINAL, K.TemplateHead, K.TemplateMiddle]);

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !SKIP.has(full)) out.push(full);
  }
  return out;
}

const hits = [];
for (const file of ROOTS.flatMap((r) => walk(r, []))) {
  const text = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const lines = text.split("\n");
  const visit = (node) => {
    if (CHUNK.has(node.kind)) check(node);
    ts.forEachChild(node, visit);
  };
  const check = (node) => {
    const raw = node.text;
    const { line, character } = src.getLineAndCharacterOfPosition(node.getStart(src));
    if (lines[line].includes(ESCAPE)) return;
    if (node.kind === K.JsxText && !raw.trim()) return;
    if (SCHEME_RE.test(raw)) return;
    const t = raw.split(ALLOWED_PREFIX).join("");
    const problems = [];
    if (t.includes(EM_DASH)) problems.push("em");
    if (/:\s/.test(t) || (FINAL.has(node.kind) && /:$/.test(t.trimEnd()))) problems.push("colon");
    if (problems.length === 0) return;
    const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 90);
    hits.push({ file, line: line + 1, col: character + 1, tag: problems.join("+"), snippet });
  };
  visit(src);
}

hits.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col);
for (const h of hits) console.log(`${h.file}:${h.line}:${h.col}  [${h.tag}]  ${h.snippet}`);
const files = new Set(hits.map((h) => h.file)).size;
console.log(`${hits.length} hit${hits.length === 1 ? "" : "s"} in ${files} file${files === 1 ? "" : "s"}`);
process.exitCode = hits.length ? 1 : 0;
