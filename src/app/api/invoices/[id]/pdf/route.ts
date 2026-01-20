import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { InvoicePDF, type InvoicePDFData } from "@/lib/invoices/InvoicePDF";

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        project: {
          include: {
            contact: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            businessName: true,
            businessEmail: true,
            businessPhone: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const pdfData: InvoicePDFData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: formatDate(invoice.invoiceDate),
      dueDate: formatDate(invoice.dueDate),
      businessName: invoice.user.businessName || invoice.user.name || "Photography",
      businessEmail: invoice.user.businessEmail || invoice.user.email,
      businessPhone: invoice.user.businessPhone,
      clientName: `${invoice.project.contact.firstName} ${invoice.project.contact.lastName}`,
      clientEmail: invoice.project.contact.email,
      projectName: invoice.project.name,
      lineItems: invoice.lineItems as Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
      }>,
      subtotal: Number(invoice.subtotal),
      tax: invoice.tax ? Number(invoice.tax) : null,
      taxRate: invoice.taxRate ? Number(invoice.taxRate) : null,
      total: Number(invoice.total),
      amountPaid: Number(invoice.amountPaid),
      notes: invoice.notes,
    };

    const pdfBuffer = await renderToBuffer(InvoicePDF({ data: pdfData }));

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
