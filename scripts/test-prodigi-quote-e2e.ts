/**
 * End-to-end test for Prodigi Quote API with corrected SKUs and response parsing.
 *
 * Usage: PRODIGI_API_KEY=xxx npx tsx scripts/test-prodigi-quote-e2e.ts
 */

const API_KEY = process.env.PRODIGI_API_KEY
const BASE_URL = "https://api.prodigi.com/v4.0"

if (!API_KEY) {
  console.error("Missing PRODIGI_API_KEY")
  process.exit(1)
}

function getDefaultAttributes(sku: string): Record<string, string> {
  const upper = sku.toUpperCase()
  if (upper.startsWith("GLOBAL-PHO-")) return { finish: "lustre" }
  if (upper.startsWith("GLOBAL-CAN-")) return { wrap: "ImageWrap" }
  if (upper.startsWith("GLOBAL-CFP-") || upper.startsWith("GLOBAL-CFPM-")) return { color: "black" }
  return {} // Fine art prints and others have no required attributes
}

const TEST_ITEMS = [
  { sku: "GLOBAL-PHO-8x10-PRO", name: "Photo Print 8x10" },
  { sku: "GLOBAL-CAN-16x20", name: "Canvas 16x20" },
  { sku: "GLOBAL-CFP-8X10", name: "Framed Print 8x10" },
  { sku: "GLOBAL-FAP-16X20", name: "Fine Art Print 16x20" },
]

async function main() {
  console.log("=== E2E Quote Test ===\n")

  // Step 1: Verify all SKUs exist
  console.log("1. Validating SKUs...")
  for (const item of TEST_ITEMS) {
    const r = await fetch(`${BASE_URL}/products/${item.sku}`, {
      headers: { "X-API-Key": API_KEY! },
    })
    if (!r.ok) {
      console.error(`   FAIL: ${item.sku} (${item.name}) - ${r.status}`)
      process.exit(1)
    }
    console.log(`   OK: ${item.sku}`)
  }

  // Step 2: Get a quote with correct attributes per product type
  console.log("\n2. Fetching quote with product-specific attributes...")
  const quoteRes = await fetch(`${BASE_URL}/quotes`, {
    method: "POST",
    headers: { "X-API-Key": API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      shippingMethod: "Standard",
      destinationCountryCode: "US",
      items: TEST_ITEMS.map((item) => ({
        sku: item.sku,
        copies: 1,
        attributes: getDefaultAttributes(item.sku),
        assets: [{ printArea: "default" }],
      })),
    }),
  })

  if (!quoteRes.ok) {
    const err = await quoteRes.text()
    console.error(`   FAIL: ${quoteRes.status} ${err}`)
    process.exit(1)
  }

  const quoteData = await quoteRes.json()
  console.log(`   Outcome: ${quoteData.outcome}`)

  if (!quoteData.quotes || quoteData.quotes.length === 0) {
    console.error("   FAIL: No quotes returned")
    process.exit(1)
  }

  const quote = quoteData.quotes[0]
  const cs = quote.costSummary

  // Step 3: Parse using the same field names as our code
  console.log("\n3. Parsing response (totalCost/totalTax fields)...")

  const shipping = Number(cs.shipping.amount)
  const tax = Number(cs.totalTax.amount)
  const total = Number(cs.totalCost.amount)
  const items = Number(cs.items.amount)

  console.log(`   Items cost:    $${items.toFixed(2)}`)
  console.log(`   Shipping:      $${shipping.toFixed(2)}`)
  console.log(`   Tax:           $${tax.toFixed(2)}`)
  console.log(`   Total:         $${total.toFixed(2)}`)

  // Step 4: Simulate our checkout pricing logic
  console.log("\n4. Simulating checkout pricing...")
  const retailSubtotal = 120.00
  const shippingCost = shipping
  const taxAmount = tax
  const totalAmount = retailSubtotal + shippingCost + taxAmount
  const prodigiCostTotal = total
  const photographerProfit = retailSubtotal - (prodigiCostTotal - shippingCost - taxAmount)

  console.log(`   Retail subtotal:       $${retailSubtotal.toFixed(2)}`)
  console.log(`   Shipping (pass-thru):  $${shippingCost.toFixed(2)}`)
  console.log(`   Tax (pass-thru):       $${taxAmount.toFixed(2)}`)
  console.log(`   Customer total:        $${totalAmount.toFixed(2)}`)
  console.log(`   Prodigi total cost:    $${prodigiCostTotal.toFixed(2)}`)
  console.log(`   Photographer profit:   $${photographerProfit.toFixed(2)}`)

  // Step 5: Stripe line items in cents
  console.log("\n5. Stripe amounts (cents)...")
  console.log(`   Shipping: ${Math.round(shippingCost * 100)}`)
  console.log(`   Tax:      ${Math.round(taxAmount * 100)}`)

  console.log("\n=== ALL TESTS PASSED ===")
}

main().catch(console.error)
