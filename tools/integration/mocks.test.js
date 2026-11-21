// Testes de integração contra os mocks do docker-compose (make up && make test-integration).
// O Prism serve as rotas da spec sem o basePath do servidor (/api).
// Provam, sem runtime Mule, que:
//   - o que cada camada envia (fixtures esperadas dos DataWeave) é aceito pela spec da camada
//     de baixo servida pelo Prism, que valida headers e corpo;
//   - o WireMock dos backends responde com as mesmas fixtures dos testes MUnit.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listApps } from '../test/lib/mule-project.js';
import { createContractValidator, fixturePath } from '../test/lib/contracts.js';

const host = process.env.MOCKS_HOST ?? 'localhost';
const url = (portVar, fallback, path) => `http://${host}:${process.env[portVar] ?? fallback}${path}`;
const backends = (path) => url('WIREMOCK_PORT', 9090, path);
const studio = (path) => url('PRISM_STUDIO_PORT', 4011, path);
const finerp = (path) => url('PRISM_FINERP_PORT', 4012, path);
const payments = (path) => url('PRISM_PAYMENTS_PORT', 4013, path);
const processApi = (path) => url('PRISM_PROCESS_PORT', 4020, path);

const validate = createContractValidator(listApps());
const fixture = (app, path) => JSON.parse(readFileSync(fixturePath(app, path), 'utf8'));
const internalHeaders = (key) => ({
  'Content-Type': 'application/json',
  'X-Correlation-ID': 'corr-integration-0001',
  ...(key ? { 'Idempotency-Key': key } : {}),
});

async function call(target, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(target, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function assertContract(spec, schema, payload) {
  const result = validate(spec, schema, payload);
  assert.ok(result.valid, result.errors);
}

describe('backends simulados (WireMock)', () => {
  test('membro do estúdio é a mesma fixture usada no MUnit', async () => {
    const response = await call(backends('/studio/v1/members/stu-001'), { headers: { 'X-Api-Key': 'dev-only' } });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, fixture('studio-sapi', 'studio-member-to-student/input.json'));
  });

  test('sem X-Api-Key o estúdio não reconhece a chamada', async () => {
    const response = await call(backends('/studio/v1/sessions/cls-101'));
    assert.equal(response.status, 404);
  });

  test('token de cartão de teste recusado devolve 402 do processador', async () => {
    const response = await call(backends('/processor/v1/payments'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer dev-only', 'Idempotency-Key': 'idem-int-0001' },
      body: { payment_method: { kind: 'card_token', card_token: 'tok-test-declined' } },
    });
    assert.equal(response.status, 402);
    assert.equal(response.body.status, 'declined');
  });

  test('FinERP responde 200 com COD_RETORNO, como o legado', async () => {
    const response = await call(backends('/finerp/erp/v1/titulos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic ZGV2LW9ubHk6ZGV2LW9ubHk=' },
      body: fixture('finerp-sapi', 'receivable-to-finerp/expected.json'),
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.COD_RETORNO, '000');
  });
});

describe('System APIs simuladas (Prism) aceitam o que a Process API envia', () => {
  test('GET aluno devolve um Student válido', async () => {
    const response = await call(studio('/students/stu-001'), { headers: internalHeaders() });
    assert.equal(response.status, 200);
    assertContract('studio-sapi', 'Student', response.body);
  });

  test('sem X-Correlation-ID a System API recusa', async () => {
    const response = await call(studio('/students/stu-001'));
    assert.ok(response.status >= 400 && response.status < 500, `status ${response.status}`);
  });

  test('pedido de reserva montado pela Process API é aceito', async () => {
    const response = await call(studio('/reservations'), {
      method: 'POST',
      headers: internalHeaders('idem-int-0001:reserve'),
      body: fixture('enrollment-papi', 'build-reservation-request/expected.json'),
    });
    assert.equal(response.status, 201);
    assertContract('studio-sapi', 'Reservation', response.body);
  });

  test('pedido de cobrança montado pela Process API é aceito', async () => {
    const response = await call(payments('/charges'), {
      method: 'POST',
      headers: internalHeaders('idem-int-0001:charge'),
      body: fixture('enrollment-papi', 'build-charge-request/expected.json'),
    });
    assert.equal(response.status, 201);
    assertContract('payments-sapi', 'Charge', response.body);
  });

  test('cobrança sem Idempotency-Key é recusada pelo contrato', async () => {
    const response = await call(payments('/charges'), {
      method: 'POST',
      headers: internalHeaders(),
      body: fixture('enrollment-papi', 'build-charge-request/expected.json'),
    });
    assert.ok(response.status >= 400 && response.status < 500, `status ${response.status}`);
  });

  test('pedido de título montado pela Process API é aceito', async () => {
    const response = await call(finerp('/receivables'), {
      method: 'POST',
      headers: internalHeaders('idem-int-0001:receivable'),
      body: fixture('enrollment-papi', 'build-receivable-request/expected.json'),
    });
    assert.equal(response.status, 201);
    assertContract('finerp-sapi', 'Receivable', response.body);
  });
});

describe('Process API simulada (Prism) aceita o que a Experience API envia', () => {
  test('pedido de matrícula montado pela Experience API é aceito', async () => {
    const response = await call(processApi('/enrollments'), {
      method: 'POST',
      headers: internalHeaders('idem-int-0002'),
      body: fixture('student-app-xapi', 'app-request-to-enrollment/expected.json'),
    });
    assert.equal(response.status, 201);
    assertContract('enrollment-papi', 'Enrollment', response.body);
  });

  test('método de pagamento fora do contrato (PIX) é recusado', async () => {
    const body = fixture('student-app-xapi', 'app-request-to-enrollment/expected.json');
    const response = await call(processApi('/enrollments'), {
      method: 'POST',
      headers: internalHeaders('idem-int-0003'),
      body: { ...body, paymentMethod: { type: 'PIX' } },
    });
    assert.ok(response.status >= 400 && response.status < 500, `status ${response.status}`);
  });
});
