// Prodigi API type definitions

export interface ProdigiProduct {
  sku: string
  description: string
  category: string
  printAreas: {
    name: string
    required: boolean
  }[]
  variants: ProdigiVariant[]
}

export interface ProdigiVariant {
  sku: string
  description: string
  attributes: Record<string, string>
  pricing: ProdigiPricing[]
}

export interface ProdigiPricing {
  currency: string
  amount: string
}

export interface ProdigiOrderRequest {
  merchantReference: string
  shippingMethod: string
  recipient: ProdigiRecipient
  items: ProdigiOrderItem[]
  metadata?: Record<string, string>
}

export interface ProdigiRecipient {
  name: string
  email?: string
  address: ProdigiAddress
}

export interface ProdigiAddress {
  line1: string
  line2?: string
  postalOrZipCode: string
  countryCode: string
  townOrCity: string
  stateOrCounty?: string
}

export interface ProdigiOrderItem {
  merchantReference?: string
  sku: string
  copies: number
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea"
  attributes?: Record<string, string>
  assets: ProdigiAsset[]
}

export interface ProdigiAsset {
  printArea: string
  url?: string
}

export interface ProdigiOrderResponse {
  id: string
  created: string
  lastUpdated: string
  callbackUrl: string | null
  merchantReference: string
  shippingMethod: string
  idempotencyKey: string | null
  status: ProdigiOrderResponseStatus
  charges: ProdigiCharge[]
  shipments: ProdigiShipment[]
  recipient: ProdigiRecipient
  items: ProdigiOrderResponseItem[]
  metadata: Record<string, string>
}

export interface ProdigiOrderResponseStatus {
  stage: "InProgress" | "Complete" | "Cancelled"
  issues: ProdigiIssue[]
  details: {
    downloadAssets: string
    printReadyAssetsPrepared: string
    allocateProductionLocation: string
    inProduction: string
    shipping: string
  }
}

export interface ProdigiIssue {
  objectId: string
  sourceObjectId: string
  errorCode: string
  description: string
  authorization?: {
    authorisationDetails: {
      paymentMethod: {
        type: string
      }
    }
  }
}

export interface ProdigiCharge {
  id: string
  prodigiInvoiceNumber: string | null
  totalCost: {
    amount: string
    currency: string
  }
  items: {
    id: string
    itemId: string
    cost: {
      amount: string
      currency: string
    }
  }[]
}

export interface ProdigiShipment {
  id: string
  carrier: {
    name: string
    service: string
  }
  tracking: {
    number: string | null
    url: string | null
  }
  dispatchDate: string
  items: { itemId: string }[]
  fulfillmentLocation: {
    countryCode: string
    labCode: string
  }
}

export interface ProdigiOrderResponseItem {
  id: string
  merchantReference: string | null
  sku: string
  copies: number
  sizing: string
  status: string
  assets: ProdigiAsset[]
}

export interface ProdigiQuoteRequest {
  shippingMethod: string
  destinationCountryCode: string
  items: {
    sku: string
    copies: number
    attributes?: Record<string, string>
    assets: ProdigiAsset[]
  }[]
}

export interface ProdigiQuoteResponse {
  outcome: string
  quotes: {
    shipmentMethod: string
    costSummary: {
      items: { amount: string; currency: string }
      shipping: { amount: string; currency: string }
      totalCost: { amount: string; currency: string }
      totalTax: { amount: string; currency: string }
    }
    shipments: {
      carrier: { name: string; service: string }
      fulfillmentLocation: { countryCode: string; labCode: string }
      items: string[]
    }[]
  }[]
}

/**
 * Returns the required default attributes for a Prodigi SKU.
 * Photo prints need finish, canvas needs wrap, frames need color.
 */
export function getDefaultProdigiAttributes(sku: string): Record<string, string> {
  const upper = sku.toUpperCase()
  if (upper.startsWith("GLOBAL-PHO-")) return { finish: "lustre" }
  if (upper.startsWith("GLOBAL-CAN-")) return { wrap: "ImageWrap" }
  if (upper.startsWith("GLOBAL-CFP-") || upper.startsWith("GLOBAL-CFPM-")) return { color: "black" }
  return {}
}

export interface ProdigiWebhookPayload {
  specversion: string
  type: string
  source: string
  id: string
  time: string
  data: {
    order: ProdigiOrderResponse
  }
}
