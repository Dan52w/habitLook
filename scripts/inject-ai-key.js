// Genera src/services/ai/embeddedKey.ts con tu API key de Groq
// embebida para el build. El archivo generado está en .gitignore:
// nunca se sube al repo.
//
// Uso:
//   node scripts/inject-ai-key.js                 → pide la key
//   GROQ_API_KEY=gsk-... node scripts/inject-ai-key.js
//   node scripts/inject-ai-key.js --ensure         → crea vacío si falta
//                                                  (lo usa postinstall)
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TARGET = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'ai',
  'embeddedKey.ts',
);

function writeFile(key) {
  const content =
    `// Generado por scripts/inject-ai-key.js — NO SUBIR AL REPO.\n` +
    `// Contiene tu API key de Groq embebida en el build.\n` +
    `export const EMBEDDED_GROQ_API_KEY = ${JSON.stringify(key)};\n`;
  fs.writeFileSync(TARGET, content, 'utf8');
}

async function promptKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const key = await new Promise(resolve => {
    rl.question('Pega tu API key de Groq (gsk-…): ', resolve);
  });
  rl.close();
  return key.trim();
}

async function main() {
  const ensure = process.argv.includes('--ensure');
  if (ensure && fs.existsSync(TARGET)) {
    console.log('embeddedKey.ts ya existe, no se toca.');
    return;
  }
  const envKey = (process.env.GROQ_API_KEY || '').trim();
  const key = envKey || (ensure ? '' : await promptKey());
  if (!key && !ensure) {
    console.error('Sin key: se genera el archivo vacío.');
  }
  writeFile(key);
  console.log(
    key
      ? 'OK: key embebida en src/services/ai/embeddedKey.ts (no se sube al repo).'
      : 'OK: archivo vacío generado (la IA usará key manual o quedará inactiva).',
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
