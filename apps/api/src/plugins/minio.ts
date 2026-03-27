import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

declare module 'fastify' {
  interface FastifyInstance {
    s3: S3Client;
    uploadImage(
      buffer: Buffer,
      filename: string,
      mimetype: string,
    ): Promise<string>;
  }
}

async function minioPlugin(fastify: FastifyInstance): Promise<void> {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKeyId = process.env.MINIO_ACCESS_KEY;
  const secretAccessKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET ?? 'listing-images';
  const publicUrl = process.env.MINIO_PUBLIC_URL ?? endpoint;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY environment variables are required',
    );
  }

  const s3 = new S3Client({
    endpoint,
    region: process.env.MINIO_REGION ?? 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true, // Required for MinIO
  });

  fastify.decorate('s3', s3);

  fastify.decorate(
    'uploadImage',
    async (
      buffer: Buffer,
      filename: string,
      mimetype: string,
    ): Promise<string> => {
      if (!ALLOWED_MIMETYPES.has(mimetype)) {
        throw Object.assign(
          new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'),
          { statusCode: 400 },
        );
      }

      if (buffer.length > MAX_SIZE_BYTES) {
        throw Object.assign(new Error('File too large. Maximum size is 5 MB.'), {
          statusCode: 400,
        });
      }

      const extension = mimetype.split('/')[1] ?? 'jpg';
      const key = `${randomUUID()}-${filename}.${extension}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
        }),
      );

      return `${publicUrl}/${bucket}/${key}`;
    },
  );
}

export default fp(minioPlugin, { name: 'minio' });
