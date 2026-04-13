# parse-aws-s3-presigned-url-tool

An interactive Node.js CLI tool that parses an AWS S3 pre-signed URL and exports it as a **Bruno** collection, a **Postman** collection, or a **cURL** command you can run directly.

## Features

- Interactive prompts – no flags to memorise
- **Non-interactive mode** – supply all arguments via flags for scripting and CI use
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

The JSON written to stdout has the following shape:

```json
{
  "filePath": "/absolute/path/to/output/postman-collection.json",
  "content": "{ ... generated file content ... }"
}
```

Status and error messages are always written to **stderr**, keeping stdout clean for the JSON payload.

#### Example: calling from a Node.js app

```js
import { execFileSync } from 'child_process';

const result = execFileSync(
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

const { filePath, content } = JSON.parse(result);
const collection = JSON.parse(content);
console.log('Postman collection written to:', filePath);
console.log('Collection name:', collection.info.name);
```

### CLI flags reference

| Flag | Values | Description |
|------|--------|-------------|
| `--url <url>` | Any valid URL | AWS S3 pre-signed URL to parse |
| `--method <method>` | `GET`, `POST` | HTTP method for the generated request |
| `--format <format>` | `bruno`, `postman`, `curl` | Output format |
| `--stdout` | _(boolean)_ | Print `{ filePath, content }` JSON to stdout instead of a human-readable message. Requires `--url`, `--method`, and `--format`. |

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
