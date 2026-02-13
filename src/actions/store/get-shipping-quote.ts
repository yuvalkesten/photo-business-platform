"use server"

import { getProdigiQuote } from "@/lib/prodigi/quotes"

interface ShippingQuoteItem {
  prodigiSku: string
  quantity: number
}

export async function getShippingQuote(
  countryCode: string,
  items: ShippingQuoteItem[]
) {
  try {
    const quoteResult = await getProdigiQuote({
      shippingMethod: "Standard",
      destinationCountryCode: countryCode,
      items: items.map((item) => ({
        sku: item.prodigiSku,
        copies: item.quantity,
        assets: [{ printArea: "default", url: "https://placeholder.com/test.jpg" }],
      })),
    })

    const quotes = quoteResult.quotes.map((q) => ({
      method: q.shipmentMethod,
      cost: Number(q.costSummary.shipping.amount),
      currency: q.costSummary.shipping.currency,
      total: Number(q.costSummary.total.amount),
    }))

    return { success: true, quotes }
  } catch (error) {
    console.error("Error fetching shipping quote:", error)
    return { error: "Failed to get shipping quote" }
  }
}
