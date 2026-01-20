"use server";

import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";

export interface GetInvoicesParams {
  status?: InvoiceStatus;
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getInvoices(params: GetInvoicesParams = {}) {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const { status, projectId, search, page = 1, limit = 50 } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      userId: user.id,
    };

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { project: { name: { contains: search, mode: "insensitive" } } },
        {
          project: {
            contact: { firstName: { contains: search, mode: "insensitive" } },
          },
        },
        {
          project: {
            contact: { lastName: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          project: {
            include: {
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Serialize Decimal values
    const serializedInvoices = invoices.map((invoice) => ({
      ...invoice,
      subtotal: Number(invoice.subtotal),
      tax: invoice.tax ? Number(invoice.tax) : null,
      taxRate: invoice.taxRate ? Number(invoice.taxRate) : null,
      total: Number(invoice.total),
      amountPaid: Number(invoice.amountPaid),
    }));

    return {
      success: true,
      invoices: serializedInvoices,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Error fetching invoices:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to fetch invoices" };
  }
}
