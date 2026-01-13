import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInstagramMessages } from "@/actions/instagram";
import { ProcessingStatus } from "@prisma/client";
import { InstagramFilters } from "./InstagramFilters";
import { InstagramPagination } from "./InstagramPagination";
import { InstagramRetryButton } from "./InstagramRetryButton";
import {
  MessageCircle,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  User,
  Briefcase,
  Instagram,
} from "lucide-react";

interface InstagramMessageListProps {
  classification?: string;
  status?: string;
  page: number;
}

type DMClassification = "INQUIRY" | "URGENT_REQUEST" | "OTHER";

const classificationConfig: Record<
  DMClassification,
  { label: string; icon: typeof MessageSquare; color: string; bgColor: string }
> = {
  INQUIRY: {
    label: "Inquiry",
    icon: MessageSquare,
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  URGENT_REQUEST: {
    label: "Urgent",
    icon: AlertTriangle,
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  OTHER: {
    label: "Other",
    icon: HelpCircle,
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
};

const statusConfig: Record<
  ProcessingStatus,
  { label: string; icon: typeof Clock; color: string }
> = {
  PENDING: { label: "Pending", icon: Clock, color: "text-yellow-600" },
  PROCESSING: { label: "Processing", icon: Loader2, color: "text-blue-600" },
  CLASSIFIED: { label: "Classified", icon: CheckCircle2, color: "text-green-600" },
  ACTION_TAKEN: { label: "Action Taken", icon: CheckCircle2, color: "text-green-600" },
  SKIPPED: { label: "Skipped", icon: HelpCircle, color: "text-gray-600" },
  FAILED: { label: "Failed", icon: XCircle, color: "text-red-600" },
};

export async function InstagramMessageList({
  classification,
  status,
  page,
}: InstagramMessageListProps) {
  const result = await getInstagramMessages({
    classification,
    status,
    page,
    limit: 20,
  });

  if (result.error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Error loading messages: {result.error}
        </CardContent>
      </Card>
    );
  }

  const { messages, pagination } = result;

  // Check if there are failed messages to show retry button
  const hasFailedMessages = messages?.some((m) => m.status === "FAILED" || m.status === "PENDING");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Instagram Messages</CardTitle>
          {hasFailedMessages && <InstagramRetryButton />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <InstagramFilters
          currentClassification={classification}
          currentStatus={status}
        />

        {/* Message List */}
        {messages && messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No messages found</h3>
            <p className="text-muted-foreground">
              {classification || status
                ? "Try adjusting your filters"
                : "Instagram messages will appear here when received"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <InstagramPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            classification={classification}
            status={status}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface MessageRowProps {
  message: {
    id: string;
    senderHandle: string | null;
    senderName: string | null;
    messageText: string;
    receivedAt: Date;
    classification: string | null;
    status: ProcessingStatus;
    createdContact: { id: string; firstName: string; lastName: string; email: string } | null;
    createdProject: { id: string; name: string; projectType: string; status: string } | null;
  };
}

function MessageRow({ message }: MessageRowProps) {
  const classConfig = message.classification
    ? classificationConfig[message.classification as DMClassification]
    : null;
  const statConfig = statusConfig[message.status];

  const initials = message.senderName
    ? message.senderName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : message.senderHandle
    ? message.senderHandle[0].toUpperCase()
    : "?";

  const receivedDate = new Date(message.receivedAt);
  const formattedDate = receivedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Truncate message text
  const truncatedText =
    message.messageText.length > 100
      ? message.messageText.slice(0, 100) + "..."
      : message.messageText;

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarFallback className={classConfig?.bgColor || "bg-pink-100"}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate flex items-center gap-1">
              {message.senderName || message.senderHandle || "Unknown"}
              {message.senderHandle && (
                <span className="text-sm text-muted-foreground font-normal">
                  @{message.senderHandle}
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {truncatedText}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Classification Badge */}
            {classConfig && (
              <Badge
                variant="secondary"
                className={`gap-1 ${classConfig.bgColor} ${classConfig.color} border-0`}
              >
                <classConfig.icon className="h-3 w-3" />
                {classConfig.label}
              </Badge>
            )}

            {/* Status for non-completed */}
            {message.status === "FAILED" && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Failed
              </Badge>
            )}

            {message.status === "PENDING" && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Created Entities */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Instagram className="h-3 w-3" />
            {formattedDate}
          </span>

          {message.createdContact && (
            <Link
              href={`/dashboard/contacts/${message.createdContact.id}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <User className="h-3 w-3" />
              {message.createdContact.firstName} {message.createdContact.lastName}
            </Link>
          )}

          {message.createdProject && (
            <Link
              href={`/dashboard/projects/${message.createdProject.id}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Briefcase className="h-3 w-3" />
              {message.createdProject.name}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
