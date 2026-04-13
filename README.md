# parse-aws-s3-presigned-url-tool

An interactive Node.js CLI tool that parses an AWS S3 pre-signed URL and exports it as a **Bruno** collection, a **Postman** collection, or a **cURL** command you can run directly.

## Features

- Interactive prompts – no flags to memorise
- **Non-interactive mode** – supply all arguments via flags for scripting and CI use
- **`--parse` mode** – dumps a structured JSON object of all presigned-URL fields to stdout for direct use in calling code
- **`--stdout` mode** – outputs the result as JSON for consumption by other Node.js apps
- **GET mode** – keeps all query parameters as URL parameters
- **POST mode** – converts every query parameter into a multipart form field (HTML entities in values are decoded automatically)
- **Bruno** output – generates a Bruno collection JSON (`output/bruno-collection.json`)
- **Postman** output – generates a Postman Collection v2.1 JSON (`output/postman-collection.json`)
- **cURL** output – generates a ready-to-run cURL command (`output/request.sh`)

## Requirements

- Node.js ≥ 18

## Installation

```bash
npm install
```

## Usage

### Interactive mode

```bash
npm start
```

The CLI will ask you three questions:

1. **URL** – paste your AWS S3 pre-signed URL
2. **Method** – `GET` (query params) or `POST` (multipart form fields)
3. **Format** – `Bruno`, `Postman`, or `cURL`

The generated file is written to the `output/` directory in the current working directory.

### Non-interactive mode (flags)

Pass all three arguments directly to skip every prompt:

```bash
# Using npx (no global install required)
npx parse-aws-s3-presigned-url-tool \
  --url "https://my-bucket.s3.amazonaws.com/file.jpg?X-Amz-Algorithm=..." \
  --method GET \
  --format bruno
```

```bash
# Or with the short alias
npx parse-s3-url \
  --url "https://my-bucket.s3.amazonaws.com/file.jpg?X-Amz-Algorithm=..." \
  --method POST \
  --format curl
```

You can also supply only _some_ flags – the tool will prompt for the rest:

```bash
npx parse-s3-url --url "https://..." --method GET
# Only the format prompt is shown
```

### Programmatic / machine-readable output (`--stdout`)

Add the `--stdout` flag to have the tool write a JSON object to **stdout** instead of a human-readable message. This is ideal when calling the tool from another Node.js application.

`--stdout` requires `--url`, `--method`, and `--format` to all be provided.

```bash
npx parse-s3-url \
  --url "https://my-bucket.s3.amazonaws.com/file.jpg?X-Amz-Algorithm=..." \
  --method GET \
  --format postman \
  --stdout
```

#### Output shape

Every `--stdout` run emits exactly one JSON line to stdout:

```json
{
  "filePath": "/absolute/path/to/output/<filename>",
  "content": "<generated file content as a string>"
}
```

| Field | Description |
|-------|-------------|
| `filePath` | Absolute path of the file that was written to disk. Use this when you need to pass the file to another tool that expects a path. |
| `content` | The full text of the generated file. For `bruno` and `postman` formats this is a JSON string (parse it with `JSON.parse`). For `curl` it is a plain shell script string. |

Status and error messages are always written to **stderr**, keeping stdout clean for the JSON payload.

---

#### Synchronous usage (`execFileSync`)

The simplest approach — blocks until the tool exits, then parses the output.

**Postman format**

```js
import { execFileSync } from 'child_process';

const raw = execFileSync(
  'npx',
  [
    'parse-s3-url',
    '--url', 'https://my-bucket.s3.amazonaws.com/file.jpg?X-Amz-Algorithm=...',
    '--method', 'GET',
    '--format', 'postman',
    '--stdout',
  ],
  { encoding: 'utf-8' }
);

const { filePath, content } = JSON.parse(raw);
const collection = JSON.parse(content);          // Postman Collection v2.1 object
console.log('Written to:', filePath);
console.log('Collection name:', collection.info.name);
console.log('First request:', collection.item[0].name);
```

**Bruno format**

```js
import { execFileSync } from 'child_process';

const raw = execFileSync(
  'npx',
  [
    'parse-s3-url',
    '--url', 'https://my-bucket.s3.amazonaws.com/file.jpg?X-Amz-Algorithm=...',
    '--method', 'GET',
    '--format', 'bruno',
    '--stdout',
  ],
  { encoding: 'utf-8' }
);

const { filePath, content } = JSON.parse(raw);
const collection = JSON.parse(content);          // Bruno collection object
console.log('Written to:', filePath);
console.log('Collection name:', collection.name);
console.log('First item:', collection.items[0].name);
```

**cURL format**

```js
import { execFileSync } from 'child_process';

const raw = execFileSync(
  'npx',
  [
    'parse-s3-url',
    '--url', 'https://my-bucket.s3.amazonaws.com/file.jpg?X-Amz-Algorithm=...',
    '--method', 'GET',
    '--format', 'curl',
    '--stdout',
  ],
  { encoding: 'utf-8' }
);

const { filePath, content } = JSON.parse(raw);
// `content` is a plain shell script string — no further parsing needed
console.log('Written to:', filePath);
console.log('cURL command:\n', content);
```

---

#### Error handling

`execFileSync` throws when the process exits with a non-zero code. Wrap the call in a `try/catch` and read `err.stderr` for the human-readable error message:

```js
import { execFileSync } from 'child_process';

try {
  const raw = execFileSync(
    'npx',
    [
      'parse-s3-url',
      '--url', 'https://my-bucket.s3.amazonaws.com/file.jpg?X-Amz-Algorithm=...',
      '--method', 'GET',
      '--format', 'postman',
      '--stdout',
    ],
    { encoding: 'utf-8' }
  );

  const { filePath, content } = JSON.parse(raw);
  const collection = JSON.parse(content);
  console.log('Done:', filePath);
} catch (err) {
  // err.stderr contains the human-readable error written by the tool
  console.error('Tool failed:', err.stderr || err.message);
}
```

---

#### Asynchronous usage (`execFile`)

Use `execFile` when you do not want to block the event loop:

```js
import { execFile } from 'child_process';

execFile(
  'npx',
  [
    'parse-s3-url',
    '--url', 'https://my-bucket.s3.amazonaws.com/file.jpg?X-Amz-Algorithm=...',
    '--method', 'GET',
    '--format', 'postman',
    '--stdout',
  ],
  { encoding: 'utf-8' },
  (err, stdout, stderr) => {
    if (err) {
      console.error('Tool failed:', stderr || err.message);
      return;
    }

    const { filePath, content } = JSON.parse(stdout);
    const collection = JSON.parse(content);
    console.log('Done:', filePath);
    console.log('Collection name:', collection.info.name);
  }
);
```

Or with `util.promisify` for promise-based / async–await code:

```js
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function generatePostmanCollection(presignedUrl) {
  const { stdout, stderr } = await execFileAsync(
    'npx',
    [
      'parse-s3-url',
      '--url', presignedUrl,
      '--method', 'GET',
      '--format', 'postman',
      '--stdout',
    ],
    { encoding: 'utf-8' }
  );

  const { filePath, content } = JSON.parse(stdout);
  return { filePath, collection: JSON.parse(content) };
}

// Usage
const { filePath, collection } = await generatePostmanCollection(
  'https://my-bucket.s3.amazonaws.com/file.jpg?X-Amz-Algorithm=...'
);
console.log('Written to:', filePath);
console.log('Collection name:', collection.info.name);
```

### CLI flags reference

| Flag | Values | Description |
|------|--------|-------------|
| `--url <url>` | Any valid URL | AWS S3 pre-signed URL to parse |
| `--method <method>` | `GET`, `POST` | HTTP method for the generated request |
| `--format <format>` | `bruno`, `postman`, `curl` | Output format |
| `--stdout` | _(boolean)_ | Print `{ filePath, content }` JSON to stdout instead of a human-readable message. Requires `--url`, `--method`, and `--format`. |
| `--parse` | _(boolean)_ | Parse the URL and print the structured JSON object to stdout, then exit. Only `--url` is required; `--method` and `--format` are ignored. |

---

### JSON utility (`--parse`)

Use `--parse` when you want a structured JSON object of all presigned-URL fields
without generating any collection file. Only `--url` is required.

```bash
npx parse-s3-url \
  --url "https://my-bucket.s3.us-east-1.amazonaws.com/uploads/photo.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20230101%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20230101T000000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=abcdef1234567890" \
  --parse
```

Output written to **stdout**:

```json
{
  "url": "<original URL>",
  "baseUrl": "https://my-bucket.s3.us-east-1.amazonaws.com/uploads/photo.jpg",
  "protocol": "https",
  "host": "my-bucket.s3.us-east-1.amazonaws.com",
  "bucket": "my-bucket",
  "key": "uploads/photo.jpg",
  "pathname": "/uploads/photo.jpg",
  "region": "us-east-1",
  "algorithm": "AWS4-HMAC-SHA256",
  "credential": "AKIAIOSFODNN7EXAMPLE/20230101/us-east-1/s3/aws4_request",
  "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "credentialDate": "20230101",
  "date": "20230101T000000Z",
  "expires": "3600",
  "signedHeaders": "host",
  "signature": "abcdef1234567890",
  "securityToken": null,
  "params": {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": "AKIAIOSFODNN7EXAMPLE/20230101/us-east-1/s3/aws4_request",
    "X-Amz-Date": "20230101T000000Z",
    "X-Amz-Expires": "3600",
    "X-Amz-SignedHeaders": "host",
    "X-Amz-Signature": "abcdef1234567890"
  }
}
```

| Field | Description |
|-------|-------------|
| `url` | The original URL string passed in |
| `baseUrl` | URL without the query string |
| `protocol` | `https` or `http` |
| `host` | Full hostname (e.g. `my-bucket.s3.us-east-1.amazonaws.com`) |
| `bucket` | Bucket name extracted from a virtual-hosted-style hostname; `null` for path-style URLs |
| `key` | S3 object key (pathname without the leading `/`) |
| `pathname` | URL pathname with the leading `/` |
| `region` | AWS region from the hostname or, as a fallback, from the credential scope; `null` if not determinable |
| `algorithm` | Value of `X-Amz-Algorithm`; `null` if absent |
| `credential` | Full value of `X-Amz-Credential`; `null` if absent |
| `accessKeyId` | First segment of the credential (`<keyId>/…`); `null` if credential absent |
| `credentialDate` | Second segment of the credential (`…/<date>/…`); `null` if credential absent |
| `date` | Value of `X-Amz-Date`; `null` if absent |
| `expires` | Value of `X-Amz-Expires` (seconds as a string); `null` if absent |
| `signedHeaders` | Value of `X-Amz-SignedHeaders`; `null` if absent |
| `signature` | Value of `X-Amz-Signature`; `null` if absent |
| `securityToken` | Value of `X-Amz-Security-Token`; `null` if absent |
| `params` | All query parameters as a flat `{ name: value }` map (includes non-standard params) |

#### Programmatic import

You can also use `parsePresignedUrlToJson` directly in your own code without spawning a child process:

```js
import { parsePresignedUrlToJson } from 'parse-aws-s3-presigned-url-tool/src/parser.js';

const presignedUrl = 'https://my-bucket.s3.us-east-1.amazonaws.com/uploads/photo.jpg?X-Amz-Algorithm=...';

const {
  bucket,
  key,
  region,
  accessKeyId,
  expires,
  signature,
  params,
} = parsePresignedUrlToJson(presignedUrl);

console.log(`Bucket: ${bucket}, Key: ${key}, Region: ${region}`);
console.log(`Expires in: ${expires}s`);
```

#### Calling from a Node.js app via the CLI

```js
import { execFileSync } from 'child_process';

const raw = execFileSync(
  'npx',
  [
    'parse-s3-url',
    '--url', 'https://my-bucket.s3.amazonaws.com/file.jpg?X-Amz-Algorithm=...',
    '--parse',
  ],
  { encoding: 'utf-8' }
);

const { bucket, key, region, expires, signature } = JSON.parse(raw);
console.log(`Bucket: ${bucket}, Key: ${key}, Region: ${region}`);
```

## Running Tests

```bash
npm test
```

## Project Structure

```
src/
  index.js               # CLI entry point (interactive & non-interactive)
  parser.js              # URL parsing and HTML-entity decoding
  generators/
    bruno.js             # Bruno collection generator
    postman.js           # Postman Collection v2.1 generator
    curl.js              # cURL command generator
tests/
  parser.test.js
  generators/
    bruno.test.js
    postman.test.js
    curl.test.js
```
