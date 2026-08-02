import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/g],
  ['GitHub token', /gh(?:p|o|u|s|r)_[0-9A-Za-z]{36,}/g],
  ['OpenAI-style API key', /sk-[0-9A-Za-z_-]{32,}/g],
  ['Slack token', /xox(?:a|b|p|r|s)-[0-9A-Za-z-]{20,}/g],
];

const excluded = new Set([
  'package-lock.json',
  'docs/security/secret-scanning.md',
  'scripts/check-secrets.mjs',
]);

const trackedFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' }
)
  .split('\0')
  .filter(Boolean)
  .filter((file) => !excluded.has(file));

const findings = [];
for (const file of trackedFiles) {
  const content = readFileSync(file);
  if (content.includes(0)) continue;

  const text = content.toString('utf8');
  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const line = text.slice(0, match.index).split('\n').length;
      findings.push(`${file}:${line} ${label}`);
    }
  }
}

if (findings.length > 0) {
  console.error('High-confidence secret patterns found:\n' + findings.join('\n'));
  process.exit(1);
}

console.log(`Secret scan passed: ${trackedFiles.length} repository files checked.`);
