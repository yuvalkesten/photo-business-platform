"use server"

import { getProdigiQuote } from "@/lib/prodigi/quotes"
import { getDefaultProdigiAttributes } from "@/lib/prodigi/types"

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
        attributes: getDefaultProdigiAttributes(item.prodigiSku),
        assets: [{ printArea: "default" }],
      })),
    })

    const quotes = quoteResult.quotes.map((q) => ({
      method: q.shipmentMethod,
      cost: Number(q.costSummary.shipping.amount),
      tax: Number(q.costSummary.totalTax.amount),
      currency: q.costSummary.shipping.currency,
      total: Number(q.costSummary.totalCost.amount),
    }))

    return { success: true, quotes }
  } catch (error) {
    console.error("Error fetching shipping quote:", error)
    return { error: "Failed to get shipping quote" }
  }
}
