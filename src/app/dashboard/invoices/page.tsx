import { Suspense } from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/utils";
import { redirect } from "next/navigation";
import { getInvoices } from "@/actions/invoices";
import { InvoiceStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceList } from "@/components/features/invoices";
import { Plus, FileText, Search, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface InvoicesPageProps {
  searchParams: Promise<{
    status?: InvoiceStatus;
    search?: string;
    page?: string;
  }>;
}

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

function InvoicesLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}

async function InvoicesData({
  status,
  search,
  page,
}: {
  status?: InvoiceStatus;
  search?: string;
  page: number;
}) {
  const result = await getInvoices({ status, search, page, limit: 20 });

  if (result.error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">{result.error}</p>
        </CardContent>
      </Card>
    );
  }

  return <InvoiceList invoices={result.invoices || []} />;
}

async function InvoiceStats() {
  const [allResult, draftResult, sentResult, paidResult] = await Promise.all([
    getInvoices({ limit: 1000 }),
    getInvoices({ status: InvoiceStatus.DRAFT, limit: 1000 }),
    getInvoices({ status: InvoiceStatus.SENT, limit: 1000 }),
    getInvoices({ status: InvoiceStatus.PAID, limit: 1000 }),
  ]);

  const allInvoices = allResult.invoices || [];
  const draftCount = draftResult.invoices?.length || 0;
  const sentCount = sentResult.invoices?.length || 0;
  const paidCount = paidResult.invoices?.length || 0;

  const totalOutstanding = allInvoices
    .filter((inv) => inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELLED)
    .reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);

  const totalPaid = paidResult.invoices?.reduce((sum, inv) => sum + inv.total, 0) || 0;

  const overdueCount = allInvoices.filter(
    (inv) =>
      inv.status !== InvoiceStatus.PAID &&
      inv.status !== InvoiceStatus.CANCELLED &&
      new Date(inv.dueDate) < new Date()
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">{sentCount} invoices sent</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">{paidCount} invoices</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{draftCount}</div>
          <p className="text-xs text-muted-foreground">Ready to send</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{overdueCount}</div>
          <p className="text-xs text-muted-foreground">Need attention</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const user = await requireAuth();
  if (!user) redirect("/auth/signin");

  const params = await searchParams;
  const status = params.status;
  const search = params.search;
  const page = parseInt(params.page || "1");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Create and manage client invoices</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/invoices/new">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <InvoiceStats />
      </Suspense>

      {/* Filters */}
      <form className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search invoices..."
            defaultValue={search}
            className="pl-9"
          />
        </div>
        <Select name="status" defaultValue={status || "all"}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Filter</Button>
      </form>

      {/* Invoice List */}
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<InvoicesLoading />}>
            <InvoicesData status={status} search={search} page={page} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
