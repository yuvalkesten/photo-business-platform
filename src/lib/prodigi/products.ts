import { prodigiFetch } from "./client"
import type { ProdigiProduct } from "./types"

interface ProductsResponse {
  products: ProdigiProduct[]
}

interface ProductResponse {
  product: ProdigiProduct
}

export async function getProdigiProducts(category?: string): Promise<ProdigiProduct[]> {
  const params = new URLSearchParams()
  if (category) params.set("category", category)

  const query = params.toString() ? `?${params.toString()}` : ""
  const data = await prodigiFetch<ProductsResponse>(`/products${query}`)
  return data.products
}

export async function getProdigiProduct(sku: string): Promise<ProdigiProduct> {
  const data = await prodigiFetch<ProductResponse>(`/products/${sku}`)
  return data.product
}
