const PRODIGI_PROD_BASE_URL = "https://api.prodigi.com/v4.0"
const PRODIGI_SANDBOX_BASE_URL = "https://api.sandbox.prodigi.com/v4.0"

function getBaseUrl(): string {
  return process.env.NODE_ENV === "production"
    ? PRODIGI_PROD_BASE_URL
    : PRODIGI_SANDBOX_BASE_URL
}

function getApiKey(): string {
  const key =
    process.env.NODE_ENV === "production"
      ? process.env.PRODIGI_API_KEY
      : process.env.PRODIGI_SANDBOX_API_KEY || process.env.PRODIGI_API_KEY

  if (!key) {
    throw new Error("Prodigi API key not configured")
  }
  return key
}

export async function prodigiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseUrl()
  const apiKey = getApiKey()

  const response = await fetch(`${baseUrl}${path}`, {
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
