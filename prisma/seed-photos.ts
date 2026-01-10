import { config } from "dotenv"
const result = config({ path: ".env.local" })

console.log("Dotenv loaded:", result.parsed ? "yes" : "no")
console.log("DATABASE_URL present:", process.env.DATABASE_URL ? "yes" : "no")

import { PrismaClient } from "@prisma/client"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import https from "https"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined in .env.local")
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
})

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Curated high-quality Unsplash photos for each gallery type
const galleryPhotos: Record<string, { url: string; description: string }[]> = {
  "Nakamura Family Portraits": [
    {
      url: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=1200&q=80",
      description: "Family portrait in autumn park setting",
    },
    {
      url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&q=80",
      description: "Candid family moment together",
    },
    {
      url: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1200&q=80",
      description: "Family outdoors in nature",
    },
  ],
  "Baby Garcia - Newborn Session": [
    {
      url: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1200&q=80",
      description: "Peaceful sleeping newborn",
    },
    {
      url: "https://images.unsplash.com/photo-1544126592-807ade215a0b?w=1200&q=80",
      description: "Newborn baby close-up",
    },
    {
      url: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1200&q=80",
      description: "Baby hands and feet detail",
    },
  ],
  "Amanda & Josh - Engagement": [
    {
      url: "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=1200&q=80",
      description: "Romantic couple at sunset",
    },
    {
      url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&q=80",
      description: "Couple walking together",
    },
    {
      url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
      description: "Intimate couple portrait",
    },
  ],
}

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadImage(redirectUrl).then(resolve).catch(reject)
          return
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }

      const chunks: Buffer[] = []
      response.on("data", (chunk) => chunks.push(chunk))
      response.on("end", () => resolve(Buffer.concat(chunks)))
      response.on("error", reject)
    }).on("error", reject)
  })
}

async function uploadToS3(buffer: Buffer, key: string): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET_NAME!
  const region = process.env.AWS_REGION || "us-east-2"

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  )

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

async function main() {
  console.log("🖼️  Photo Seed Script - Adding demo photos to galleries\n")

  if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME is not set in .env.local")
  }

  // Get all galleries
  const galleries = await prisma.gallery.findMany({
    include: {
      photos: true,
    },
  })

  console.log(`Found ${galleries.length} galleries\n`)

  for (const gallery of galleries) {
    const photos = galleryPhotos[gallery.title]

    if (!photos) {
      console.log(`⚠️  No photos defined for gallery: ${gallery.title}`)
      continue
    }

    console.log(`\n📸 Processing gallery: ${gallery.title}`)
    console.log(`   Current photos: ${gallery.photos.length}`)

    // Skip if gallery already has photos
    if (gallery.photos.length >= 3) {
      console.log(`   ✓ Gallery already has photos, skipping`)
      continue
    }

    // Delete existing photos for this gallery (to start fresh)
    if (gallery.photos.length > 0) {
      console.log(`   Removing ${gallery.photos.length} existing photos...`)
      await prisma.photo.deleteMany({
        where: { galleryId: gallery.id },
      })
    }

    // Download and upload photos
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      const photoIndex = i + 1

      try {
        console.log(`\n   [${photoIndex}/${photos.length}] Downloading from Unsplash...`)
        console.log(`   Source: ${photo.description}`)

        // Download image
        const imageBuffer = await downloadImage(photo.url)
        console.log(`   ✓ Downloaded (${Math.round(imageBuffer.length / 1024)} KB)`)

        // Upload to S3
        const s3Key = `galleries/${gallery.id}/photos/photo-${photoIndex}.jpg`
        console.log(`   Uploading to S3: ${s3Key}`)
        const s3Url = await uploadToS3(imageBuffer, s3Key)
        console.log(`   ✓ Uploaded: ${s3Url}`)

        // Create photo record
        const slugTitle = gallery.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        await prisma.photo.create({
          data: {
            galleryId: gallery.id,
            filename: `${slugTitle}-${photoIndex}.jpg`,
            s3Key: s3Key,
            s3Url: s3Url,
            fileSize: imageBuffer.length,
            width: 1200,
            height: 800,
            mimeType: "image/jpeg",
            order: photoIndex,
            isFavorite: photoIndex === 1,
            tags: [],
          },
        })
        console.log(`   ✓ Photo record created`)
      } catch (error) {
        console.error(`   ✗ Error with photo ${photoIndex}:`, error)
      }
    }

    // Update gallery cover image to first photo
    const firstPhoto = await prisma.photo.findFirst({
      where: { galleryId: gallery.id },
      orderBy: { order: "asc" },
    })

    if (firstPhoto) {
      await prisma.gallery.update({
        where: { id: gallery.id },
        data: { coverImage: firstPhoto.s3Url },
      })
      console.log(`   ✓ Set cover image`)
    }
  }

  // Final summary
  const totalPhotos = await prisma.photo.count()
  console.log(`\n✅ Photo seeding complete!`)
  console.log(`   Total photos in database: ${totalPhotos}`)
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
