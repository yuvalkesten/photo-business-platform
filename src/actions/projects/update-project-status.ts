"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { updateProjectStatusSchema } from "@/lib/validations/project.schema"
import { ProjectStatus, ContactType } from "@prisma/client"
import { sendEmail } from "@/lib/google/gmail"
import { generateBookingConfirmationEmail } from "@/lib/email/templates"

export async function updateProjectStatus(projectId: string, data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = updateProjectStatusSchema.parse(data)

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: { contact: true },
    })

    if (!existingProject) {
      return { error: "Project not found" }
    }

    if (existingProject.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // Prepare update data
    const updateData: any = {
      status: validatedData.status,
    }

    // Set bookedAt when first moving to BOOKED status
    const isConvertingToBooked =
      validatedData.status === ProjectStatus.BOOKED &&
      !existingProject.bookedAt &&
      (existingProject.status === ProjectStatus.INQUIRY || existingProject.status === ProjectStatus.PROPOSAL_SENT)

    if (isConvertingToBooked) {
      updateData.bookedAt = new Date()
    }

    // Auto-set completedAt when status changes to COMPLETED
    if (validatedData.status === ProjectStatus.COMPLETED && !existingProject.completedAt) {
      updateData.completedAt = new Date()
    } else if (validatedData.status !== ProjectStatus.COMPLETED && existingProject.completedAt) {
      updateData.completedAt = null
    }

    // Update the project status
    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            type: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Update contact type from LEAD to CLIENT when booking
    if (isConvertingToBooked && existingProject.contact.type === ContactType.LEAD) {
      await prisma.contact.update({
        where: { id: existingProject.contactId },
        data: { type: ContactType.CLIENT },
      })
      revalidatePath("/dashboard/contacts")
    }

    // Send booking confirmation email when project is booked
    if (isConvertingToBooked && project.contact.email) {
      try {
        // Get photographer info
        const photographer = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            name: true,
            email: true,
            businessName: true,
            businessEmail: true,
            businessPhone: true,
          },
        })

        // Get scheduled sessions for this project
        const sessions = await prisma.photoSession.findMany({
          where: { projectId: project.id },
          orderBy: { scheduledAt: "asc" },
        })

        const emailData = {
          clientName: `${project.contact.firstName} ${project.contact.lastName}`,
          projectName: project.name,
          projectType: project.projectType,
          totalPrice: project.totalPrice ? Number(project.totalPrice) : null,
          deposit: project.deposit ? Number(project.deposit) : null,
          eventDate: project.eventDate,
          sessions: sessions.map((s) => ({
            title: s.title,
            date: s.scheduledAt,
            startTime: s.startTime,
            location: s.location,
          })),
          photographerName: photographer?.businessName || photographer?.name || "Your Photographer",
          photographerEmail: photographer?.businessEmail || photographer?.email || "",
          photographerPhone: photographer?.businessPhone || null,
        }

        const { subject, htmlBody, textBody } = generateBookingConfirmationEmail(emailData)

        await sendEmail(user.id, {
          to: project.contact.email,
          subject,
          htmlBody,
          textBody,
        })

        console.log(`Booking confirmation email sent to ${project.contact.email}`)
      } catch (emailError) {
        // Log error but don't fail the status update
        console.error("Failed to send booking confirmation email:", emailError)
      }
    }

    revalidatePath("/dashboard/projects")
    revalidatePath("/dashboard/leads")
    revalidatePath(`/dashboard/projects/${projectId}`)

    // Serialize Decimal values to numbers for client components
    const serializedProject = {
      ...project,
      budgetMin: project.budgetMin ? Number(project.budgetMin) : null,
      budgetMax: project.budgetMax ? Number(project.budgetMax) : null,
      totalPrice: project.totalPrice ? Number(project.totalPrice) : null,
      deposit: project.deposit ? Number(project.deposit) : null,
      paidAmount: project.paidAmount ? Number(project.paidAmount) : null,
    }

    return { success: true, project: serializedProject }
  } catch (error) {
    console.error("Error updating project status:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to update project status" }
  }
}
