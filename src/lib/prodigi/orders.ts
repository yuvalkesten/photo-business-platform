import { prodigiFetch } from "./client"
import type {
  ProdigiOrderRequest,
  ProdigiOrderResponse,
} from "./types"

interface OrderResponse {
  order: ProdigiOrderResponse
}

export async function createProdigiOrder(
  orderData: ProdigiOrderRequest
): Promise<ProdigiOrderResponse> {
  const data = await prodigiFetch<OrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(orderData),
  })
  return data.order
}

export async function getProdigiOrder(
  orderId: string
): Promise<ProdigiOrderResponse> {
  const data = await prodigiFetch<OrderResponse>(`/orders/${orderId}`)
  return data.order
}

export async function cancelProdigiOrder(
  orderId: string
): Promise<ProdigiOrderResponse> {
  const data = await prodigiFetch<OrderResponse>(
    `/orders/${orderId}/actions/cancel`,
    { method: "POST" }
  )
  return data.order
}
