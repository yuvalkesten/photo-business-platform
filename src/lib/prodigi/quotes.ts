import { prodigiFetch } from "./client"
import type { ProdigiQuoteRequest, ProdigiQuoteResponse } from "./types"

export async function getProdigiQuote(
  quoteData: ProdigiQuoteRequest
): Promise<ProdigiQuoteResponse> {
  return prodigiFetch<ProdigiQuoteResponse>("/quotes", {
    method: "POST",
    body: JSON.stringify(quoteData),
  })
}
