"use client";

import Link from "next/link";
import { InvoiceStatus, type Contact } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, FileText } from "lucide-react";

interface InvoiceProject {
  id: string;
  name: string;
  contact: Pick<Contact, "id" | "firstName" | "lastName" | "email">;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  total: number;
  amountPaid: number;
  project: InvoiceProject;
}

interface InvoiceListProps {
  invoices: Invoice[];
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
    month: "short",
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

export function InvoiceList({ invoices }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first invoice from a project.
        </p>
        <Link href="/dashboard/projects">
          <Button>Go to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => {
          const balance = invoice.total - invoice.amountPaid;
          const isOverdue =
            invoice.status !== InvoiceStatus.PAID &&
            invoice.status !== InvoiceStatus.CANCELLED &&
            new Date(invoice.dueDate) < new Date();

          return (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">
                {invoice.invoiceNumber}
              </TableCell>
              <TableCell>
                {invoice.project.contact.firstName}{" "}
                {invoice.project.contact.lastName}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {invoice.project.name}
              </TableCell>
              <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
              <TableCell
                className={isOverdue ? "text-red-600 font-medium" : ""}
              >
                {formatDate(invoice.dueDate)}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    isOverdue && invoice.status !== InvoiceStatus.PAID
                      ? statusColors.OVERDUE
                      : statusColors[invoice.status]
                  }
                >
                  {isOverdue && invoice.status !== InvoiceStatus.PAID
                    ? "Overdue"
                    : statusLabels[invoice.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(invoice.total)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {balance > 0 ? formatCurrency(balance) : "-"}
              </TableCell>
              <TableCell>
                <Link href={`/dashboard/invoices/${invoice.id}`}>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
