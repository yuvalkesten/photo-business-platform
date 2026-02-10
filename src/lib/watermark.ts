import sharp from "sharp"

export type WatermarkPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "tiled"

interface WatermarkOptions {
  imageBuffer: Buffer
  watermarkBuffer: Buffer
  position?: WatermarkPosition
  opacity?: number // 0-100
}

export async function applyWatermark({
  imageBuffer,
  watermarkBuffer,
  position = "center",
  opacity = 50,
}: WatermarkOptions): Promise<Buffer> {
  const image = sharp(imageBuffer)
  const imageMeta = await image.metadata()
  const imageWidth = imageMeta.width || 1200
  const imageHeight = imageMeta.height || 800

  // Scale watermark to ~30% of image width
  const targetWatermarkWidth = Math.round(imageWidth * 0.3)
  let watermark = sharp(watermarkBuffer).resize(targetWatermarkWidth, undefined, {
    withoutEnlargement: true,
    fit: "inside",
  })

  // Apply opacity
  if (opacity < 100) {
    const alpha = Math.round((opacity / 100) * 255)
    watermark = watermark.ensureAlpha().composite([
      {
        input: Buffer.from([255, 255, 255, alpha]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ])
  }

  const watermarkBuf = await watermark.toBuffer()
  const watermarkMeta = await sharp(watermarkBuf).metadata()
  const wmWidth = watermarkMeta.width || targetWatermarkWidth
  const wmHeight = watermarkMeta.height || Math.round(targetWatermarkWidth * 0.5)

  if (position === "tiled") {
    // Create tiled watermark pattern
    const tileSpacing = Math.round(imageWidth * 0.1)
    const rows = Math.ceil(imageHeight / (wmHeight + tileSpacing)) + 1
    const cols = Math.ceil(imageWidth / (wmWidth + tileSpacing)) + 1

    const composites: sharp.OverlayOptions[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        composites.push({
          input: watermarkBuf,
          top: r * (wmHeight + tileSpacing),
          left: c * (wmWidth + tileSpacing),
        })
      }
    }

    return image.composite(composites).toBuffer()
  }

  // Calculate position
  const padding = Math.round(imageWidth * 0.03)
  let top: number
  let left: number

  switch (position) {
    case "top-left":
      top = padding
      left = padding
      break
    case "top-right":
      top = padding
      left = imageWidth - wmWidth - padding
      break
    case "bottom-left":
      top = imageHeight - wmHeight - padding
      left = padding
      break
    case "bottom-right":
      top = imageHeight - wmHeight - padding
      left = imageWidth - wmWidth - padding
      break
    case "center":
    default:
      top = Math.round((imageHeight - wmHeight) / 2)
      left = Math.round((imageWidth - wmWidth) / 2)
      break
  }

  return image
    .composite([{ input: watermarkBuf, top: Math.max(0, top), left: Math.max(0, left) }])
    .toBuffer()
}
