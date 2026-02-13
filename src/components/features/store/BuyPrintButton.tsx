"use client"

import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"

interface BuyPrintButtonProps {
  onClick: () => void
  className?: string
}

export function BuyPrintButton({ onClick, className }: BuyPrintButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`text-white hover:bg-white/20 ${className || ""}`}
      onClick={onClick}
    >
      <ShoppingBag className="h-4 w-4 mr-2" />
      Buy Print
    </Button>
  )
}
