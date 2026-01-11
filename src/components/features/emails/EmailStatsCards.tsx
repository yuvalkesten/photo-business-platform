import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmailStats } from "@/actions/email";
import {
  Mail,
  MessageSquare,
  AlertTriangle,
  FileText,
  Receipt,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export async function EmailStatsCards() {
  const result = await getEmailStats();

  if (result.error || !result.stats) {
    return null;
  }

  const { byStatus, byClassification } = result.stats;

  const stats = [
    {
      title: "Total Processed",
      value: Object.values(byStatus).reduce((a, b) => a + b, 0),
      icon: Mail,
      color: "text-blue-500",
    },
    {
      title: "Inquiries",
      value: byClassification.INQUIRY || 0,
      icon: MessageSquare,
      color: "text-green-500",
    },
    {
      title: "Urgent",
      value: byClassification.URGENT_REQUEST || 0,
      icon: AlertTriangle,
      color: "text-orange-500",
    },
    {
      title: "Invoices",
      value: byClassification.INVOICE || 0,
      icon: FileText,
      color: "text-purple-500",
    },
    {
      title: "Receipts",
      value: byClassification.RECEIPT || 0,
      icon: Receipt,
      color: "text-teal-500",
    },
  ];

  const hasActivity = Object.values(byStatus).reduce((a, b) => a + b, 0) > 0;

  if (!hasActivity) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No emails processed yet. Enable email classification to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
