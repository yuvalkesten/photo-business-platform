/**
 * Downloads photos from Slack #hb_photos using a user session token.
 *
 * How to get your token:
 *   1. Open Slack in your browser (not the desktop app)
 *   2. Open DevTools → Application → Cookies → https://app.slack.com
 *   3. Find the cookie named "d" — copy its value
 *   4. Pass it as the SLACK_COOKIE env var
 *
 * Usage:
 *   SLACK_COOKIE="xoxd-..." npx tsx scripts/download-slack-photos.ts
 *
 * Output: Downloads 40 photos to ./demo-photos/
 */

import fs from "fs"
import path from "path"

const SLACK_COOKIE = process.env.SLACK_COOKIE
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN

if (!SLACK_COOKIE && !SLACK_BOT_TOKEN) {
  console.error("Set either SLACK_COOKIE (from browser) or SLACK_BOT_TOKEN (with files:read scope)")
  process.exit(1)
}

const BOT_TOKEN = SLACK_BOT_TOKEN || ""
const CHANNEL_ID = "C1ABRTB2B" // #hb_photos
const OUTPUT_DIR = path.resolve("demo-photos")
const MAX_PHOTOS = 40

async function getPhotoUrls(): Promise<Array<{ url: string; name: string }>> {
  const photos: Array<{ url: string; name: string }> = []
  let cursor: string | undefined

  while (photos.length < MAX_PHOTOS) {
    const params = new URLSearchParams({
      channel: CHANNEL_ID,
      limit: "100",
    })
    if (cursor) params.set("cursor", cursor)

    const res = await fetch(
      `https://slack.com/api/conversations.history?${params}`,
      { headers: { Authorization: `Bearer ${BOT_TOKEN}` } }
    )
    const data = await res.json()
    if (!data.ok) throw new Error(`Slack API error: ${data.error}`)

    for (const msg of data.messages || []) {
      if (photos.length >= MAX_PHOTOS) break
      for (const f of msg.files || []) {
        if (photos.length >= MAX_PHOTOS) break
        if (
          f.mimetype?.startsWith("image/") &&
          f.url_private_download &&
          (f.original_w ?? 0) >= 1500 &&
          (f.size ?? 0) > 200000
        ) {
          photos.push({
            url: f.url_private_download,
            name: f.name || `photo_${photos.length}.jpg`,
          })
        }
      }
    }

    cursor = data.response_metadata?.next_cursor
    if (!cursor) break
  }

  return photos
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const headers: Record<string, string> = {}

  if (SLACK_COOKIE) {
    headers["Cookie"] = `d=${SLACK_COOKIE}`
  } else {
    headers["Authorization"] = `Bearer ${BOT_TOKEN}`
  }

  const res = await fetch(url, {
    headers,
    redirect: "follow",
  })

  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${url}`)
  }

  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("text/html")) {
    throw new Error(`Got HTML instead of image — token likely expired or missing scope`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(destPath, buffer)
}

async function main() {
  console.log("=== Slack Photo Downloader ===\n")

  // Get photo URLs via bot token (conversations.history works without files:read)
  console.log("Fetching photo URLs from #hb_photos...")
  const photos = await getPhotoUrls()
  console.log(`Found ${photos.length} photos\n`)

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // Download each photo
  let success = 0
  let failed = 0

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const destPath = path.join(OUTPUT_DIR, photo.name)

    try {
      process.stdout.write(`  [${i + 1}/${photos.length}] ${photo.name}... `)
      await downloadFile(photo.url, destPath)
      const size = fs.statSync(destPath).size
      console.log(`OK (${Math.round(size / 1024)} KB)`)
      success++
    } catch (error) {
      console.log(`FAILED: ${error instanceof Error ? error.message : error}`)
      failed++
      if (failed >= 3 && success === 0) {
        console.error("\nAll downloads failing — check your SLACK_COOKIE")
        process.exit(1)
      }
    }
  }

  console.log(`\nDone! ${success} downloaded, ${failed} failed`)
  console.log(`Photos saved to: ${OUTPUT_DIR}`)
  console.log(`\nNext step: npx tsx scripts/prepare-demo-gallery.ts ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
