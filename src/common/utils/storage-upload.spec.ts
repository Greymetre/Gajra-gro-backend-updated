import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { uploadImages } from './storage-upload';
import { getS3Client, getS3BucketName } from './s3-client';

jest.mock('./s3-client', () => ({ getS3Client: jest.fn(), getS3BucketName: jest.fn() }));

describe('R2 image uploads', () => {
  let directory: string;
  let upload: jest.Mock;
  let deleteObject: jest.Mock;
  beforeEach(async () => {
    directory = await fs.mkdtemp(join(tmpdir(), 'gajra-r2-'));
    upload = jest.fn(({ Body }) => ({ promise: async () => {
      for await (const chunk of Body) { /* consume the real file stream */ }
      return { Location: 'https://different-provider-host/ignored' };
    } }));
    deleteObject = jest.fn(() => ({ promise: async () => ({}) }));
    (getS3BucketName as jest.Mock).mockReturnValue('test-bucket');
    (getS3Client as jest.Mock).mockReturnValue({ upload, deleteObject });
  });
  afterEach(async () => { jest.clearAllMocks(); await fs.rm(directory, { recursive: true, force: true }); });
  const request = { url: '/api/user/products/example?x=1' };
  async function file(name: string, mimetype = 'image/png') {
    const path = join(directory, name);
    await fs.writeFile(path, 'test image');
    return { path, filename: name, mimetype } as Express.Multer.File;
  }
  it('returns stable object keys and removes temporary files', async () => {
    const input = await file('one.png');
    expect(await uploadImages(request, [input])).toEqual(['uploaded/products/one.png']);
    expect(upload.mock.calls[0][0]).toMatchObject({ Bucket: 'test-bucket', Key: 'uploaded/products/one.png', ContentType: 'image/png' });
    await expect(fs.stat(input.path)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('rejects unsupported files before uploading any and cleans the batch', async () => {
    const files = [await file('one.png'), await file('two.pdf', 'application/pdf')];
    await expect(uploadImages(request, files)).rejects.toThrow('Only JPEG and PNG');
    expect(upload).not.toHaveBeenCalled();
    expect(await fs.readdir(directory)).toEqual([]);
  });
  it('preserves storage errors, rolls back completed keys and cleans temporary files', async () => {
    const normal = upload.getMockImplementation();
    upload.mockImplementationOnce(normal).mockImplementationOnce(() => ({ promise: async () => { throw new Error('AccessDenied'); } }));
    await expect(uploadImages(request, [await file('one.png'), await file('two.png')])).rejects.toThrow('AccessDenied');
    expect(deleteObject).toHaveBeenCalledWith({ Bucket: 'test-bucket', Key: 'uploaded/products/one.png' });
    expect(await fs.readdir(directory)).toEqual([]);
  });
  it('handles absent files and rejects the old banner string argument', async () => {
    expect(await uploadImages(request)).toEqual([]);
    await expect(uploadImages(request, 'file.png' as any)).rejects.toThrow('Expected an array');
  });
});
