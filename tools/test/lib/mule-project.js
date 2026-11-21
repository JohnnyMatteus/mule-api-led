// Leitura dos projetos Mule do repositório para os testes de governança e de contrato.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import YAML from 'yaml';

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const appsDir = join(repoRoot, 'apps');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (_name, _jpath, _isLeaf, isAttribute) => !isAttribute,
});

export function listApps() {
  return readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function listFiles(dir, extension) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(extension))
    .sort()
    .map((name) => join(dir, name));
}

export function readText(path) {
  return readFileSync(path, 'utf8');
}

export function parseXml(path) {
  return parser.parse(readText(path));
}

export function readYaml(path) {
  return YAML.parse(readText(path)) ?? {};
}

/** Achata { a: { b: "x" } } em { "a.b": "x" }, como o Mule resolve ${a.b}. */
export function flatten(object, prefix = '') {
  return Object.entries(object).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return { ...acc, ...flatten(value, path) };
    }
    return { ...acc, [path]: value };
  }, {});
}

/**
 * Percorre a árvore do fast-xml-parser chamando visit(tag, node, ancestors) para cada elemento.
 * ancestors é a lista de tags acima do elemento, da raiz até o pai.
 */
export function walk(tree, visit, ancestors = []) {
  for (const [tag, value] of Object.entries(tree)) {
    if (tag.startsWith('@_') || tag === '#text' || tag === '?xml') continue;
    for (const node of [].concat(value)) {
      if (node === null || typeof node !== 'object') continue;
      visit(tag, node, ancestors);
      walk(node, visit, [...ancestors, tag]);
    }
  }
}

/** Todos os elementos com a tag informada, em todos os XMLs da lista. */
export function findElements(xmlPaths, wantedTag) {
  const found = [];
  for (const path of xmlPaths) {
    walk(parseXml(path), (tag, node, ancestors) => {
      if (tag === wantedTag) found.push({ file: basename(path), node, ancestors });
    });
  }
  return found;
}

export function appPaths(app) {
  const root = join(appsDir, app);
  const resources = join(root, 'src', 'main', 'resources');
  return {
    root,
    pom: join(root, 'pom.xml'),
    artifact: join(root, 'mule-artifact.json'),
    mainXml: listFiles(join(root, 'src', 'main', 'mule'), '.xml'),
    testXml: listFiles(join(root, 'src', 'test', 'munit'), '.xml'),
    specs: listFiles(join(resources, 'api'), '.yaml'),
    dwl: listFiles(join(resources, 'dw'), '.dwl'),
    modules: listFiles(join(resources, 'modules'), '.dwl'),
    configDir: join(resources, 'config'),
    resources,
    fixtures: join(root, 'src', 'test', 'resources', 'fixtures'),
  };
}

/** Chaves do catálogo de erros (modules/ApiErrors.dwl), ex.: "STUDIO:NOT_FOUND". */
export function errorCatalogKeys(app) {
  const source = readText(join(appPaths(app).resources, 'modules', 'ApiErrors.dwl'));
  return [...source.matchAll(/^\s*"([A-Z_]+:[A-Z_]+)"\s*:/gm)].map((match) => match[1]);
}
