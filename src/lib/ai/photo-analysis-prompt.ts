export const PHOTO_ANALYSIS_PROMPT = `Analyze this photograph and return a JSON object with the following structure. Focus on what would make this photo searchable — describe it as if someone is looking for specific moments, people, or scenes.

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
- Include ALL visible people, even partially visible ones
- For "position", use normalized coordinates (0.0 to 1.0) representing the face bounding box relative to the image dimensions
- Identify roles from attire: white dress/veil = bride, suit with boutonniere = groom, matching dresses = bridesmaids, etc.
- If role cannot be determined, use null

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
