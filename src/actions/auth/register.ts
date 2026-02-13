"use server"

import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { signUpSchema } from "@/lib/validations/auth.schema"
import { seedDemoData } from "@/lib/demo-data"

export async function register(data: unknown) {
  try {
    const validated = signUpSchema.parse(data)

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existingUser) {
      return { error: "An account with this email already exists" }
    }

    const hashedPassword = await hash(validated.password, 12)

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
      },
    })

    seedDemoData(user.id).catch((err) =>
      console.error("Demo seeding failed:", user.id, err)
    )

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return { error: "Invalid input. Please check your fields." }
    }
    return { error: "Something went wrong. Please try again." }
  }
}
