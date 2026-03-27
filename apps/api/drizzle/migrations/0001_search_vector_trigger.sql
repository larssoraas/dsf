-- Trigger to maintain search_vector on listings table
-- This replaces the GENERATED ALWAYS AS approach from the Supabase migration,
-- since Drizzle ORM does not support generated columns natively.

CREATE OR REPLACE FUNCTION listings_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('norwegian',
      coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '')
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description
  ON listings
  FOR EACH ROW
  EXECUTE FUNCTION listings_search_vector_update();
