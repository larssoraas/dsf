import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../lib/db';
import { reviews, profiles } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import type { CreateReviewInput } from '@torget/shared';

interface ProfileParams {
  id: string;
}

export async function reviewsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /profiles/:id/reviews — public list of reviews for a profile
  fastify.get(
    '/profiles/:id/reviews',
    async (
      request: FastifyRequest<{ Params: ProfileParams }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;

      const rows = await db
        .select({
          review: reviews,
          reviewer: {
            displayName: profiles.displayName,
            avatarUrl: profiles.avatarUrl,
          },
        })
        .from(reviews)
        .leftJoin(profiles, eq(profiles.id, reviews.reviewerId))
        .where(eq(reviews.reviewedId, id))
        .orderBy(sql`${reviews.createdAt} DESC`);

      const data = rows.map((row) => ({
        ...row.review,
        reviewer: row.reviewer,
      }));

      return reply.send({ data });
    },
  );

  // POST /reviews — create a review (requires auth)
  fastify.post<{ Body: CreateReviewInput }>(
    '/',
    {
      preHandler: fastify.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['reviewedId', 'listingId', 'rating'],
          properties: {
            reviewedId: { type: 'string', format: 'uuid' },
            listingId: { type: 'string', format: 'uuid' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { reviewedId, listingId, rating, comment } = request.body;
      const reviewerId = request.user.id;

      if (reviewerId === reviewedId) {
        return reply.code(403).send({ error: 'Cannot review yourself' });
      }

      if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return reply
          .code(400)
          .send({ error: 'Rating must be an integer between 1 and 5' });
      }

      const newReview = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(reviews)
          .values({
            reviewerId, // Set from request.user.id — never from body
            reviewedId,
            listingId,
            rating,
            comment: comment ?? null,
          })
          .returning();

        if (!inserted) {
          throw new Error('Failed to create review: no row returned');
        }

        // Update reviewed profile: recalculate avg_rating, increment review_count
        await tx
          .update(profiles)
          .set({
            avgRating: sql`(
              SELECT CAST(AVG(rating) AS NUMERIC(2,1))
              FROM reviews
              WHERE reviewed_id = ${reviewedId}
            )`,
            reviewCount: sql`${profiles.reviewCount} + 1`,
          })
          .where(eq(profiles.id, reviewedId));

        return inserted;
      });

      return reply.code(201).send({ data: newReview });
    },
  );
}
