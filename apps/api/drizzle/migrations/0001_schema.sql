-- Enums
DO $$ BEGIN
  CREATE TYPE listing_category AS ENUM ('electronics', 'clothing', 'furniture', 'sports', 'books', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_condition AS ENUM ('new', 'like_new', 'good', 'used', 'for_parts');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_type AS ENUM ('sale', 'wanted', 'free');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'sold', 'expired', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url   text,
  bio          text,
  city         text,
  avg_rating   numeric(2,1),
  review_count integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  price        integer,
  category     listing_category NOT NULL,
  condition    listing_condition NOT NULL,
  listing_type listing_type NOT NULL,
  status       listing_status NOT NULL DEFAULT 'active',
  location     point,
  city         text,
  search_vector tsvector,
  view_count   integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  expires_at   timestamptz DEFAULT now() + interval '30 days'
);

CREATE INDEX IF NOT EXISTS listings_search_idx ON listings USING gin(search_vector);
CREATE INDEX IF NOT EXISTS listings_location_idx ON listings USING gist(location);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE INDEX IF NOT EXISTS listings_seller_idx ON listings(seller_id);

CREATE TABLE IF NOT EXISTS listing_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url        text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  rating      integer NOT NULL,
  comment     text,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT no_self_review CHECK (reviewer_id != reviewed_id)
);
