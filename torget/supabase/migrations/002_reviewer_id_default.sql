ALTER TABLE reviews
  ALTER COLUMN reviewer_id SET DEFAULT auth.uid();
