"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface CreateInvoiceInput {
  projectId: string;
  lineItems: LineItem[];
  taxRate?: number;
  notes?: string;
  dueDate: Date;
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `INV-${year}${month}-${random}`;
}

export async function createInvoice(data: CreateInvoiceInput) {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify the project belongs to the user
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        userId: user.id,
      },
      include: {
        contact: true,
      },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    // Calculate totals
    const subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = data.taxRate ? subtotal * (data.taxRate / 100) : 0;
    const total = subtotal + tax;

    // Generate a unique invoice number
    let invoiceNumber = generateInvoiceNumber();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.invoice.findUnique({
        where: { invoiceNumber },
      });
      if (!existing) break;
      invoiceNumber = generateInvoiceNumber();
      attempts++;
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        userId: user.id,
        projectId: data.projectId,
        subtotal,
        tax: tax || null,
        taxRate: data.taxRate || null,
        total,
        amountPaid: 0,
        dueDate: data.dueDate,
        status: InvoiceStatus.DRAFT,
        lineItems: JSON.parse(JSON.stringify(data.lineItems)),
        notes: data.notes,
      },
      include: {
        project: {
          include: {
            contact: true,
          },
        },
      },
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/projects/${data.projectId}`);

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
    console.error("Error creating invoice:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to create invoice" };
  }
}
