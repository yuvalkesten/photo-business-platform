-- Full-text search GIN index on photo analysis descriptions
CREATE INDEX idx_photo_analyses_description_fts
ON "photo_analyses" USING gin(to_tsvector('english', coalesce(description, '')));
