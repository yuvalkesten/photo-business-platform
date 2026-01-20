"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";
import { sendEmail } from "@/lib/google/gmail";
import { generateInvoiceEmailHtml } from "@/lib/email/templates/invoice";

export async function sendInvoice(invoiceId: string, recipientEmail?: string) {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get the invoice with full details
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
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

    // Determine recipient email
    const toEmail = recipientEmail || invoice.project.contact.email;

    if (!toEmail) {
      return { error: "No recipient email address" };
    }

    // Generate email HTML
    const emailHtml = generateInvoiceEmailHtml({
      invoice: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        tax: invoice.tax ? Number(invoice.tax) : null,
        taxRate: invoice.taxRate ? Number(invoice.taxRate) : null,
        total: Number(invoice.total),
        amountPaid: Number(invoice.amountPaid),
        lineItems: invoice.lineItems as Array<{
          description: string;
          quantity: number;
          unitPrice: number;
          amount: number;
        }>,
      },
      businessName: invoice.user.businessName || invoice.user.name || "Photography",
      businessEmail: invoice.user.businessEmail || invoice.user.email,
      businessPhone: invoice.user.businessPhone,
      contactName: `${invoice.project.contact.firstName} ${invoice.project.contact.lastName}`,
      projectName: invoice.project.name,
    });

    // Send the email
    const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.user.businessName || invoice.user.name}`;

    try {
      await sendEmail(user.id, {
        to: toEmail,
        subject,
        htmlBody: emailHtml,
      });
    } catch (emailError) {
      console.error("Error sending invoice email:", emailError);
      return { error: "Failed to send email" };
    }

    // Update invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.SENT,
        sentAt: new Date(),
        sentToEmail: toEmail,
      },
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return {
      success: true,
      invoice: {
        ...updatedInvoice,
        subtotal: Number(updatedInvoice.subtotal),
        tax: updatedInvoice.tax ? Number(updatedInvoice.tax) : null,
        taxRate: updatedInvoice.taxRate ? Number(updatedInvoice.taxRate) : null,
        total: Number(updatedInvoice.total),
        amountPaid: Number(updatedInvoice.amountPaid),
      },
    };
  } catch (error) {
    console.error("Error sending invoice:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to send invoice" };
  }
}
