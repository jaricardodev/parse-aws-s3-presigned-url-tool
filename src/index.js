#!/usr/bin/env node

import inquirer from 'inquirer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parsePresignedUrl, parsePresignedUrlToJson } from './parser.js';
import { generateBrunoCollection } from './generators/bruno.js';
import { generatePostmanCollection } from './generators/postman.js';
import { generateCurlCommand } from './generators/curl.js';

const VALID_METHODS = ['GET', 'POST'];
const VALID_FORMATS = ['bruno', 'postman', 'curl'];

/**
 * Parses CLI arguments from the given argv array.
 *
 * Supported flags:
 *   --url <url>          AWS S3 pre-signed URL (skips the URL prompt)
 *   --method <GET|POST>  HTTP method (skips the method prompt)
 *   --format <bruno|postman|curl>  Output format (skips the format prompt)
 *   --stdout             Write result as JSON to stdout instead of printing a
 *                        human-readable message. Requires --url, --method and
 *                        --format to also be provided.
 *   --parse              Parse the URL and write the JSON object to stdout,
 *                        then exit. Only --url is required; --method and
 *                        --format are ignored.
 *
 * @param {string[]} argv
 * @returns {{ url?: string, method?: string, format?: string, stdout?: boolean, parse?: boolean }}
 */
export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) {
      args.url = argv[++i];
    } else if (argv[i] === '--method' && argv[i + 1]) {
      args.method = argv[++i].toUpperCase();
    } else if (argv[i] === '--format' && argv[i + 1]) {
      args.format = argv[++i].toLowerCase();
    } else if (argv[i] === '--stdout') {
      args.stdout = true;
    } else if (argv[i] === '--parse') {
      args.parse = true;
    }
  }
  return args;
}

async function main() {
  const cliArgs = parseArgs(process.argv.slice(2));

  // ── --parse: dump structured JSON and exit immediately ───────────────────
  if (cliArgs.parse) {
    if (!cliArgs.url) {
      process.stderr.write('\n❌  Error: --parse requires --url to be provided.\n\n');
      process.exit(1);
    }
    try {
      new URL(cliArgs.url);
    } catch {
      process.stderr.write('\n❌  Error: The value provided for --url is not a valid URL.\n\n');
      process.exit(1);
    }
    const parsed = parsePresignedUrlToJson(cliArgs.url);
    process.stdout.write(JSON.stringify(parsed, null, 2) + '\n');
    return;
  }

  // When --stdout is requested all three arguments must be supplied via flags
  // so that interactive prompts don't corrupt the machine-readable output.
  if (cliArgs.stdout) {
    const missing = [];
    if (!cliArgs.url) missing.push('--url');
    if (!cliArgs.method) missing.push('--method');
    if (!cliArgs.format) missing.push('--format');
    if (missing.length) {
      process.stderr.write(
        `\n❌  Error: --stdout requires ${missing.join(', ')} to be provided.\n\n`
      );
      process.exit(1);
    }
  }

  const log = cliArgs.stdout
    ? (msg) => process.stderr.write(msg + '\n')
    : (msg) => console.log(msg);

  log('\n🔗  AWS S3 Pre-signed URL Parser\n');

  // ── URL ──────────────────────────────────────────────────────────────────
  let rawUrl = cliArgs.url;
  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      if (!u.hostname) throw new Error('missing hostname');
    } catch {
      process.stderr.write('\n❌  Error: The value provided for --url is not a valid URL.\n\n');
      process.exit(1);
    }
  } else {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'rawUrl',
        message: 'Enter the AWS S3 pre-signed URL:',
        validate: (input) => {
          const trimmed = input.trim();
          if (!trimmed) return 'URL cannot be empty.';
          try {
            const url = new URL(trimmed);
            if (!url.hostname) return 'Please enter a valid URL.';
            return true;
          } catch {
            return 'Please enter a valid URL.';
          }
        },
      },
    ]);
    rawUrl = answer.rawUrl;
  }

  // ── Method ───────────────────────────────────────────────────────────────
  let method = cliArgs.method;
  if (method) {
    if (!VALID_METHODS.includes(method)) {
      process.stderr.write(
        `\n❌  Error: --method must be one of: ${VALID_METHODS.join(', ')}.\n\n`
      );
      process.exit(1);
    }
  } else {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'Which HTTP method do you want in the output?',
        choices: [
          { name: 'GET  – keep query parameters as URL params', value: 'GET' },
          { name: 'POST – convert query parameters to multipart form fields', value: 'POST' },
        ],
      },
    ]);
    method = answer.method;
  }

  // ── Format ───────────────────────────────────────────────────────────────
  let outputType = cliArgs.format;
  if (outputType) {
    if (!VALID_FORMATS.includes(outputType)) {
      process.stderr.write(
        `\n❌  Error: --format must be one of: ${VALID_FORMATS.join(', ')}.\n\n`
      );
      process.exit(1);
    }
  } else {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'outputType',
        message: 'Which format do you want to export?',
        choices: [
          { name: 'Bruno  – generate a Bruno collection JSON', value: 'bruno' },
          { name: 'Postman – generate a Postman Collection v2.1 JSON', value: 'postman' },
          { name: 'cURL   – generate a cURL command (.sh file)', value: 'curl' },
        ],
      },
    ]);
    outputType = answer.outputType;
  }

  // ── Generate ─────────────────────────────────────────────────────────────
  const parsed = parsePresignedUrl(rawUrl.trim());
  parsed.method = method;

  const outputDir = join(process.cwd(), 'output');
  mkdirSync(outputDir, { recursive: true });

  let filePath;
  let content = '';
  if (outputType === 'bruno') {
    const collection = generateBrunoCollection(parsed);
    filePath = join(outputDir, 'bruno-collection.json');
    content = JSON.stringify(collection, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  } else if (outputType === 'postman') {
    const collection = generatePostmanCollection(parsed);
    filePath = join(outputDir, 'postman-collection.json');
    content = JSON.stringify(collection, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  } else {
    const command = generateCurlCommand(parsed);
    filePath = join(outputDir, 'request.sh');
    content = command + '\n';
    writeFileSync(filePath, content, 'utf-8');
  }

  if (cliArgs.stdout) {
    process.stdout.write(JSON.stringify({ filePath, content }) + '\n');
  } else {
    log(`\n✅  Collection written to: ${filePath}\n`);
  }
}

main().catch((err) => {
  process.stderr.write('\n❌  Error: ' + err.message + '\n');
  process.exit(1);
});
