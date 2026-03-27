import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../lib/db';
import { conversations, messages, listings, profiles } from '../../drizzle/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

interface ConversationParams {
  id: string;
}

interface OfferParams {
  id: string;
  msgId: string;
}

interface CreateConversationBody {
  listingId: string;
}

interface CreateMessageBody {
  content: string;
  type?: 'message' | 'offer';
  offerAmount?: number;
}

export async function conversationsRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /conversations — start or retrieve existing conversation
  fastify.post<{ Body: CreateConversationBody }>(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['listingId'],
          properties: {
            listingId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateConversationBody }>, reply: FastifyReply) => {
      const { listingId } = request.body;
      const buyerId = request.user.id;

      // Fetch listing to get seller_id from DB — never trust client
      const [listing] = await db
        .select({ id: listings.id, sellerId: listings.sellerId })
        .from(listings)
        .where(eq(listings.id, listingId))
        .limit(1);

      if (!listing) {
        return reply.code(404).send({ error: 'Annonsen finnes ikke' });
      }

      const sellerId = listing.sellerId;

      if (buyerId === sellerId) {
        return reply.code(400).send({ error: 'Kan ikke starte samtale med deg selv' });
      }

      // Upsert — ON CONFLICT DO NOTHING, then fetch existing if insert returned nothing
      const inserted = await db
        .insert(conversations)
        .values({ listingId, buyerId, sellerId })
        .onConflictDoNothing()
        .returning();

      let conversation = inserted[0];

      if (!conversation) {
        // Row already existed — fetch the existing conversation for this buyer+listing
        const existing = await db
          .select()
          .from(conversations)
          .where(and(
            eq(conversations.listingId, listingId),
            eq(conversations.buyerId, buyerId),
          ))
          .limit(1);

        conversation = existing[0];

        if (!conversation) {
          return reply.code(500).send({ error: 'Kunne ikke opprette samtale' });
        }
      }

      return reply.code(201).send({ data: conversation });
    },
  );

  // GET /conversations — list all conversations where user is buyer or seller
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;

      const rows = await db.execute<{
        id: string;
        listing_id: string;
        listing_title: string;
        buyer_id: string;
        seller_id: string;
        other_party_name: string | null;
        created_at: string;
      }>(sql`
        SELECT
          c.id,
          c.listing_id,
          l.title AS listing_title,
          c.buyer_id,
          c.seller_id,
          CASE
            WHEN c.buyer_id = ${userId} THEN sp.display_name
            ELSE bp.display_name
          END AS other_party_name,
          c.created_at
        FROM conversations c
        JOIN listings l ON l.id = c.listing_id
        LEFT JOIN profiles bp ON bp.id = c.buyer_id
        LEFT JOIN profiles sp ON sp.id = c.seller_id
        WHERE c.buyer_id = ${userId} OR c.seller_id = ${userId}
        ORDER BY c.created_at DESC
      `);

      const data = rows.rows.map((row) => ({
        id: row.id,
        listingId: row.listing_id,
        listingTitle: row.listing_title,
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        otherPartyName: row.other_party_name ?? null,
        createdAt: row.created_at,
      }));

      return reply.send({ data });
    },
  );

  // GET /conversations/:id/messages — list messages in a conversation
  fastify.get<{ Params: ConversationParams }>(
    '/:id/messages',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: ConversationParams }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = request.user.id;

      const [conv] = await db
        .select({ buyerId: conversations.buyerId, sellerId: conversations.sellerId })
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);

      if (!conv) {
        return reply.code(404).send({ error: 'Samtalen finnes ikke' });
      }

      if (conv.buyerId !== userId && conv.sellerId !== userId) {
        return reply.code(403).send({ error: 'Ingen tilgang til denne samtalen' });
      }

      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(sql`${messages.createdAt} ASC`);

      return reply.send({ data: rows });
    },
  );

  // POST /conversations/:id/messages — send a message
  fastify.post<{ Params: ConversationParams; Body: CreateMessageBody }>(
    '/:id/messages',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1 },
            type: { type: 'string', enum: ['message', 'offer'] },
            offerAmount: { type: 'number' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ConversationParams; Body: CreateMessageBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;
      const { content, type = 'message', offerAmount } = request.body;
      const senderId = request.user.id;

      const [conv] = await db
        .select({ buyerId: conversations.buyerId, sellerId: conversations.sellerId })
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);

      if (!conv) {
        return reply.code(404).send({ error: 'Samtalen finnes ikke' });
      }

      if (conv.buyerId !== senderId && conv.sellerId !== senderId) {
        return reply.code(403).send({ error: 'Ingen tilgang til denne samtalen' });
      }

      if (type === 'offer') {
        if (!offerAmount || offerAmount <= 0) {
          return reply
            .code(400)
            .send({ error: 'Bud krever et beløp større enn 0' });
        }
      }

      const [newMessage] = await db
        .insert(messages)
        .values({
          conversationId: id,
          senderId,
          content,
          type,
          offerAmount: type === 'offer' ? offerAmount : null,
          offerStatus: null,
        })
        .returning();

      if (!newMessage) {
        request.log.error('Failed to insert message: no row returned');
        return reply.code(500).send({ error: 'Kunne ikke sende melding' });
      }

      return reply.code(201).send({ data: newMessage });
    },
  );

  // POST /conversations/:id/offers/:msgId/accept — seller accepts a bid
  fastify.post<{ Params: OfferParams }>(
    '/:id/offers/:msgId/accept',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: OfferParams }>, reply: FastifyReply) => {
      const { id, msgId } = request.params;
      const userId = request.user.id;

      const [conv] = await db
        .select({ sellerId: conversations.sellerId, listingId: conversations.listingId })
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);

      if (!conv) {
        return reply.code(404).send({ error: 'Samtalen finnes ikke' });
      }

      if (conv.sellerId !== userId) {
        return reply.code(403).send({ error: 'Kun selger kan akseptere bud' });
      }

      const [msg] = await db
        .select({ id: messages.id, type: messages.type, offerStatus: messages.offerStatus })
        .from(messages)
        .where(and(eq(messages.id, msgId), eq(messages.conversationId, id)))
        .limit(1);

      if (!msg || msg.type !== 'offer') {
        return reply.code(400).send({ error: 'Meldingen er ikke et bud' });
      }

      if (msg.offerStatus !== null) {
        return reply.code(400).send({ error: 'Budet er allerede behandlet' });
      }

      // Atomic accept — only updates if offerStatus is still NULL (race-condition guard)
      await db.transaction(async (tx) => {
        await tx
          .update(messages)
          .set({ offerStatus: 'accepted' })
          .where(and(eq(messages.id, msgId), eq(messages.conversationId, id), isNull(messages.offerStatus)));

        await tx
          .update(listings)
          .set({ status: 'sold' })
          .where(eq(listings.id, conv.listingId));
      });

      return reply.send({ status: 'accepted' });
    },
  );

  // POST /conversations/:id/offers/:msgId/decline — seller declines a bid
  fastify.post<{ Params: OfferParams }>(
    '/:id/offers/:msgId/decline',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: OfferParams }>, reply: FastifyReply) => {
      const { id, msgId } = request.params;
      const userId = request.user.id;

      const [conv] = await db
        .select({ sellerId: conversations.sellerId })
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);

      if (!conv) {
        return reply.code(404).send({ error: 'Samtalen finnes ikke' });
      }

      if (conv.sellerId !== userId) {
        return reply.code(403).send({ error: 'Kun selger kan avslå bud' });
      }

      const [msg] = await db
        .select({ id: messages.id, type: messages.type, offerStatus: messages.offerStatus })
        .from(messages)
        .where(and(eq(messages.id, msgId), eq(messages.conversationId, id)))
        .limit(1);

      if (!msg || msg.type !== 'offer') {
        return reply.code(400).send({ error: 'Meldingen er ikke et bud' });
      }

      if (msg.offerStatus !== null) {
        return reply.code(400).send({ error: 'Budet er allerede behandlet' });
      }

      const result = await db
        .update(messages)
        .set({ offerStatus: 'declined' })
        .where(and(eq(messages.id, msgId), eq(messages.conversationId, id), isNull(messages.offerStatus)));

      if (result.rowCount === 0) {
        return reply.code(400).send({ error: 'Budet er allerede behandlet' });
      }

      return reply.send({ status: 'declined' });
    },
  );
}
