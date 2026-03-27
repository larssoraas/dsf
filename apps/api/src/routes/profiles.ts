import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../lib/db';
import { profiles, listings } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

interface ProfileParams {
  id: string;
}

interface UpdateProfileBody {
  displayName?: string;
  city?: string;
  avatarUrl?: string;
}

export async function profilesRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /profiles/:id — public profile with active listings
  fastify.get(
    '/:id',
    async (
      request: FastifyRequest<{ Params: ProfileParams }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, id))
        .limit(1);

      if (!profile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }

      const activeListings = await db
        .select()
        .from(listings)
        .where(and(eq(listings.sellerId, id), eq(listings.status, 'active')))
        .orderBy(sql`${listings.createdAt} DESC`)
        .limit(10);

      return reply.send({
        data: {
          ...profile,
          activeListings,
        },
      });
    },
  );

  // PATCH /profiles/me — update own profile (requires auth)
  fastify.patch(
    '/me',
    { preHandler: fastify.authenticate },
    async (
      request: FastifyRequest<{ Body: UpdateProfileBody }>,
      reply: FastifyReply,
    ) => {
      const userId = request.user.id;
      const { displayName, city, avatarUrl } = request.body;

      const updateData: Partial<typeof profiles.$inferInsert> = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (city !== undefined) updateData.city = city;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

      if (Object.keys(updateData).length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      const [updated] = await db
        .update(profiles)
        .set(updateData)
        .where(eq(profiles.id, userId))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: 'Profile not found' });
      }

      return reply.send({ data: updated });
    },
  );
}
