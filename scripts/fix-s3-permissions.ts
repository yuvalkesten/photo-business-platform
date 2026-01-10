import { config } from "dotenv"
config({ path: ".env.local" })

import {
  S3Client,
  GetBucketPolicyCommand,
  PutBucketPolicyCommand,
  GetPublicAccessBlockCommand,
  DeletePublicAccessBlockCommand,
  PutObjectAclCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3"

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const bucket = process.env.AWS_S3_BUCKET_NAME!

async function main() {
  console.log("Bucket:", bucket)
  console.log("Region:", process.env.AWS_REGION)

  // Check current public access block
  console.log("\n1. Checking Public Access Block...")
  try {
    const pab = await s3.send(new GetPublicAccessBlockCommand({ Bucket: bucket }))
    console.log("Public Access Block:", JSON.stringify(pab.PublicAccessBlockConfiguration, null, 2))

    // If blocking public access, remove it
    if (pab.PublicAccessBlockConfiguration?.BlockPublicAcls ||
        pab.PublicAccessBlockConfiguration?.BlockPublicPolicy) {
      console.log("\n   Removing public access block...")
      await s3.send(new DeletePublicAccessBlockCommand({ Bucket: bucket }))
      console.log("   ✓ Public access block removed")
    }
  } catch (e: any) {
    if (e.name === "NoSuchPublicAccessBlockConfiguration") {
      console.log("   No public access block configured (good)")
    } else {
      console.log("   Error:", e.message)
    }
  }

  // Add a bucket policy for public read access to galleries folder
  console.log("\n2. Setting bucket policy for public read access...")
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucket}/galleries/*`,
      },
    ],
  }

  try {
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify(policy),
      })
    )
    console.log("   ✓ Bucket policy set successfully")
  } catch (e: any) {
    console.log("   Error setting policy:", e.message)
  }

  // List objects in galleries folder
  console.log("\n3. Listing objects in galleries/...")
  try {
    const objects = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "galleries/",
      })
    )
    console.log(`   Found ${objects.Contents?.length || 0} objects`)
    objects.Contents?.forEach((obj) => {
      console.log(`   - ${obj.Key}`)
    })
  } catch (e: any) {
    console.log("   Error listing objects:", e.message)
  }

  console.log("\n✅ Done! Images should now be publicly accessible.")
  console.log(`\nTest URL: https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/galleries/`)
}

main().catch(console.error)
