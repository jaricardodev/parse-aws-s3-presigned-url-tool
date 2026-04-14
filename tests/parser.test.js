import { parsePresignedUrl, parsePresignedUrlToJson, decodeHtmlEntities } from '../src/parser.js';

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

// ─────────────────────────────────────────────────────────────────────────────
// parsePresignedUrlToJson
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_URL_WITH_REGION =
  'https://my-bucket.s3.us-west-2.amazonaws.com/uploads/photo.jpg' +
  '?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
  '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20230101%2Fus-west-2%2Fs3%2Faws4_request' +
  '&X-Amz-Date=20230101T000000Z' +
  '&X-Amz-Expires=3600' +
  '&X-Amz-SignedHeaders=host' +
  '&X-Amz-Signature=abcdef1234567890';

describe('parsePresignedUrlToJson', () => {
  test('preserves the original url', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.url).toBe(SAMPLE_URL_WITH_REGION);
  });

  test('extracts baseUrl', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.baseUrl).toBe(
      'https://my-bucket.s3.us-west-2.amazonaws.com/uploads/photo.jpg'
    );
  });

  test('extracts protocol', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.protocol).toBe('https');
  });

  test('extracts host', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.host).toBe('my-bucket.s3.us-west-2.amazonaws.com');
  });

  test('extracts bucket from virtual-hosted-style hostname', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.bucket).toBe('my-bucket');
  });

  test('extracts region from hostname', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.region).toBe('us-west-2');
  });

  test('falls back to region from credential scope when not in hostname', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL); // SAMPLE_URL has no region in host
    expect(result.region).toBe('us-east-1');
  });

  test('extracts key (pathname without leading slash)', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.key).toBe('uploads/photo.jpg');
  });

  test('extracts pathname with leading slash', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.pathname).toBe('/uploads/photo.jpg');
  });

  test('extracts algorithm', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.algorithm).toBe('AWS4-HMAC-SHA256');
  });

  test('extracts full credential string', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.credential).toBe(
      'AKIAIOSFODNN7EXAMPLE/20230101/us-west-2/s3/aws4_request'
    );
  });

  test('splits accessKeyId from credential', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
  });

  test('splits credentialDate from credential', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.credentialDate).toBe('20230101');
  });

  test('extracts date', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.date).toBe('20230101T000000Z');
  });

  test('extracts expires', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.expires).toBe('3600');
  });

  test('extracts signedHeaders', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.signedHeaders).toBe('host');
  });

  test('extracts signature', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.signature).toBe('abcdef1234567890');
  });

  test('securityToken is null when absent', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.securityToken).toBeNull();
  });

  test('securityToken is present when X-Amz-Security-Token is in the URL', () => {
    const urlWithToken =
      SAMPLE_URL_WITH_REGION + '&X-Amz-Security-Token=MySessionToken123';
    const result = parsePresignedUrlToJson(urlWithToken);
    expect(result.securityToken).toBe('MySessionToken123');
  });

  test('params contains all query parameters as a flat object', () => {
    const result = parsePresignedUrlToJson(SAMPLE_URL_WITH_REGION);
    expect(result.params['X-Amz-Algorithm']).toBe('AWS4-HMAC-SHA256');
    expect(result.params['X-Amz-Expires']).toBe('3600');
    expect(result.params['X-Amz-Signature']).toBe('abcdef1234567890');
  });

  test('params includes non-standard query parameters', () => {
    const urlWithExtra = SAMPLE_URL_WITH_REGION + '&custom-param=hello';
    const result = parsePresignedUrlToJson(urlWithExtra);
    expect(result.params['custom-param']).toBe('hello');
  });

  // ── Presigned POST URL (key is a query/form param, not in the pathname) ──
  const PRESIGNED_POST_URL =
    'https://my-bucket.s3.us-east-1.amazonaws.com/' +
    '?content-type=audio%2Fmpeg' +
    '&x-amz-meta-app-name=MyApp' +
    '&x-amz-meta-user-id=user-123' +
    '&x-amz-meta-voice-journal-id=vj-456' +
    '&bucket=my-bucket' +
    '&X-Amz-Algorithm=AWS4-HMAC-SHA256' +
    '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20230101%2Fus-east-1%2Fs3%2Faws4_request' +
    '&X-Amz-Date=20230101T000000Z' +
    '&X-Amz-Security-Token=FwoGZXIvYXdzEH' +
    '&key=uploads%2Fuser-123%2Fentry.mp3' +
    '&Policy=eyJleHBpcmF0aW9uIjoiMjAyMy0wMS0wMVQwMTowMDowMFoifQ==' +
    '&X-Amz-Signature=deadbeef1234567890';

  test('presigned POST URL: key is extracted from the key query parameter', () => {
    const result = parsePresignedUrlToJson(PRESIGNED_POST_URL);
    expect(result.key).toBe('uploads/user-123/entry.mp3');
  });

  test('presigned POST URL: bucket extracted from hostname', () => {
    const result = parsePresignedUrlToJson(PRESIGNED_POST_URL);
    expect(result.bucket).toBe('my-bucket');
  });

  test('presigned POST URL: region extracted from hostname', () => {
    const result = parsePresignedUrlToJson(PRESIGNED_POST_URL);
    expect(result.region).toBe('us-east-1');
  });

  test('presigned POST URL: algorithm extracted', () => {
    const result = parsePresignedUrlToJson(PRESIGNED_POST_URL);
    expect(result.algorithm).toBe('AWS4-HMAC-SHA256');
  });

  test('presigned POST URL: securityToken extracted', () => {
    const result = parsePresignedUrlToJson(PRESIGNED_POST_URL);
    expect(result.securityToken).toBe('FwoGZXIvYXdzEH');
  });

  test('presigned POST URL: signature extracted', () => {
    const result = parsePresignedUrlToJson(PRESIGNED_POST_URL);
    expect(result.signature).toBe('deadbeef1234567890');
  });

  test('presigned POST URL: meta params present in params map', () => {
    const result = parsePresignedUrlToJson(PRESIGNED_POST_URL);
    expect(result.params['x-amz-meta-app-name']).toBe('MyApp');
    expect(result.params['x-amz-meta-user-id']).toBe('user-123');
    expect(result.params['x-amz-meta-voice-journal-id']).toBe('vj-456');
    expect(result.params['content-type']).toBe('audio/mpeg');
    expect(result.params['Policy']).toBe('eyJleHBpcmF0aW9uIjoiMjAyMy0wMS0wMVQwMTowMDowMFoifQ==');
  });

  test('bucket is null for path-style URLs', () => {
    const pathStyleUrl =
      'https://s3.us-east-1.amazonaws.com/my-bucket/file.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
      '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20230101%2Fus-east-1%2Fs3%2Faws4_request' +
      '&X-Amz-Date=20230101T000000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host' +
      '&X-Amz-Signature=abcdef1234567890';
    const result = parsePresignedUrlToJson(pathStyleUrl);
    expect(result.bucket).toBeNull();
    expect(result.region).toBe('us-east-1');
  });
});
