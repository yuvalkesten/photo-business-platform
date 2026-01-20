"use client";

import { type InvoiceStatus, type Contact } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceUser {
  id: string;
  name: string | null;
  email: string;
  businessName: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  businessLogo: string | null;
}

interface InvoiceProject {
  id: string;
  name: string;
  contact: Contact;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  subtotal: number;
  tax: number | null;
  taxRate: number | null;
  total: number;
  amountPaid: number;
  lineItems: LineItem[];
  notes: string | null;
  sentAt: Date | null;
  sentToEmail: string | null;
  paidAt: Date | null;
  user: InvoiceUser;
  project: InvoiceProject;
}

interface InvoicePreviewProps {
  invoice: InvoiceData;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  VIEWED: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const balance = invoice.total - invoice.amountPaid;
  const lineItems = invoice.lineItems as LineItem[];

  return (
    <Card className="max-w-3xl mx-auto bg-white shadow-lg">
      {/* Header */}
      <div className="bg-gray-900 text-white p-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">INVOICE</h1>
            <p className="text-gray-400 mt-1">{invoice.invoiceNumber}</p>
          </div>
          <Badge className={statusColors[invoice.status]}>
            {statusLabels[invoice.status]}
          </Badge>
        </div>
      </div>

      <div className="p-8">
        {/* Business & Client Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2">From</p>
            <p className="font-semibold">
              {invoice.user.businessName || invoice.user.name}
            </p>
            <p className="text-gray-600">
              {invoice.user.businessEmail || invoice.user.email}
            </p>
            {invoice.user.businessPhone && (
              <p className="text-gray-600">{invoice.user.businessPhone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-500 mb-2">Bill To</p>
            <p className="font-semibold">
              {invoice.project.contact.firstName}{" "}
              {invoice.project.contact.lastName}
            </p>
            <p className="text-gray-600">{invoice.project.contact.email}</p>
            <p className="text-gray-600 text-sm mt-1">{invoice.project.name}</p>
          </div>
        </div>

        {/* Dates & Balance */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Invoice Date</p>
              <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Due Date</p>
              <p className="font-medium">{formatDate(invoice.dueDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase">Balance Due</p>
              <p className="text-xl font-bold">{formatCurrency(balance)}</p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 text-sm font-semibold text-gray-600">
                Description
              </th>
              <th className="text-center py-3 text-sm font-semibold text-gray-600 w-20">
                Qty
              </th>
              <th className="text-right py-3 text-sm font-semibold text-gray-600 w-28">
                Rate
              </th>
              <th className="text-right py-3 text-sm font-semibold text-gray-600 w-28">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-3 text-right">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax !== null && invoice.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({invoice.taxRate}%)</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>Amount Paid</span>
                  <span>-{formatCurrency(invoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-amber-200 bg-amber-50 -mx-2 px-2 py-2 rounded font-bold text-amber-800">
                  <span>Balance Due</span>
                  <span>{formatCurrency(balance)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">Notes</p>
            <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>Thank you for your business!</p>
          {invoice.sentAt && (
            <p className="mt-2 text-xs">
              Sent to {invoice.sentToEmail} on {formatDate(invoice.sentAt)}
            </p>
          )}
          {invoice.paidAt && (
            <p className="mt-1 text-xs text-green-600">
              Paid on {formatDate(invoice.paidAt)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
