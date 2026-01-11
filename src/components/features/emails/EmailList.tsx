import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getProcessedEmails } from "@/actions/email";
import { EmailClassification, ProcessingStatus } from "@prisma/client";
import { EmailFilters } from "./EmailFilters";
import { EmailPagination } from "./EmailPagination";
import {
  Mail,
  MessageSquare,
  AlertTriangle,
  FileText,
  Receipt,
  HelpCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  User,
  Briefcase,
} from "lucide-react";

interface EmailListProps {
  classification?: string;
  status?: string;
  page: number;
}

const classificationConfig: Record<
  EmailClassification,
  { label: string; icon: typeof Mail; color: string; bgColor: string }
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
  INVOICE: {
    label: "Invoice",
    icon: FileText,
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  RECEIPT: {
    label: "Receipt",
    icon: Receipt,
    color: "text-teal-700",
    bgColor: "bg-teal-100",
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

export async function EmailList({ classification, status, page }: EmailListProps) {
  const result = await getProcessedEmails({
    classification: classification as EmailClassification | undefined,
    status: status as ProcessingStatus | undefined,
    page,
    limit: 20,
  });

  if (result.error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Error loading emails: {result.error}
        </CardContent>
      </Card>
    );
  }

  const { emails, pagination } = result;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processed Emails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <EmailFilters
          currentClassification={classification}
          currentStatus={status}
        />

        {/* Email List */}
        {emails && emails.length > 0 ? (
          <div className="space-y-3">
            {emails.map((email) => (
              <EmailRow key={email.id} email={email} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No emails found</h3>
            <p className="text-muted-foreground">
              {classification || status
                ? "Try adjusting your filters"
                : "Processed emails will appear here"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <EmailPagination
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

interface EmailRowProps {
  email: {
    id: string;
    subject: string;
    fromEmail: string;
    fromName: string | null;
    receivedAt: string;
    classification: EmailClassification | null;
    status: ProcessingStatus;
    createdContact: { id: string; firstName: string; lastName: string } | null;
    createdProject: { id: string; name: string } | null;
    financialDocument: { id: string; documentType: string; amount: string | null } | null;
  };
}

function EmailRow({ email }: EmailRowProps) {
  const classConfig = email.classification
    ? classificationConfig[email.classification]
    : null;
  const statConfig = statusConfig[email.status];

  const initials = email.fromName
    ? email.fromName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email.fromEmail[0].toUpperCase();

  const receivedDate = new Date(email.receivedAt);
  const formattedDate = receivedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarFallback className={classConfig?.bgColor || "bg-gray-100"}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">
              {email.fromName || email.fromEmail}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {email.subject}
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
            {email.status === "FAILED" && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Failed
              </Badge>
            )}

            {email.status === "PENDING" && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Created Entities */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{formattedDate}</span>

          {email.createdContact && (
            <Link
              href={`/dashboard/contacts/${email.createdContact.id}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <User className="h-3 w-3" />
              {email.createdContact.firstName} {email.createdContact.lastName}
            </Link>
          )}

          {email.createdProject && (
            <Link
              href={`/dashboard/projects/${email.createdProject.id}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Briefcase className="h-3 w-3" />
              {email.createdProject.name}
            </Link>
          )}

          {email.financialDocument && (
            <span className="flex items-center gap-1">
              {email.financialDocument.documentType === "INVOICE" ? (
                <FileText className="h-3 w-3" />
              ) : (
                <Receipt className="h-3 w-3" />
              )}
              {email.financialDocument.amount
                ? `$${parseFloat(email.financialDocument.amount).toLocaleString()}`
                : email.financialDocument.documentType}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
