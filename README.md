# parse-aws-s3-presigned-url-tool

An interactive Node.js CLI tool that parses an AWS S3 pre-signed URL and exports it as a **Bruno** or **Postman** collection you can import directly.

## Features

- Interactive prompts – no flags to memorise
- **GET mode** – keeps all query parameters as URL parameters
- **POST mode** – converts every query parameter into a multipart form field (HTML entities in values are decoded automatically)
- **Bruno** output – generates a Bruno collection JSON (`output/bruno-collection.json`)
- **Postman** output – generates a Postman Collection v2.1 JSON (`output/postman-collection.json`)

## Requirements

- Node.js ≥ 18

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

The CLI will ask you three questions:

1. **URL** – paste your AWS S3 pre-signed URL
2. **Method** – `GET` (query params) or `POST` (multipart form fields)
3. **Format** – `Bruno` or `Postman`

The generated file is written to the `output/` directory in the current working directory.

## Running Tests

```bash
npm test
```

## Project Structure

```
src/
  index.js               # Interactive CLI entry point
  parser.js              # URL parsing and HTML-entity decoding
  generators/
    bruno.js             # Bruno collection generator
    postman.js           # Postman Collection v2.1 generator
tests/
  parser.test.js
  generators/
    bruno.test.js
    postman.test.js
```
