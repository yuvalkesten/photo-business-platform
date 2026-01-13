"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { retryFailedInstagramMessages } from "@/actions/instagram";
import { useToast } from "@/hooks/use-toast";

export function InstagramRetryButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      const result = await retryFailedInstagramMessages();

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (result.retriedCount === 0) {
        toast({
          title: "No messages to retry",
          description: "All messages have been processed or exceeded retry limit.",
        });
      } else {
        toast({
          title: "Retry started",
          description: `Retrying ${result.retriedCount} message(s).`,
        });
        router.refresh();
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRetry}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      Retry Failed
    </Button>
  );
}
