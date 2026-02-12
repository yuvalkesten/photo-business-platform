-- GIN index on search_tags array for fast overlap queries (&&)
CREATE INDEX idx_photo_analyses_search_tags_gin
ON "photo_analyses" USING gin("searchTags");
