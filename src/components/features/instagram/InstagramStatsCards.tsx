import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInstagramStats } from "@/actions/instagram";
import {
  MessageCircle,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export async function InstagramStatsCards() {
  const result = await getInstagramStats();

  if (result.error || !result.stats) {
    return null;
  }

  const { stats } = result;

  const statItems = [
    {
      title: "Total Messages",
      value: stats.total,
      icon: MessageCircle,
      color: "text-blue-500",
    },
    {
      title: "Inquiries",
      value: stats.byClassification.INQUIRY || 0,
      icon: MessageSquare,
      color: "text-green-500",
    },
    {
      title: "Urgent",
      value: stats.byClassification.URGENT_REQUEST || 0,
      icon: AlertTriangle,
      color: "text-orange-500",
    },
    {
      title: "Action Taken",
      value: stats.byStatus.ACTION_TAKEN || 0,
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    {
      title: "Failed",
      value: stats.byStatus.FAILED || 0,
      icon: XCircle,
      color: "text-red-500",
    },
  ];

  if (stats.total === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No Instagram messages received yet. Connect your account and start receiving DMs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statItems.map((stat) => (
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
