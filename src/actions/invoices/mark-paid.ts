"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";

export async function markInvoicePaid(
  invoiceId: string,
  amountPaid?: number
) {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify the invoice belongs to the user
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: user.id,
      },
    });

    if (!existingInvoice) {
      return { error: "Invoice not found" };
    }

    const paidAmount = amountPaid ?? Number(existingInvoice.total);

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        amountPaid: paidAmount,
        paidAt: new Date(),
      },
      include: {
        project: {
          include: {
            contact: true,
          },
        },
      },
    });

    // Update project paid amount
    await prisma.project.update({
      where: { id: invoice.projectId },
      data: {
        paidAmount: {
          increment: paidAmount,
        },
      },
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    revalidatePath(`/dashboard/projects/${invoice.projectId}`);

    return {
      success: true,
      invoice: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        tax: invoice.tax ? Number(invoice.tax) : null,
        taxRate: invoice.taxRate ? Number(invoice.taxRate) : null,
        total: Number(invoice.total),
        amountPaid: Number(invoice.amountPaid),
      },
    };
  } catch (error) {
    console.error("Error marking invoice as paid:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to mark invoice as paid" };
  }
}
