#!/usr/bin/env node
// Guards the "exactly one scroll container app-wide" invariant.
//
// The recurring causes of broken/trapped scrolling in this app have been:
//   - overflow-x: hidden set on BOTH html and body (forces overflow-y: auto
//     on both, per CSS overflow propagation -> two nested scroll containers)
//   - position: fixed wrapping a whole page instead of just modals/bottom bar
//   - overflow-y: auto on a page-level wrapper instead of a bounded element
//   - height: 100vh instead of min-height (clips content that grows taller)
//
// Any genuine exception must carry an explicit marker comment on the SAME
// line: /* modal-ok */, /* bottombar-ok */, or /* bounded-scroll */.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOTS = ['app', 'components'];
const CODE_EXT = new Set(['.tsx', '.ts']);
const violations = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (CODE_EXT.has(extname(name))) checkCodeFile(full);
  }
}

function checkCodeFile(path) {
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const n = i + 1;

    if (/\bheight:\s*['"]?100vh/.test(line)) {
      violations.push(`${path}:${n}: height: 100vh — use minHeight so the page can grow taller than the viewport`);
    }

    if (/overflow-?y\s*:\s*['"]?(auto|scroll)/i.test(line) && !/bounded-scroll/.test(line)) {
      violations.push(`${path}:${n}: overflow-y auto/scroll without a /* bounded-scroll */ marker — this creates a second scroll container unless it's a deliberately capped element (e.g. a max-height textarea)`);
    }

    if (/position:\s*['"]?fixed/.test(line) && !/modal-ok|bottombar-ok/.test(line)) {
      violations.push(`${path}:${n}: position: fixed without a /* modal-ok */ or /* bottombar-ok */ marker — page-level fixed shells break single-scroll-container`);
    }
  });
}

function checkGlobalsCss() {
  const path = 'app/globals.css';
  let css;
  try {
    css = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  if (/html\s*,\s*body\s*\{[^}]*overflow-x/s.test(css)) {
    violations.push(`${path}: html and body share a rule that sets overflow-x — this forces overflow-y: auto on both, creating nested scroll containers. Put overflow-x: hidden on exactly one of them.`);
  }
  const htmlHasOverflowX = /(?:^|\n)\s*html\s*\{[^}]*overflow-x/s.test(css);
  const bodyHasOverflowX = /(?:^|\n)\s*body\s*\{[^}]*overflow-x/s.test(css);
  if (htmlHasOverflowX && bodyHasOverflowX) {
    violations.push(`${path}: both html{} and body{} independently set overflow-x — keep it on exactly one element.`);
  }
}

checkGlobalsCss();
for (const root of ROOTS) walk(root);

if (violations.length) {
  console.error('\nScroll-safety check failed — exactly ONE scroll container (the document) is required app-wide.\n');
  for (const v of violations) console.error('  ✗ ' + v);
  console.error(`\n${violations.length} violation(s). If this is a genuine exception, add the matching marker comment on the same line.\n`);
  process.exit(1);
}

console.log('Scroll-safety check passed — no trapped scroll containers, no page-level fixed shells, no 100vh page heights.');
