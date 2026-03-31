import { generateCurlCommand } from '../../src/generators/curl.js';

const PARAMS = [
  { name: 'X-Amz-Algorithm', value: 'AWS4-HMAC-SHA256' },
  { name: 'X-Amz-Expires', value: '3600' },
  { name: 'X-Amz-Signature', value: 'abcdef1234' },
];

const BASE = 'https://my-bucket.s3.amazonaws.com/uploads/photo.jpg';

const PARSED_GET = { baseUrl: BASE, params: PARAMS, method: 'GET' };
const PARSED_POST = { baseUrl: BASE, params: PARAMS, method: 'POST' };

describe('generateCurlCommand – GET', () => {
  let cmd;
  beforeEach(() => {
    cmd = generateCurlCommand(PARSED_GET);
  });

  test('starts with curl --request GET', () => {
    expect(cmd).toMatch(/^curl --request GET/);
  });

  test('includes --url flag', () => {
    expect(cmd).toContain('--url');
  });

  test('base URL is present in the command', () => {
    expect(cmd).toContain('my-bucket.s3.amazonaws.com/uploads/photo.jpg');
  });

  test('query string contains all param names', () => {
    expect(cmd).toContain('X-Amz-Algorithm');
    expect(cmd).toContain('X-Amz-Expires');
    expect(cmd).toContain('X-Amz-Signature');
  });

  test('query string contains encoded param values', () => {
    expect(cmd).toContain('AWS4-HMAC-SHA256');
    expect(cmd).toContain('3600');
    expect(cmd).toContain('abcdef1234');
  });

  test('does not include --form flags', () => {
    expect(cmd).not.toContain('--form');
  });

  test('does not include --request POST', () => {
    expect(cmd).not.toContain('POST');
  });

  test('handles empty params (no query string)', () => {
    const result = generateCurlCommand({ baseUrl: BASE, params: [], method: 'GET' });
    expect(result).toContain(BASE);
    expect(result).not.toContain('?');
  });

  test('percent-encodes special characters in param values', () => {
    const result = generateCurlCommand({
      baseUrl: BASE,
      params: [{ name: 'foo', value: 'a b&c' }],
      method: 'GET',
    });
    expect(result).toContain('a%20b%26c');
  });

  test('single-quotes containing a single-quote are properly escaped', () => {
    const result = generateCurlCommand({
      baseUrl: "https://bucket.s3.amazonaws.com/key",
      params: [{ name: 'q', value: "it's" }],
      method: 'GET',
    });
    // shellEscape wraps in single-quotes and escapes embedded single-quotes as '\''
    expect(result).toContain("'\\''");
  });
});

describe('generateCurlCommand – POST', () => {
  let cmd;
  beforeEach(() => {
    cmd = generateCurlCommand(PARSED_POST);
  });

  test('starts with curl --request POST', () => {
    expect(cmd).toMatch(/^curl --request POST/);
  });

  test('includes --url flag with base URL', () => {
    expect(cmd).toContain('--url');
    expect(cmd).toContain('my-bucket.s3.amazonaws.com/uploads/photo.jpg');
  });

  test('contains a --form flag for each parameter', () => {
    const formCount = (cmd.match(/--form/g) || []).length;
    expect(formCount).toBe(PARAMS.length);
  });

  test('each param name appears in a --form flag', () => {
    expect(cmd).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(cmd).toContain('X-Amz-Expires=3600');
    expect(cmd).toContain('X-Amz-Signature=abcdef1234');
  });

  test('does not append a query string to the URL', () => {
    const urlLine = cmd.split('\n').find((l) => l.includes('--url'));
    expect(urlLine).not.toContain('?');
  });

  test('does not include --request GET', () => {
    expect(cmd).not.toContain('GET');
  });

  test('handles empty params (no --form flags)', () => {
    const result = generateCurlCommand({ baseUrl: BASE, params: [], method: 'POST' });
    expect(result).not.toContain('--form');
    expect(result).toContain(BASE);
  });

  test('single-quotes in form values are properly escaped', () => {
    const result = generateCurlCommand({
      baseUrl: BASE,
      params: [{ name: 'key', value: "it's" }],
      method: 'POST',
    });
    // shellEscape wraps in single-quotes and escapes embedded single-quotes as '\''
    expect(result).toContain("'\\''");
  });
});
