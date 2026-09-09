import { BadRequestException } from '@nestjs/common';
import { createReadStream, promises as fs } from 'fs';
import { once } from 'events';
import { getS3BucketName, getS3Client } from './s3-client';

export const uploadStoredFile = async (file: Express.Multer.File, folder: string): Promise<string> => {
  const key = `uploaded/${folder}/${file.filename}`;
  const client = getS3Client();
  const bucket = getS3BucketName();
  const stream = createReadStream(file.path);
  const closed = new Promise<void>(resolve => stream.once('close', resolve));
  try {
    await once(stream, 'open');
    await client.upload({ Bucket: bucket, Key: key, Body: stream, ContentType: file.mimetype }).promise();
    return key;
  } finally {
    stream.destroy();
    await closed;
  }
};

export const uploadImages = async (req: { url: string }, files?: Express.Multer.File[]): Promise<string[]> => {
  if (!files) return [];
  if (!Array.isArray(files)) throw new BadRequestException('Expected an array of uploaded files');
  const keys: string[] = [];
  try {
    const folder = req.url.split('?')[0].split('/')[3];
    if (!folder || !/^[a-zA-Z0-9_-]+$/.test(folder)) {
      throw new BadRequestException('Invalid upload folder');
    }
    if (files.some(file => !['image/jpeg', 'image/png'].includes(file.mimetype))) {
      throw new BadRequestException('Only JPEG and PNG files are allowed.');
    }
    // Sequential uploads allow completed objects to be rolled back on a partial failure.
    for (const file of files) keys.push(await uploadStoredFile(file, folder));
    return keys;
  } catch (error) {
    await Promise.allSettled(keys.map(Key => getS3Client().deleteObject({ Bucket: getS3BucketName(), Key }).promise()));
    throw error;
  } finally {
    await Promise.all(files.map(file => fs.unlink(file.path).catch(error => {
      if (error.code !== 'ENOENT') console.error('Could not clean up temporary upload:', error.code);
    })));
  }
};
