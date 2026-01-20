"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";
import { sendInvoice, markInvoicePaid } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Send, CheckCircle, Download, Loader2 } from "lucide-react";

interface InvoiceActionsProps {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientEmail: string;
}

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  status,
  clientEmail,
}: InvoiceActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, startSending] = useTransition();
  const [isMarking, startMarking] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSend = () => {
    startSending(async () => {
      const result = await sendInvoice(invoiceId, clientEmail);

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Invoice sent",
        description: `Invoice ${invoiceNumber} has been sent to ${clientEmail}`,
      });

      router.refresh();
    });
  };

  const handleMarkPaid = () => {
    startMarking(async () => {
      const result = await markInvoicePaid(invoiceId);

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Invoice marked as paid",
        description: `Invoice ${invoiceNumber} has been marked as paid`,
      });

      router.refresh();
    });
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const isPaid = status === InvoiceStatus.PAID;
  const isCancelled = status === InvoiceStatus.CANCELLED;
  const canSend = status === InvoiceStatus.DRAFT;
  const canMarkPaid = !isPaid && !isCancelled;

  return (
    <div className="flex items-center gap-2">
      {/* Send Button */}
      {canSend && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Invoice
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                This will send invoice {invoiceNumber} to {clientEmail}. Are you
                sure?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSend}>
                Send Invoice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Mark as Paid Button */}
      {canMarkPaid && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isMarking}>
              {isMarking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark Paid
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark Invoice as Paid</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark invoice {invoiceNumber} as paid. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkPaid}>
                Mark as Paid
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Download PDF Button */}
      <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading}>
        {isDownloading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Download PDF
      </Button>
    </div>
  );
}
