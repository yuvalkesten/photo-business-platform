import { requireAuth } from "@/lib/auth/utils";
import { redirect, notFound } from "next/navigation";
import { getInvoice } from "@/actions/invoices";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InvoicePreview, InvoiceActions } from "@/components/features/invoices";
import { ArrowLeft } from "lucide-react";

interface InvoicePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const user = await requireAuth();
  if (!user) redirect("/auth/signin");

  const { id } = await params;
  const result = await getInvoice(id);

  if (result.error || !result.invoice) {
    notFound();
  }

  const invoice = result.invoice;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-muted-foreground">
              For {invoice.project.name}
            </p>
          </div>
        </div>
        <InvoiceActions
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          status={invoice.status}
          clientEmail={invoice.project.contact.email}
        />
      </div>

      {/* Invoice Preview */}
      <InvoicePreview
        invoice={{
          ...invoice,
          lineItems: invoice.lineItems as Array<{
            description: string;
            quantity: number;
            unitPrice: number;
            amount: number;
          }>,
        }}
      />

      {/* Project Link */}
      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/projects/${invoice.project.id}`}>
            View Project Details
          </Link>
        </Button>
      </div>
    </div>
  );
}
