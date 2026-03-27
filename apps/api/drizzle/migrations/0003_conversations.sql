CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (listing_id, buyer_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         text NOT NULL,
  type            text NOT NULL DEFAULT 'message',
  offer_amount    integer,
  offer_status    text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS conversations_buyer_idx ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS conversations_seller_idx ON conversations(seller_id);
