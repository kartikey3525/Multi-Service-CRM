import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const repositoryQuery =
  /\b[\w$]*Model\.(?:find|findOne|findById|findOneAndUpdate|updateOne|deleteOne|countDocuments|aggregate)\s*\(/g;

function matchingCallEnd(source: string, openIndex: number): number {
  let depth = 0;
  let quote: "'" | '"' | '`' | undefined;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index]!;
    const next = source[index + 1];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '/' && next === '/') {
      const lineEnd = source.indexOf('\n', index + 2);
      index = lineEnd === -1 ? source.length : lineEnd;
      continue;
    }
    if (char === '/' && next === '*') {
      const commentEnd = source.indexOf('*/', index + 2);
      index = commentEnd === -1 ? source.length : commentEnd + 1;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')' && --depth === 0) return index;
  }
  return source.length;
}

function unscopedQueries(source: string, file: string): string[] {
  const violations: string[] = [];
  for (const match of source.matchAll(repositoryQuery)) {
    const callIndex = match.index!;
    const openIndex = callIndex + match[0].lastIndexOf('(');
    const closeIndex = matchingCallEnd(source, openIndex);
    const argumentsText = source.slice(openIndex + 1, closeIndex);
    const precedingLines = source.slice(0, callIndex).split('\n').slice(-3).join('\n');
    const hasDocumentedAdminBypass = /ADMIN_ONLY_SCOPE_BYPASS:\s*\S/.test(precedingLines);
    if (!argumentsText.includes('scopeToActor(') && !hasDocumentedAdminBypass) {
      const line = source.slice(0, callIndex).split('\n').length;
      violations.push(`${file}:${line} ${match[0].trim()}`);
    }
  }
  return violations;
}

function repositoryFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return repositoryFiles(path);
    return entry.isFile() && entry.name.endsWith('.repository.ts') ? [path] : [];
  });
}

test('repository queries require scopeToActor or a documented admin-only bypass', () => {
  const root = join(__dirname, '../src/modules');
  const violations = repositoryFiles(root).flatMap((file) =>
    unscopedQueries(readFileSync(file, 'utf8'), file),
  );
  assert.deepEqual(violations, [], `Unscoped repository queries:\n${violations.join('\n')}`);
});

test('repository scope scan catches an unscoped query and accepts explicit exceptions', () => {
  assert.deepEqual(
    unscopedQueries('PartnerModel.find({ status: "active" });', 'fixture.repository.ts'),
    ['fixture.repository.ts:1 PartnerModel.find('],
  );
  assert.deepEqual(
    unscopedQueries(
      'PartnerModel.find(scopeToActor(actor, { status: "active" }));',
      'fixture.repository.ts',
    ),
    [],
  );
  assert.deepEqual(
    unscopedQueries(
      '// ADMIN_ONLY_SCOPE_BYPASS: route requires partners.read and partners.manage\nPartnerModel.find({ status: "active" });',
      'fixture.repository.ts',
    ),
    [],
  );
});
