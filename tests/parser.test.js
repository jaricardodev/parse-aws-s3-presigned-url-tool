import { parsePresignedUrl, decodeHtmlEntities } from '../src/parser.js';

const SAMPLE_URL =
  'https://my-bucket.s3.amazonaws.com/uploads/photo.jpg' +
  '?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
  '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20230101%2Fus-east-1%2Fs3%2Faws4_request' +
  '&X-Amz-Date=20230101T000000Z' +
  '&X-Amz-Expires=3600' +
  '&X-Amz-SignedHeaders=host' +
  '&X-Amz-Signature=abcdef1234567890';

describe('decodeHtmlEntities', () => {
  test('decodes &amp;', () => {
    expect(decodeHtmlEntities('foo&amp;bar')).toBe('foo&bar');
  });

  test('decodes &lt; and &gt;', () => {
    expect(decodeHtmlEntities('&lt;tag&gt;')).toBe('<tag>');
  });

  test('decodes &quot;', () => {
    expect(decodeHtmlEntities('say &quot;hello&quot;')).toBe('say "hello"');
  });

  test('decodes &#39; and &apos;', () => {
    expect(decodeHtmlEntities("it&#39;s &apos;fine&apos;")).toBe("it's 'fine'");
  });

  test('decodes decimal numeric entities', () => {
    expect(decodeHtmlEntities('&#65;')).toBe('A');
  });

  test('decodes hex numeric entities', () => {
    expect(decodeHtmlEntities('&#x41;')).toBe('A');
  });

  test('leaves plain strings unchanged', () => {
    expect(decodeHtmlEntities('hello world')).toBe('hello world');
  });
});

describe('parsePresignedUrl', () => {
  test('extracts baseUrl without query string', () => {
    const result = parsePresignedUrl(SAMPLE_URL);
    expect(result.baseUrl).toBe('https://my-bucket.s3.amazonaws.com/uploads/photo.jpg');
  });

  test('extracts protocol', () => {
    const result = parsePresignedUrl(SAMPLE_URL);
    expect(result.protocol).toBe('https');
  });

  test('extracts host', () => {
    const result = parsePresignedUrl(SAMPLE_URL);
    expect(result.host).toBe('my-bucket.s3.amazonaws.com');
  });

  test('extracts pathname', () => {
    const result = parsePresignedUrl(SAMPLE_URL);
    expect(result.pathname).toBe('/uploads/photo.jpg');
  });

  test('extracts all query parameters', () => {
    const result = parsePresignedUrl(SAMPLE_URL);
    const names = result.params.map((p) => p.name);
    expect(names).toContain('X-Amz-Algorithm');
    expect(names).toContain('X-Amz-Credential');
    expect(names).toContain('X-Amz-Date');
    expect(names).toContain('X-Amz-Expires');
    expect(names).toContain('X-Amz-SignedHeaders');
    expect(names).toContain('X-Amz-Signature');
  });

  test('percent-decodes parameter values', () => {
    const result = parsePresignedUrl(SAMPLE_URL);
    const cred = result.params.find((p) => p.name === 'X-Amz-Credential');
    expect(cred.value).toBe('AKIAIOSFODNN7EXAMPLE/20230101/us-east-1/s3/aws4_request');
  });

  test('decodes HTML entities in parameter values', () => {
    const urlWithEntities =
      'https://bucket.s3.amazonaws.com/key?foo=hello%26amp%3Bworld';
    const result = parsePresignedUrl(urlWithEntities);
    // %26amp%3B decodes to &amp; which then decodes to &
    expect(result.params[0].value).toBe('hello&world');
  });

  test('handles URL with no query parameters', () => {
    const result = parsePresignedUrl('https://bucket.s3.amazonaws.com/key');
    expect(result.params).toHaveLength(0);
    expect(result.baseUrl).toBe('https://bucket.s3.amazonaws.com/key');
  });
});
