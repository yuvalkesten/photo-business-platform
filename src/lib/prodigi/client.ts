const PRODIGI_BASE_URL = "https://api.prodigi.com/v4.0"

function getApiKey(): string {
  const key = process.env.PRODIGI_API_KEY

  if (!key) {
    throw new Error("Prodigi API key not configured (PRODIGI_API_KEY)")
  }
  return key
}

export async function prodigiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()

  const response = await fetch(`${PRODIGI_BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Prodigi API error ${response.status}: ${errorBody}`
    )
  }

  return response.json() as Promise<T>
}
