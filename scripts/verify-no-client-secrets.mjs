/**
 * Fails the build if forbidden secret patterns appear under src/.
 * Safe to run in CI before EAS build. Does not scan .env (gitignored).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');

const FORBIDDEN = [
  { re: /SUPABASE_SERVICE_ROLE_KEY/gi, hint: 'Service role must not appear in app source' },
  { re: /RAZORPAY_KEY_SECRET/gi, hint: 'Razorpay key secret belongs in Edge Function env only' },
  { re: /RAZORPAY_WEBHOOK_SECRET/gi, hint: 'Razorpay webhook secret belongs in Edge Function env only' },
  { re: /client_secret\s*[:=]/gi, hint: 'OAuth client_secret must not be in client bundle' },
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) files.push(full);
  }
  return files;
}

let failed = false;
const files = walk(srcDir);

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  for (const { re, hint } of FORBIDDEN) {
    if (re.test(text)) {
      console.error(`[secrets:check] ${rel}: forbidden pattern (${hint})`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
