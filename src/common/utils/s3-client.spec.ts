describe('R2 configuration', () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; jest.resetModules(); jest.dontMock('aws-sdk'); });
  it('requires R2 credentials rather than falling back to AWS', () => {
    process.env.R2_ENDPOINT = '';
    process.env.AWS_ACCESS_KEY_ID = 'legacy-key';
    const { getS3Client } = require('./s3-client');
    expect(() => getS3Client()).toThrow('R2_ENDPOINT');
  });
  it('configures and caches the R2 client', () => {
    const S3 = jest.fn(() => ({}));
    jest.doMock('aws-sdk', () => ({ S3 }));
    Object.assign(process.env, { R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com', R2_ACCESS_KEY_ID: 'r2-key', R2_SECRET_ACCESS_KEY: 'r2-secret', R2_REGION: 'auto', R2_BUCKET_NAME: 'r2-bucket' });
    const { getS3Client, getS3BucketName } = require('./s3-client');
    expect(getS3Client()).toBe(getS3Client());
    expect(S3).toHaveBeenCalledTimes(1);
    expect(S3).toHaveBeenCalledWith(expect.objectContaining({ endpoint: process.env.R2_ENDPOINT, region: 'auto', signatureVersion: 'v4', s3ForcePathStyle: true, accessKeyId: 'r2-key' }));
    expect(getS3BucketName()).toBe('r2-bucket');
  });
});
