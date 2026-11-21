// Prova que o ruleset de governança (.spectral.yaml) realmente barra specs fora do padrão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { repoRoot } from './lib/mule-project.js';

const spectral = join(repoRoot, 'node_modules', '.bin', 'spectral');
const ruleset = join(repoRoot, '.spectral.yaml');

function lint(target) {
  try {
    const output = execFileSync(spectral, ['lint', target, '--ruleset', ruleset, '--format', 'json', '--quiet'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(output || '[]');
  } catch (error) {
    // Spectral sai com código 1 quando há erros; o JSON continua no stdout.
    return JSON.parse(error.stdout || '[]');
  }
}

const HOUSE_RULES = [
  'apiled-layer-declared',
  'apiled-correlation-header',
  'apiled-post-idempotency-key',
  'apiled-error-contract',
  'apiled-operation-id-camel-case',
  'apiled-paths-kebab-case',
  'apiled-schema-properties-camel-case',
];

test('a spec com violações dispara cada regra da casa', () => {
  const codes = new Set(lint(join('tools', 'test', 'fixtures', 'spec-with-violations.yaml')).map((result) => result.code));
  for (const rule of HOUSE_RULES) {
    assert.ok(codes.has(rule), `regra ${rule} não disparou`);
  }
});

test('as specs das cinco APIs passam sem nenhum aviso', () => {
  const results = lint('apps/*/src/main/resources/api/*.yaml');
  assert.deepEqual(results.map((result) => `${result.code}: ${result.message}`), []);
});
