import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/utils";
import { InstagramSettingsCard } from "@/components/features/instagram/InstagramSettingsCard";
import { InstagramStatsCards } from "@/components/features/instagram/InstagramStatsCards";
import { InstagramMessageList } from "@/components/features/instagram/InstagramMessageList";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Instagram Messages | Dashboard",
  description: "Manage Instagram DM settings and view processed messages",
};

interface MessagesPageProps {
  searchParams: Promise<{
    classification?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const user = await requireAuth();

  if (!user) {
    redirect("/auth/signin");
  }

  const params = await searchParams;
  const classification = params.classification || undefined;
  const status = params.status || undefined;
  const page = parseInt(params.page || "1", 10);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Instagram Messages</h1>
        <p className="text-muted-foreground">
          Receive and classify Instagram DMs to automatically create leads and projects
        </p>
      </div>

      {/* Settings Card */}
      <Suspense fallback={<SettingsCardSkeleton />}>
        <InstagramSettingsCard />
      </Suspense>

      {/* Stats Cards */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <InstagramStatsCards />
      </Suspense>

      {/* Message List */}
      <Suspense fallback={<MessageListSkeleton />}>
        <InstagramMessageList
          classification={classification}
          status={status}
          page={page}
        />
      </Suspense>
    </div>
  );
}

function SettingsCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MessageListSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
