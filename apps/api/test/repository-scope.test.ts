import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const partnerModels = new Set([
  'PartnerModel',
  'PartnerUserModel',
  'KycDocumentModel',
  'InvoiceModel',
  'PaymentModel',
]);
const queryMethod =
  /\b([\w$.]+)\.(?:find|findOne|findById|findByIdAndUpdate|findByIdAndDelete|findOneAndUpdate|findOneAndDelete|updateOne|updateMany|deleteOne|deleteMany|replaceOne|countDocuments|estimatedDocumentCount|exists|distinct|aggregate|where)\s*\(/g;

interface SourceFile {
  name: string;
  source: string;
}

function sourceFiles(directory: string): SourceFile[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts')
      ? [{ name: path, source: readFileSync(path, 'utf8') }]
      : [];
  });
}

function modelImports(source: string): string[] {
  const imported: string[] = [];
  const importPattern = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]*\/models['"]/g;
  for (const match of source.matchAll(importPattern)) {
    for (const item of match[1]!.split(',')) {
      const [original, alias] = item.trim().split(/\s+as\s+/);
      if (partnerModels.has(original!)) imported.push(alias ?? original!);
    }
  }
  const namespacePattern = /import\s+\*\s+as\s+(\w+)\s+from\s+['"][^'"]*\/models['"]/g;
  for (const match of source.matchAll(namespacePattern)) {
    for (const model of partnerModels) imported.push(`${match[1]}.${model}`);
  }
  return imported;
}

function callEnd(source: string, openIndex: number): number {
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
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? source.length : newline;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 1;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')' && --depth === 0) return index;
  }
  return source.length;
}

function unscopedModelQueries(source: string, models: string[]): string[] {
  const violations: string[] = [];
  for (const match of source.matchAll(queryMethod)) {
    if (!models.includes(match[1]!)) continue;
    const callIndex = match.index!;
    const line = source.slice(0, callIndex).split('\n').length;
    const openIndex = callIndex + match[0].lastIndexOf('(');
    const end = callEnd(source, openIndex);
    const call = source.slice(callIndex, end + 1);
    const namedBypass = /SCOPE_BYPASS\(\s*actor\s*,\s*(?:['"][\w.]+['"]|Permission\.\w+)/.test(
      call,
    );
    const permitted = /scopeToActor\(\s*actor\s*,/.test(call) || namedBypass;
    if (!permitted) violations.push(`${line}: ${match[0].trim()}`);
  }
  return violations;
}

function architectureViolations(files: SourceFile[]): string[] {
  const violations: string[] = [];
  for (const file of files) {
    if (file.name.endsWith('.repository.ts') || file.name.endsWith('.model.ts')) continue;
    const imported = modelImports(file.source);
    if (!imported.length) continue;
    violations.push(`${file.name}: imports partner-scoped model(s) ${imported.join(', ')}`);
    const queries = unscopedModelQueries(file.source, imported);
    violations.push(...queries.map((query) => `${file.name}:${query}`));
  }
  for (const file of files.filter((candidate) => candidate.name.endsWith('.repository.ts'))) {
    const imported = modelImports(file.source);
    violations.push(
      ...unscopedModelQueries(file.source, imported).map((query) => `${file.name}:${query}`),
    );
  }
  return violations;
}

test('partner-scoped models are imported only by repositories and model definitions', () => {
  const root = join(__dirname, '../src');
  const violations = architectureViolations(sourceFiles(root));
  assert.deepEqual(violations, [], `Partner data access violations:\n${violations.join('\n')}`);
});

test('scope guard fixture catches both an illegal model import and an unscoped repository query', () => {
  const fixture = {
    name: 'fixture.service.ts',
    source:
      "import { PartnerModel } from '../partners/models';\nPartnerModel.find({ status: 'active' });",
  };
  const violations = architectureViolations([fixture]);
  assert.equal(violations.length, 2, violations.join('\n'));
  assert.match(violations[0]!, /imports partner-scoped model/);
  assert.match(violations[1]!, /PartnerModel\.find/);
  const namespaceFixture = {
    name: 'fixture.namespace.ts',
    source:
      "import * as partnerModels from '../partners/models';\npartnerModels.PartnerModel.find({});",
  };
  const namespaceViolations = architectureViolations([namespaceFixture]);
  assert.equal(namespaceViolations.length, 2, namespaceViolations.join('\n'));
  assert.match(namespaceViolations[1]!, /partnerModels\.PartnerModel\.find/);
  const invoiceFixture = {
    name: 'fixture.invoice.repository.ts',
    source: "import { InvoiceModel } from './models';\nInvoiceModel.find({ status: 'issued' });",
  };
  assert.deepEqual(architectureViolations([invoiceFixture]), [
    `${invoiceFixture.name}:2: InvoiceModel.find(`,
  ]);
});

test('repository query fixture rejects unscoped access and accepts scope or named bypass', () => {
  const unscoped = unscopedModelQueries('PartnerModel.find({ status: "active" });', [
    'PartnerModel',
  ]);
  assert.deepEqual(unscoped, ['1: PartnerModel.find(']);
  assert.deepEqual(
    unscopedModelQueries('PartnerModel.find(scopeToActor(actor, { status: "active" }));', [
      'PartnerModel',
    ]),
    [],
  );
  assert.deepEqual(
    unscopedModelQueries("PartnerModel.find(SCOPE_BYPASS(actor, 'partners.read'));", [
      'PartnerModel',
    ]),
    [],
  );
});

test('named admin bypass validates administrator kind and an explicit permission', () => {
  const repository = readFileSync(
    join(__dirname, '../src/modules/partners/partners.repository.ts'),
    'utf8',
  );
  assert.match(repository, /function SCOPE_BYPASS\([\s\S]*actor\.kind !== 'admin'/);
  assert.match(repository, /actor\.permissions\.has\(permission\)/);
});
