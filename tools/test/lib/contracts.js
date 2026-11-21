// Validação de payloads contra os schemas OAS 3.0 das specs do repositório.
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { join } from 'node:path';
import { appPaths, readYaml } from './mule-project.js';

/** Cria um validador com todas as specs registradas pelo nome da aplicação. */
export function createContractValidator(specApps) {
  // strict: false porque OAS 3.0 tem palavras-chave fora do JSON Schema (example, description em $ref...).
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  for (const app of specApps) {
    const [specPath] = appPaths(app).specs;
    ajv.addSchema(readYaml(specPath), app);
  }
  return function validate(spec, schema, payload) {
    const check = ajv.getSchema(`${spec}#/components/schemas/${schema}`);
    if (!check) throw new Error(`Schema ${schema} não existe em ${spec}`);
    const valid = check(payload);
    return { valid, errors: valid ? [] : ajv.errorsText(check.errors, { separator: '; ' }) };
  };
}

/** Resolve um JSON Pointer simples (/a/b) dentro de um objeto. */
export function resolvePointer(document, pointer) {
  if (!pointer) return document;
  return pointer.split('/').slice(1).reduce((node, key) => node?.[key], document);
}

export function fixturePath(app, fixture) {
  return join(appPaths(app).fixtures, fixture);
}
