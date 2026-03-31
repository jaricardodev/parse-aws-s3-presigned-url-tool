#!/usr/bin/env node

import inquirer from 'inquirer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parsePresignedUrl } from './parser.js';
import { generateBrunoCollection } from './generators/bruno.js';
import { generatePostmanCollection } from './generators/postman.js';
import { generateCurlCommand } from './generators/curl.js';

async function main() {
  console.log('\n🔗  AWS S3 Pre-signed URL Parser\n');

  const { rawUrl } = await inquirer.prompt([
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

  const { method } = await inquirer.prompt([
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

  const { outputType } = await inquirer.prompt([
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

  const parsed = parsePresignedUrl(rawUrl.trim());
  parsed.method = method;

  const outputDir = join(process.cwd(), 'output');
  mkdirSync(outputDir, { recursive: true });

  let filePath;
  if (outputType === 'bruno') {
    const collection = generateBrunoCollection(parsed);
    filePath = join(outputDir, 'bruno-collection.json');
    writeFileSync(filePath, JSON.stringify(collection, null, 2), 'utf-8');
  } else if (outputType === 'postman') {
    const collection = generatePostmanCollection(parsed);
    filePath = join(outputDir, 'postman-collection.json');
    writeFileSync(filePath, JSON.stringify(collection, null, 2), 'utf-8');
  } else {
    const command = generateCurlCommand(parsed);
    filePath = join(outputDir, 'request.sh');
    writeFileSync(filePath, command + '\n', 'utf-8');
  }

  console.log(`\n✅  Collection written to: ${filePath}\n`);
}

main().catch((err) => {
  console.error('\n❌  Error:', err.message);
  process.exit(1);
});
