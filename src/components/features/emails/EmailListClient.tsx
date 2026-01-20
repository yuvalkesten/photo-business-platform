"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmailClassification, ProcessingStatus } from "@prisma/client";
import { EmailDetailSheet } from "./EmailDetailSheet";
import {
  Mail,
  MessageSquare,
  AlertTriangle,
  FileText,
  Receipt,
  HelpCircle,
  Clock,
  XCircle,
  User,
  Briefcase,
} from "lucide-react";

interface EmailData {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  receivedAt: string;
  classification: EmailClassification | null;
  status: ProcessingStatus;
  createdContact: { id: string; firstName: string; lastName: string } | null;
  createdProject: { id: string; name: string } | null;
  financialDocument: {
    id: string;
    documentType: string;
    amount: string | null;
  } | null;
}

interface EmailListClientProps {
  emails: EmailData[];
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

export function EmailListClient({ emails }: EmailListClientProps) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const router = useRouter();

  const handleClassificationChange = () => {
    // Refresh the page to get updated data
    router.refresh();
  };

  return (
    <>
      <div className="space-y-3">
        {emails.map((email) => (
          <EmailRow
            key={email.id}
            email={email}
            isSelected={selectedEmailId === email.id}
            onClick={() => setSelectedEmailId(email.id)}
          />
        ))}
      </div>

      <EmailDetailSheet
        emailId={selectedEmailId}
        onClose={() => setSelectedEmailId(null)}
        onClassificationChange={handleClassificationChange}
      />
    </>
  );
}

interface EmailRowProps {
  email: EmailData;
  isSelected: boolean;
  onClick: () => void;
}

function EmailRow({ email, isSelected, onClick }: EmailRowProps) {
  const classConfig = email.classification
    ? classificationConfig[email.classification]
    : null;

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
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? "bg-accent border-accent-foreground/20"
          : "hover:bg-muted/50"
      }`}
    >
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
              onClick={(e) => e.stopPropagation()}
            >
              <User className="h-3 w-3" />
              {email.createdContact.firstName} {email.createdContact.lastName}
            </Link>
          )}

          {email.createdProject && (
            <Link
              href={`/dashboard/projects/${email.createdProject.id}`}
              className="flex items-center gap-1 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
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
