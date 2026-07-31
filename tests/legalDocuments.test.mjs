import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const cache = new Map();

const loadTypeScriptModule = filePath => {
  const absolutePath = resolve(filePath);
  if (cache.has(absolutePath)) return cache.get(absolutePath).exports;

  const module = { exports: {} };
  cache.set(absolutePath, module);
  const compiled = ts.transpileModule(readFileSync(absolutePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = specifier => {
    const dependencyPath = resolve(dirname(absolutePath), specifier);
    return loadTypeScriptModule(dependencyPath.endsWith('.ts') ? dependencyPath : `${dependencyPath}.ts`);
  };
  const execute = new Function('exports', 'require', 'module', compiled);
  execute(module.exports, localRequire, module);
  return module.exports;
};

test('public yasal belge adresleri production backend kökünden türetilir', () => {
  const { LEGAL_DOCUMENT_URLS } = loadTypeScriptModule('src/services/legalDocuments.ts');

  assert.deepEqual(LEGAL_DOCUMENT_URLS, {
    privacy: 'https://skinshelf-backend.onrender.com/legal/privacy',
    terms: 'https://skinshelf-backend.onrender.com/legal/terms',
    dataDeletion: 'https://skinshelf-backend.onrender.com/legal/data-deletion',
  });
});
