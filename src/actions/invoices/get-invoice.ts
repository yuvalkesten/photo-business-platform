"use server";

import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function getInvoice(invoiceId: string) {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: user.id,
      },
      include: {
        project: {
          include: {
            contact: true,
            organization: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            businessName: true,
            businessEmail: true,
            businessPhone: true,
            businessLogo: true,
          },
        },
      },
    });

    if (!invoice) {
      return { error: "Invoice not found" };
    }

    // Serialize Decimal values
    return {
      success: true,
      invoice: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        tax: invoice.tax ? Number(invoice.tax) : null,
        taxRate: invoice.taxRate ? Number(invoice.taxRate) : null,
        total: Number(invoice.total),
        amountPaid: Number(invoice.amountPaid),
        project: {
          ...invoice.project,
          totalPrice: invoice.project.totalPrice
            ? Number(invoice.project.totalPrice)
            : null,
          deposit: invoice.project.deposit
            ? Number(invoice.project.deposit)
            : null,
          paidAmount: invoice.project.paidAmount
            ? Number(invoice.project.paidAmount)
            : null,
          budgetMin: invoice.project.budgetMin
            ? Number(invoice.project.budgetMin)
            : null,
          budgetMax: invoice.project.budgetMax
            ? Number(invoice.project.budgetMax)
            : null,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching invoice:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to fetch invoice" };
  }
}
