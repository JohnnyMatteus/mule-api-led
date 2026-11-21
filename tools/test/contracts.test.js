// Testes de contrato entre camadas: fixtures dos testes MUnit x schemas OAS.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listApps, readYaml, repoRoot } from './lib/mule-project.js';
import { createContractValidator, fixturePath, resolvePointer } from './lib/contracts.js';

const apps = listApps();
const contracts = readYaml(join(repoRoot, 'tools', 'contracts.yaml'));
const validate = createContractValidator(apps);

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

test('toda aplicação declara contratos', () => {
  assert.deepEqual(Object.keys(contracts).sort(), apps);
});

for (const [app, entries] of Object.entries(contracts)) {
  describe(`contratos usados por ${app}`, () => {
    for (const { fixture, spec, schema, pointer } of entries) {
      test(`${fixture}${pointer ?? ''} respeita ${spec} ${schema}`, () => {
        const path = fixturePath(app, fixture);
        assert.ok(existsSync(path), `fixture inexistente: ${path}`);
        const result = validate(spec, schema, resolvePointer(readJson(path), pointer));
        assert.ok(result.valid, result.errors);
      });
    }
  });
}

describe('o validador detecta quebra de contrato', () => {
  const charge = readJson(fixturePath('enrollment-papi', 'build-charge-request/expected.json'));

  test('campo obrigatório ausente', () => {
    const { amount: _removed, ...withoutAmount } = charge;
    assert.equal(validate('payments-sapi', 'ChargeRequest', withoutAmount).valid, false);
  });

  test('campo extra em schema fechado (additionalProperties: false)', () => {
    assert.equal(validate('payments-sapi', 'ChargeRequest', { ...charge, coupon: 'X' }).valid, false);
  });

  test('valor com mais de duas casas decimais', () => {
    const amount = { ...charge.amount, value: 150.001 };
    assert.equal(validate('payments-sapi', 'ChargeRequest', { ...charge, amount }).valid, false);
  });

  test('enum fora do contrato', () => {
    const pending = readJson(fixturePath('enrollment-papi', 'enrollment-response/expected-pending.json'));
    const changed = { ...pending, erpSync: { status: 'FAILED' } };
    assert.equal(validate('enrollment-papi', 'Enrollment', changed).valid, false);
  });
});
