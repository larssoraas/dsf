import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';

const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadsRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /uploads/image — upload image to MinIO (requires auth)
  fastify.post(
    '/image',
    { preHandler: fastify.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let filePart: MultipartFile | undefined;

      try {
        filePart = await request.file();
      } catch (err) {
        console.error('Failed to parse multipart request:', err);
        return reply.code(400).send({ error: 'Invalid multipart request' });
      }

      if (!filePart) {
        return reply.code(400).send({ error: 'No file uploaded. Use field name "image"' });
      }

      const { mimetype, filename } = filePart;

      if (!ALLOWED_MIMETYPES.has(mimetype)) {
        return reply
          .code(400)
          .send({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' });
      }

      // Collect the stream into a buffer
      const chunks: Buffer[] = [];
      for await (const chunk of filePart.file) {
        chunks.push(chunk);
        const total = chunks.reduce((sum, c) => sum + c.length, 0);
        if (total > MAX_SIZE_BYTES) {
          return reply
            .code(400)
            .send({ error: 'File too large. Maximum size is 5 MB.' });
        }
      }

      const buffer = Buffer.concat(chunks);

      let url: string;
      try {
        url = await fastify.uploadImage(buffer, filename ?? 'upload', mimetype);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        console.error('Image upload failed:', message);
        // Propagate validation errors (400) from uploadImage
        if (err instanceof Error && 'statusCode' in err && err.statusCode === 400) {
          return reply.code(400).send({ error: message });
        }
        return reply.code(500).send({ error: 'Failed to upload image' });
      }

      return reply.code(201).send({ data: { url } });
    },
  );
}
