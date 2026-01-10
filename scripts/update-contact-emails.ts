import { config } from "dotenv"
const result = config({ path: ".env.local" })

console.log("Dotenv loaded:", result.parsed ? "yes" : "no")
console.log("DATABASE_URL present:", process.env.DATABASE_URL ? "yes" : "no")

import { PrismaClient } from "@prisma/client"

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

async function main() {
  console.log("\nUpdating contact emails for testing...\n")

  // Get all contacts for the user
  const user = await prisma.user.findUnique({
    where: { email: "yuvalkesten@gmail.com" },
  })

  if (!user) {
    console.error("User not found: yuvalkesten@gmail.com")
    process.exit(1)
  }

  console.log(`Found user: ${user.name || user.email} (${user.id})\n`)

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  })

  console.log(`Found ${contacts.length} contacts\n`)

  for (const contact of contacts) {
    // Create a slug from the name
    const nameSlug = `${contact.firstName}${contact.lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")

    const newEmail = `yuvalkesten+${nameSlug}@gmail.com`

    await prisma.contact.update({
      where: { id: contact.id },
      data: { email: newEmail },
    })

    console.log(`✓ ${contact.firstName} ${contact.lastName}: ${contact.email || "(no email)"} → ${newEmail}`)
  }

  console.log("\n✅ All contact emails updated!")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
