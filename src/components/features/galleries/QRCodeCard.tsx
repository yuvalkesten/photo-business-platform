"use client"

import { useState, useEffect } from "react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, QrCode } from "lucide-react"

interface QRCodeCardProps {
  shareUrl: string
  galleryTitle: string
}

export function QRCodeCard({ shareUrl, galleryTitle }: QRCodeCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl)
  }, [shareUrl])

  const downloadQR = () => {
    if (!qrDataUrl) return
    const link = document.createElement("a")
    link.href = qrDataUrl
    link.download = `${galleryTitle.replace(/[^a-zA-Z0-9 _-]/g, "")}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadPrintCard = async () => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const cardWidth = 800
    const cardHeight = 500
    canvas.width = cardWidth
    canvas.height = cardHeight

    // Background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, cardWidth, cardHeight)

    // Border
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, cardWidth - 20, cardHeight - 20)

    // QR code image
    if (qrDataUrl) {
      const img = new Image()
      img.src = qrDataUrl
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 50, 75, 250, 250)
          resolve()
        }
      })
    }

    // Title
    ctx.fillStyle = "#1a1a1a"
    ctx.font = "bold 28px sans-serif"
    ctx.fillText(galleryTitle, 340, 140)

    // Instruction
    ctx.fillStyle = "#6b7280"
    ctx.font = "16px sans-serif"
    ctx.fillText("Scan to view your photos", 340, 180)

    // URL
    ctx.font = "12px monospace"
    ctx.fillStyle = "#9ca3af"
    const displayUrl = shareUrl.length > 50 ? shareUrl.slice(0, 50) + "..." : shareUrl
    ctx.fillText(displayUrl, 340, 220)

    // Footer line
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(40, cardHeight - 60)
    ctx.lineTo(cardWidth - 40, cardHeight - 60)
    ctx.stroke()

    // Footer text
    ctx.fillStyle = "#9ca3af"
    ctx.font = "12px sans-serif"
    ctx.fillText("Photo Gallery", 40, cardHeight - 30)

    // Download
    const link = document.createElement("a")
    link.href = canvas.toDataURL("image/png")
    link.download = `${galleryTitle.replace(/[^a-zA-Z0-9 _-]/g, "")}-print-card.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code
        </CardTitle>
        <CardDescription>
          Share this QR code for easy gallery access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrDataUrl && (
          <div className="flex justify-center">
            <img
              src={qrDataUrl}
              alt="Gallery QR Code"
              className="w-48 h-48 rounded border"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={downloadQR}>
            <Download className="h-4 w-4 mr-2" />
            Download QR
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={downloadPrintCard}>
            <Download className="h-4 w-4 mr-2" />
            Print Card
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
