import { prisma } from "@/lib/db"
import { rankWithGemini } from "./gemini-vision"

interface SearchCandidate {
  photoId: string
  description: string | null
  searchTags: string[]
}

export interface SearchResult {
  photoId: string
  relevanceScore: number
  matchReason: string
}

export async function searchGalleryPhotos(
  galleryId: string,
  query: string
): Promise<SearchResult[]> {
  // Stage 1: Retrieval — Postgres full-text search + tag matching
  const candidates = await retrieveCandidates(galleryId, query)

  if (candidates.length === 0) {
    return []
  }

  // For simple queries (single word), just return tag matches ranked by relevance
  if (query.trim().split(/\s+/).length <= 2 && candidates.length <= 10) {
    return candidates.map((c, i) => ({
      photoId: c.photoId,
      relevanceScore: 1 - i * 0.05,
      matchReason: `Matched tags: ${c.searchTags.slice(0, 3).join(", ")}`,
    }))
  }

  // Stage 2: LLM Ranking for complex queries
  return rankCandidates(candidates, query)
}

async function retrieveCandidates(
  galleryId: string,
  query: string
): Promise<SearchCandidate[]> {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1)

  // Full-text search on description + tag array matching
  const results = await prisma.$queryRaw<
    Array<{ photo_id: string; description: string | null; search_tags: string[]; rank: number }>
  >`
    SELECT
      pa.photo_id,
      pa.description,
      pa.search_tags,
      (
        COALESCE(ts_rank(to_tsvector('english', COALESCE(pa.description, '')), plainto_tsquery('english', ${query})), 0) * 2
        + CASE WHEN pa.search_tags && ${keywords}::text[] THEN 1 ELSE 0 END
      ) AS rank
    FROM photo_analyses pa
    WHERE pa.gallery_id = ${galleryId}
      AND pa.status = 'COMPLETED'
      AND (
        to_tsvector('english', COALESCE(pa.description, '')) @@ plainto_tsquery('english', ${query})
        OR pa.search_tags && ${keywords}::text[]
      )
    ORDER BY rank DESC
    LIMIT 50
  `

  return results.map((r) => ({
    photoId: r.photo_id,
    description: r.description,
    searchTags: r.search_tags,
  }))
}

async function rankCandidates(
  candidates: SearchCandidate[],
  query: string
): Promise<SearchResult[]> {
  const candidateDescriptions = candidates
    .map(
      (c, i) =>
        `[${i}] Photo ${c.photoId}: ${c.description || "No description"} (tags: ${c.searchTags.slice(0, 10).join(", ")})`
    )
    .join("\n")

  const prompt = `Given these photo descriptions from a gallery, rank them by relevance to the search query: "${query}"

Photos:
${candidateDescriptions}

Return ONLY a JSON array (no markdown fencing) of the top results sorted by relevance:
[{"index": 0, "relevanceScore": 0.95, "matchReason": "brief reason"}]

Rules:
- relevanceScore: 0.0 to 1.0
- Only include photos with relevanceScore > 0.3
- matchReason: 1 short sentence explaining why it matches
- Return at most 30 results`

  try {
    const rawResponse = await rankWithGemini(prompt)
    const jsonStr = rawResponse
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim()

    const ranked = JSON.parse(jsonStr) as Array<{
      index: number
      relevanceScore: number
      matchReason: string
    }>

    return ranked
      .filter((r) => r.index >= 0 && r.index < candidates.length && r.relevanceScore > 0.3)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .map((r) => ({
        photoId: candidates[r.index].photoId,
        relevanceScore: r.relevanceScore,
        matchReason: r.matchReason,
      }))
  } catch (error) {
    console.error("LLM ranking failed, returning retrieval results:", error)
    // Fallback: return retrieval results without ranking
    return candidates.map((c, i) => ({
      photoId: c.photoId,
      relevanceScore: 1 - i * 0.02,
      matchReason: "Matched by text search",
    }))
  }
}
