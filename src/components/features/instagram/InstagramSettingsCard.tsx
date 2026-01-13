"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, AlertCircle, CheckCircle2, Loader2, LogOut, ExternalLink } from "lucide-react";
import { getInstagramStatus } from "@/actions/instagram";

type ConnectionStatus = "loading" | "connected" | "disconnected" | "error" | "expired";

export function InstagramSettingsCard() {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [account, setAccount] = useState<{
    username: string | null;
    pageName: string | null;
    tokenExpiresAt: string | null;
  } | null>(null);
  const [needsRenewal, setNeedsRenewal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchStatus() {
      const result = await getInstagramStatus();

      if (result.error) {
        setStatus("error");
        setError(result.error);
        return;
      }

      if (result.connected && result.account) {
        setStatus("connected");
        setAccount({
          username: result.account.username,
          pageName: result.account.pageName,
          tokenExpiresAt: result.account.tokenExpiresAt,
        });
        setNeedsRenewal(result.needsRenewal ?? false);
      } else if (result.isExpired) {
        setStatus("expired");
        setAccount(result.account ? {
          username: result.account.username,
          pageName: result.account.pageName,
          tokenExpiresAt: result.account.tokenExpiresAt,
        } : null);
      } else {
        setStatus("disconnected");
      }
    }

    fetchStatus();
  }, []);

  const handleConnect = () => {
    window.location.href = "/api/auth/instagram";
  };

  const handleDisconnect = () => {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/instagram/disconnect", {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to disconnect");
          return;
        }

        setStatus("disconnected");
        setAccount(null);
        router.refresh();
      } catch {
        setError("Failed to disconnect Instagram account");
      }
    });
  };

  const formatExpiration = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Instagram className="h-5 w-5" />
          <CardTitle>Instagram Direct Messages</CardTitle>
        </div>
        <CardDescription>
          Connect your Instagram Business account to receive and classify DMs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {status === "loading" && (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Loading...
              </Badge>
            )}

            {status === "connected" && (
              <>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Connected
                </Badge>
                <div className="text-sm">
                  <span className="font-medium">@{account?.username}</span>
                  {account?.pageName && (
                    <span className="text-muted-foreground ml-2">
                      ({account.pageName})
                    </span>
                  )}
                </div>
              </>
            )}

            {status === "disconnected" && (
              <Badge variant="secondary">Not Connected</Badge>
            )}

            {status === "expired" && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Token Expired
              </Badge>
            )}

            {status === "error" && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Error
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {account?.tokenExpiresAt && status === "connected" && (
              <span className="text-sm text-muted-foreground">
                {needsRenewal ? (
                  <span className="text-orange-600">
                    Expires: {formatExpiration(account.tokenExpiresAt)}
                  </span>
                ) : (
                  <>Expires: {formatExpiration(account.tokenExpiresAt)}</>
                )}
              </span>
            )}

            {(status === "disconnected" || status === "expired") && (
              <Button onClick={handleConnect} disabled={isPending}>
                <Instagram className="h-4 w-4 mr-2" />
                {status === "expired" ? "Reconnect" : "Connect Instagram"}
              </Button>
            )}

            {status === "connected" && (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
            )}

            {needsRenewal && status === "connected" && (
              <Button onClick={handleConnect} disabled={isPending}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Renew
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

        {status === "disconnected" && !error && (
          <p className="mt-4 text-sm text-muted-foreground">
            Connect your Instagram Business account to automatically receive and classify
            direct messages. Inquiries will create leads and projects in your CRM.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
