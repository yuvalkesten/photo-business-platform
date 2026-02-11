import type { CVDetectedFace } from "./types"

function ageRangeToLabel(age?: { low: number; high: number }): string {
  if (!age) return "unknown"
  const mid = (age.low + age.high) / 2
  if (mid < 13) return "child"
  if (mid < 18) return "teen"
  if (mid < 30) return "young_adult"
  if (mid < 60) return "adult"
  return "senior"
}

function topEmotion(
  emotions?: Array<{ type: string; confidence: number }>
): string {
  if (!emotions || emotions.length === 0) return "neutral"
  const top = emotions.reduce((a, b) =>
    a.confidence > b.confidence ? a : b
  )
  return top.type.toLowerCase()
}

export function buildHybridPrompt(cvFaces: CVDetectedFace[]): string {
  const faceLines = cvFaces.map((f, i) => {
    const age = ageRangeToLabel(f.ageRange)
    const emotion = topEmotion(f.emotions)
    const box = f.boundingBox
    return `  Face ${i + 1}: position (x=${box.x.toFixed(3)}, y=${box.y.toFixed(3)}, w=${box.width.toFixed(3)}, h=${box.height.toFixed(3)}), age ~${age}, expression ~${emotion}`
  })

  const facesSection =
    cvFaces.length > 0
      ? `
I have already detected ${cvFaces.length} face(s) in this image using computer vision:
${faceLines.join("\n")}

For the "people" array, annotate EACH detected face with appearance, role, and expression. Use the provided face indices (face_1, face_2, etc.) as faceId. Keep the position values I provided — do NOT change them.`
      : `
No faces were detected by computer vision. If you see people in the image, include them in the "people" array with your best estimated position. Otherwise, return an empty "people" array.`

  return `Analyze this photograph and return a JSON object with the following structure. Focus on what would make this photo searchable — describe it as if someone is looking for specific moments, people, or scenes.
${facesSection}

Return ONLY valid JSON, no markdown fencing:

{
  "description": "A rich natural language description (2-4 sentences). Describe the scene, who is in it, what they are doing, the setting, and the mood. Write as if narrating the moment for someone searching for it later.",
  "people": [
    {
      "faceId": "face_1",
      "appearance": "Brief physical description (hair color, distinctive features, clothing)",
      "role": "bride|groom|bridesmaid|groomsman|flower_girl|ring_bearer|officiant|parent|child|guest|photographer|dj|musician|null",
      "expression": "smiling|laughing|crying|serious|surprised|neutral|etc",
      "ageRange": "child|teen|young_adult|adult|senior",
      "position": { "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0 }
    }
  ],
  "activities": ["dancing", "hugging", "toasting", "walking", "posing", "etc"],
  "objects": ["bouquet", "cake", "rings", "champagne glass", "etc"],
  "scene": "ceremony|reception|getting_ready|first_look|portraits|cocktail_hour|dance_floor|outdoor|indoor|church|beach|garden|ballroom|etc",
  "mood": "joyful|romantic|emotional|celebratory|intimate|playful|formal|candid|dramatic|serene",
  "composition": "close_up|medium_shot|wide_shot|detail|aerial|silhouette|group_shot|portrait|candid",
  "tags": ["keyword1", "keyword2", "..."]
}

Rules for the "people" array:
- Annotate ALL detected faces listed above
- For each face, identify the role from attire: white dress/veil = bride, suit with boutonniere = groom, matching dresses = bridesmaids, etc.
- If role cannot be determined, use null
- Keep the faceId as "face_N" matching the index above
- Keep the position values exactly as provided above

Rules for "tags":
- Include 10-30 searchable keywords
- Include synonyms (e.g., "kids" AND "children", "hug" AND "embrace")
- Include emotional descriptors (e.g., "tearful", "happy", "excited")
- Include setting details (e.g., "outdoor", "sunset", "garden")
- Think about what someone would type to find this photo

Rules for "description":
- Be specific and vivid
- Mention the number of people if relevant
- Mention colors, clothing, and setting details
- Describe interactions between people
- Example: "The bride, wearing a white lace gown, shares a tearful embrace with her father in a sunlit garden. Two bridesmaids in sage green dresses watch nearby, visibly emotional. The warm golden hour light creates a romantic atmosphere."
`
}

// Legacy prompt kept for backward compatibility (no-face fallback)
export const PHOTO_ANALYSIS_PROMPT = buildHybridPrompt([])
