"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Mail, AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import {
  setupEmailWatch,
  stopEmailWatch,
  getEmailWatchStatus,
} from "@/actions/email";

type WatchStatus = "loading" | "active" | "inactive" | "error";

export function EmailSettingsCard() {
  const [status, setStatus] = useState<WatchStatus>("loading");
  const [expiration, setExpiration] = useState<string | null>(null);
  const [needsRenewal, setNeedsRenewal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch initial status
  useEffect(() => {
    async function fetchStatus() {
      const result = await getEmailWatchStatus();

      if (result.error) {
        setStatus("error");
        setError(result.error);
        return;
      }

      if (result.status === "active" && result.watch) {
        setStatus("active");
        setExpiration(result.watch.expiration);
        setNeedsRenewal(result.needsRenewal ?? false);
      } else {
        setStatus("inactive");
      }
    }

    fetchStatus();
  }, []);

  const handleToggle = (enabled: boolean) => {
    setError(null);

    startTransition(async () => {
      if (enabled) {
        const result = await setupEmailWatch();

        if (result.error) {
          setError(result.error);
          setStatus("inactive");
          return;
        }

        if (result.success && result.watch) {
          setStatus("active");
          setExpiration(result.watch.expiration);
          setNeedsRenewal(false);
        }
      } else {
        const result = await stopEmailWatch();

        if (result.error) {
          setError(result.error);
          return;
        }

        setStatus("inactive");
        setExpiration(null);
      }
    });
  };

  const handleRenew = () => {
    setError(null);

    startTransition(async () => {
      const result = await setupEmailWatch();

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success && result.watch) {
        setExpiration(result.watch.expiration);
        setNeedsRenewal(false);
      }
    });
  };

  const formatExpiration = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>Email Classification</CardTitle>
        </div>
        <CardDescription>
          Automatically classify incoming emails and create CRM entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="email-classification"
                checked={status === "active"}
                onCheckedChange={handleToggle}
                disabled={isPending || status === "loading"}
              />
              <Label htmlFor="email-classification" className="font-medium">
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {status === "active" ? "Disabling..." : "Enabling..."}
                  </span>
                ) : status === "active" ? (
                  "Enabled"
                ) : (
                  "Disabled"
                )}
              </Label>
            </div>

            {status === "active" && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Active
              </Badge>
            )}

            {status === "inactive" && (
              <Badge variant="secondary">Inactive</Badge>
            )}

            {status === "loading" && (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Loading...
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {expiration && (
              <span className="text-sm text-muted-foreground">
                Renews: {formatExpiration(expiration)}
              </span>
            )}

            {needsRenewal && status === "active" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRenew}
                disabled={isPending}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Renew Now
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {status === "inactive" && !error && (
          <p className="mt-4 text-sm text-muted-foreground">
            Enable email classification to automatically detect inquiries, urgent requests,
            invoices, and receipts from your Gmail inbox.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
