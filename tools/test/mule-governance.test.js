// Governança dos projetos Mule como teste: convenções que a revisão de código esqueceria.
// Roda sem Java/Maven/Mule, lendo os XMLs, DWLs e YAMLs de cada aplicação.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  appPaths,
  errorCatalogKeys,
  findElements,
  flatten,
  listApps,
  listFiles,
  parseXml,
  readText,
  readYaml,
} from './lib/mule-project.js';

const apps = listApps();

// to-api-error.dwl lê o binding "error", que só existe dentro de um error handler; ele é
// exercitado pelos testes de flow que verificam status e corpo do contrato de erro.
const DWL_COVERED_BY_FLOW_TESTS = new Set(['to-api-error.dwl']);

const SENSITIVE_KEY = /(password|secret|apikey|token)/i;
const BUILT_IN_PROPERTIES = new Set(['env', 'secure.key']);

function attr(node, name) {
  return node[`@_${name}`];
}

function textOf(value) {
  return [].concat(value ?? []).map((item) => (typeof item === 'string' ? item : item?.['#text'] ?? '')).join('');
}

function configFiles(app) {
  const files = listFiles(appPaths(app).configDir, '.yaml').map((path) => basename(path, '.yaml'));
  const envs = files.filter((name) => name !== 'common' && !name.startsWith('secure-'));
  const secure = files.filter((name) => name.startsWith('secure-')).map((name) => name.slice('secure-'.length));
  return { envs, secure };
}

function flatConfig(app, name) {
  return flatten(readYaml(join(appPaths(app).configDir, `${name}.yaml`)));
}

test('existem as cinco aplicações das três camadas', () => {
  assert.deepEqual(apps, ['enrollment-papi', 'finerp-sapi', 'payments-sapi', 'student-app-xapi', 'studio-sapi']);
});

for (const app of apps) {
  describe(app, () => {
    const paths = appPaths(app);

    test('pom.xml é uma aplicação Mule com mule-maven-plugin e MUnit, herdando o POM pai', () => {
      const project = parseXml(paths.pom).project[0];
      assert.equal(textOf(project.packaging), 'mule-application');
      assert.equal(textOf(project.parent[0].artifactId), 'mule-api-led-parent');
      const plugins = project.build[0].plugins[0].plugin.map((plugin) => textOf(plugin.artifactId));
      assert.ok(plugins.includes('mule-maven-plugin'), 'mule-maven-plugin ausente');
      assert.ok(plugins.includes('munit-maven-plugin'), 'munit-maven-plugin ausente');
    });

    test('mule-artifact.json esconde secure.key no Runtime Manager', () => {
      const artifact = JSON.parse(readText(paths.artifact));
      assert.ok(artifact.secureProperties.includes('secure.key'));
    });

    test('APIkit aponta para a única spec do projeto, e a spec declara a camada do nome', () => {
      assert.equal(paths.specs.length, 1);
      const [apikit] = findElements(paths.mainXml, 'apikit:config');
      assert.equal(attr(apikit.node, 'api'), basename(paths.specs[0]));
      const layer = readYaml(paths.specs[0]).info['x-api-layer'];
      const suffix = { xapi: 'experience', papi: 'process', sapi: 'system' }[app.split('-').pop()];
      assert.equal(layer, suffix);
    });

    test('cada operação da spec tem um flow APIkit e vice-versa', () => {
      const spec = readYaml(paths.specs[0]);
      const configName = attr(findElements(paths.mainXml, 'apikit:config')[0].node, 'name');
      const fromSpec = Object.entries(spec.paths).flatMap(([path, item]) =>
        Object.keys(item)
          .filter((method) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
          .map((method) => `${method} ${path}`),
      );
      const fromFlows = findElements(paths.mainXml, 'flow')
        .map(({ node }) => attr(node, 'name'))
        .filter((name) => name.endsWith(`:${configName}`))
        .map((name) => {
          const [method, rawPath] = name.split(':');
          const path = rawPath.replaceAll('\\', '/').replace(/\(([^)]+)\)/g, '{$1}');
          return `${method} ${path}`;
        });
      assert.deepEqual(fromFlows.sort(), fromSpec.sort());
    });

    test('handler global padrão com On Error Continue e On Error Propagate', () => {
      const [configuration] = findElements(paths.mainXml, 'configuration');
      assert.equal(attr(configuration.node, 'defaultErrorHandler-ref'), 'global-error-handler');
      const handler = findElements(paths.mainXml, 'error-handler').find(({ node }) => attr(node, 'name') === 'global-error-handler');
      assert.ok(handler, 'error-handler global-error-handler ausente');
      assert.ok(handler.node['on-error-continue']?.length > 0, 'sem on-error-continue');
      assert.ok(handler.node['on-error-propagate']?.length > 0, 'sem on-error-propagate');
      const last = handler.node['on-error-propagate'].at(-1);
      assert.equal(attr(last, 'type'), 'ANY', 'o último propagate deve ser o pega-tudo ANY');
    });

    test('toda chamada HTTP de saída está dentro de until-successful', () => {
      const requests = findElements(paths.mainXml, 'http:request');
      assert.ok(requests.length > 0);
      for (const { node, ancestors } of requests) {
        assert.ok(ancestors.includes('until-successful'), `http:request "${attr(node, 'doc:name')}" sem retry`);
      }
    });

    test('correlationId: requesters propagam e o listener devolve X-Correlation-ID', () => {
      for (const { node } of findElements(paths.mainXml, 'http:request-config')) {
        assert.equal(attr(node, 'sendCorrelationId'), 'ALWAYS', `${attr(node, 'name')} não propaga correlationId`);
      }
      const [listener] = findElements(paths.mainXml, 'http:listener');
      for (const builder of ['http:response', 'http:error-response']) {
        const headers = textOf(listener.node[builder][0]['http:headers']);
        assert.match(headers, /'X-Correlation-ID': correlationId/, `${builder} sem X-Correlation-ID`);
      }
    });

    test('transformações ficam em arquivos .dwl, nunca inline nos flows', () => {
      for (const tag of ['ee:set-payload', 'ee:set-variable']) {
        for (const { node, file } of findElements(paths.mainXml, tag)) {
          const resource = attr(node, 'resource');
          assert.ok(resource, `${tag} inline em ${file}`);
          assert.ok(existsSync(join(paths.resources, resource)), `${resource} não existe`);
        }
      }
    });

    test('todo .dwl é usado pelos flows e coberto por MUnit; todo módulo é importado e testado', () => {
      const mainSource = paths.mainXml.map(readText).join('\n');
      const testSource = paths.testXml.map(readText).join('\n');
      const dwlSource = [...paths.dwl, ...paths.modules].map(readText).join('\n');
      for (const file of paths.dwl.map((path) => basename(path))) {
        assert.ok(mainSource.includes(`resource="dw/${file}"`), `dw/${file} não é usado (código morto)`);
        if (!DWL_COVERED_BY_FLOW_TESTS.has(file)) {
          assert.ok(testSource.includes(`resource="dw/${file}"`), `dw/${file} sem teste MUnit`);
        }
      }
      for (const module of paths.modules.map((path) => basename(path, '.dwl'))) {
        assert.ok(dwlSource.includes(`modules::${module}`), `modules/${module}.dwl não é importado`);
        const testedDirectly = testSource.includes(`modules::${module}`);
        const testedThroughDwl = paths.dwl.some((path) => readText(path).includes(`modules::${module}`) && testSource.includes(`dw/${basename(path)}`));
        assert.ok(testedDirectly || testedThroughDwl, `modules/${module}.dwl sem teste MUnit`);
      }
    });

    test('todo erro lançado ou tratado no handler global está no catálogo de erros', () => {
      const catalog = new Set(errorCatalogKeys(app));
      const raised = findElements(paths.mainXml, 'raise-error').map(({ node }) => attr(node, 'type'));
      const handled = findElements(paths.mainXml, 'error-handler')
        .filter(({ node }) => attr(node, 'name') === 'global-error-handler')
        .flatMap(({ node }) => [...(node['on-error-continue'] ?? []), ...(node['on-error-propagate'] ?? [])])
        .flatMap((handler) => attr(handler, 'type').split(',').map((type) => type.trim()))
        .filter((type) => type !== 'ANY');
      for (const type of [...raised, ...handled]) {
        assert.ok(catalog.has(type), `${type} não está em modules/ApiErrors.dwl`);
      }
    });

    test('ambientes têm as mesmas chaves (sem drift) e cada um tem seu arquivo seguro', () => {
      const { envs, secure } = configFiles(app);
      assert.ok(['local', 'dev', 'prod'].every((env) => envs.includes(env)), `ambientes: ${envs}`);
      assert.deepEqual([...secure].sort(), [...envs].sort());
      const reference = Object.keys(flatConfig(app, 'local')).sort();
      for (const env of envs) {
        assert.deepEqual(Object.keys(flatConfig(app, env)).sort(), reference, `${env}.yaml diverge de local.yaml`);
      }
      const secureReference = Object.keys(flatConfig(app, 'secure-local')).sort();
      for (const env of secure) {
        assert.deepEqual(Object.keys(flatConfig(app, `secure-${env}`)).sort(), secureReference, `secure-${env}.yaml diverge`);
      }
    });

    test('segredos só em arquivos seguros, e sempre cifrados ou como placeholder', () => {
      const { envs, secure } = configFiles(app);
      for (const name of ['common', ...envs]) {
        for (const key of Object.keys(flatConfig(app, name))) {
          assert.doesNotMatch(key, SENSITIVE_KEY, `chave sensível "${key}" em ${name}.yaml`);
        }
      }
      for (const env of secure) {
        for (const [key, value] of Object.entries(flatConfig(app, `secure-${env}`))) {
          assert.match(String(value), /^!\[.+\]$/, `secure-${env}.yaml: "${key}" não está no formato ![...]`);
          if (env === 'dev' || env === 'prod') {
            assert.equal(value, '![CIFRAR_NO_PIPELINE]', `secure-${env}.yaml: valor real não deve ser versionado neste exemplo`);
          }
        }
      }
    });

    test('todo ${placeholder} dos flows existe na configuração', () => {
      const plain = new Set([...Object.keys(flatConfig(app, 'common')), ...Object.keys(flatConfig(app, 'local'))]);
      const secureKeys = new Set(Object.keys(flatConfig(app, 'secure-local')));
      const source = paths.mainXml.map(readText).join('\n');
      for (const [, name] of source.matchAll(/\$\{([^}]+)\}/g)) {
        if (name.startsWith('secure::')) {
          assert.ok(secureKeys.has(name.slice('secure::'.length)), `\${${name}} sem valor seguro`);
        } else {
          assert.ok(plain.has(name) || BUILT_IN_PROPERTIES.has(name), `\${${name}} sem valor na configuração`);
        }
      }
    });
  });
}
