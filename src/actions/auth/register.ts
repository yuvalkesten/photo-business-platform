"use server"

import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { signUpSchema } from "@/lib/validations/auth.schema"

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

    await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
      },
    })

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return { error: "Invalid input. Please check your fields." }
    }
    return { error: "Something went wrong. Please try again." }
  }
}
