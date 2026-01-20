"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";
import { LineItem } from "./create-invoice";

export interface UpdateInvoiceInput {
  lineItems?: LineItem[];
  taxRate?: number | null;
  notes?: string | null;
  dueDate?: Date;
  status?: InvoiceStatus;
}

export async function updateInvoice(
  invoiceId: string,
  data: UpdateInvoiceInput
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

    // Don't allow editing sent/paid invoices (except marking as paid)
    if (
      existingInvoice.status !== InvoiceStatus.DRAFT &&
      data.status !== InvoiceStatus.PAID &&
      data.status !== InvoiceStatus.CANCELLED
    ) {
      return { error: "Can only edit draft invoices" };
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (data.lineItems) {
      updateData.lineItems = data.lineItems;
      const subtotal = data.lineItems.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      const taxRate = data.taxRate ?? Number(existingInvoice.taxRate) ?? 0;
      const tax = taxRate ? subtotal * (taxRate / 100) : 0;
      updateData.subtotal = subtotal;
      updateData.tax = tax || null;
      updateData.total = subtotal + tax;
    }

    if (data.taxRate !== undefined) {
      updateData.taxRate = data.taxRate;
      // Recalculate tax if only tax rate changed
      if (!data.lineItems) {
        const subtotal = Number(existingInvoice.subtotal);
        const tax = data.taxRate ? subtotal * (data.taxRate / 100) : 0;
        updateData.tax = tax || null;
        updateData.total = subtotal + tax;
      }
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    if (data.dueDate) {
      updateData.dueDate = data.dueDate;
    }

    if (data.status) {
      updateData.status = data.status;
    }

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        project: {
          include: {
            contact: true,
          },
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
    console.error("Error updating invoice:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to update invoice" };
  }
}
