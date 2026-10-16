// Genera src/services/ai/embeddedSecrets.ts con la URL del backend y el
// secreto compartido app → backend. El archivo generado está en
// .gitignore: nunca se sube al repo.
//
// Uso:
//   node scripts/inject-backend.js
//   BACKEND_URL=https://tu-backend.onrender.com APP_KEY=secreto node scripts/inject-backend.js
//   node scripts/inject-backend.js --ensure   → crea vacío si falta (postinstall)
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TARGET = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'ai',
  'embeddedSecrets.ts',
);
const DEFAULT_URL = 'https://habitlook-backend.onrender.com';

function writeFile(url, appKey) {
  const content =
    `// Generado por scripts/inject-backend.js — NO SUBIR AL REPO.\n` +
    `export const EMBEDDED_BACKEND_URL = ${JSON.stringify(url)};\n` +
    `export const EMBEDDED_APP_KEY = ${JSON.stringify(appKey)};\n`;
  fs.writeFileSync(TARGET, content, 'utf8');
}

function question(rl, text) {
  return new Promise(resolve => rl.question(text, answer => resolve(answer.trim())));
}

async function main() {
  const ensure = process.argv.includes('--ensure');
  if (ensure && fs.existsSync(TARGET)) {
    console.log('embeddedSecrets.ts ya existe, no se toca.');
    return;
  }
  const envUrl = (process.env.BACKEND_URL || '').trim();
  const envKey = (process.env.APP_KEY || '').trim();
  let url = envUrl;
  let appKey = envKey;
  if (!ensure && (!url || !appKey)) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!url) {
      const answer = await question(rl, `URL del backend [${DEFAULT_URL}]: `);
      url = answer || DEFAULT_URL;
    }
    if (!appKey) {
      appKey = await question(rl, 'Secreto compartido app → backend (x-app-key): ');
    }
    rl.close();
  }
  writeFile(url, appKey);
  console.log(
    appKey
      ? 'OK: secretos embebidos en src/services/ai/embeddedSecrets.ts (no se sube al repo).'
      : 'OK: archivo vacío generado (la IA quedará inactiva hasta configurar).',
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
