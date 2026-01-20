"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getEmailDetail } from "@/actions/email/get-email-detail";
import { updateEmailClassification } from "@/actions/email/update-email-classification";
import { EmailClassification, ProcessingStatus } from "@prisma/client";
import {
  Mail,
  MessageSquare,
  AlertTriangle,
  FileText,
  Receipt,
  HelpCircle,
  User,
  Briefcase,
  Calendar,
  AlertCircle,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface EmailDetailSheetProps {
  emailId: string | null;
  onClose: () => void;
  onClassificationChange?: () => void;
}

type EmailDetail = NonNullable<
  Awaited<ReturnType<typeof getEmailDetail>>["email"]
>;

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
    label: "Urgent Request",
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

const statusLabels: Record<ProcessingStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  CLASSIFIED: "Classified",
  ACTION_TAKEN: "Action Taken",
  SKIPPED: "Skipped",
  FAILED: "Failed",
};

export function EmailDetailSheet({
  emailId,
  onClose,
  onClassificationChange,
}: EmailDetailSheetProps) {
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [emailContent, setEmailContent] = useState<{
    body: string;
    htmlBody: string | null;
  } | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] =
    useState<EmailClassification | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const isOpen = emailId !== null;
  const hasClassificationChanged =
    selectedClassification !== null &&
    email?.classification !== selectedClassification;

  useEffect(() => {
    if (emailId) {
      setIsLoading(true);
      setError(null);
      setEmail(null);
      setEmailContent(null);
      setContentError(null);
      setSelectedClassification(null);

      getEmailDetail(emailId)
        .then((result) => {
          if (result.error) {
            setError(result.error);
          } else if (result.email) {
            setEmail(result.email);
            setEmailContent(result.emailContent ?? null);
            setContentError(result.contentError ?? null);
            setSelectedClassification(result.email.classification);
          }
        })
        .catch(() => {
          setError("Failed to load email details");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [emailId]);

  const handleSaveClassification = () => {
    if (!emailId || !selectedClassification) return;

    startTransition(async () => {
      const result = await updateEmailClassification(
        emailId,
        selectedClassification
      );
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Classification updated",
          description: `Email reclassified as ${classificationConfig[selectedClassification].label}`,
        });
        // Update local state
        if (email) {
          setEmail({ ...email, classification: selectedClassification });
        }
        onClassificationChange?.();
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Parse classification data
  const classificationData = email?.classificationData as {
    confidence?: number;
    summary?: string;
    suggestedAction?: string;
    projectType?: string;
    isUrgent?: boolean;
    urgencyIndicators?: string[];
    dates?: {
      eventDate?: string;
      deadlineDate?: string;
    };
    manualOverride?: boolean;
    previousClassification?: string;
  } | null;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-6">
            <SheetHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </SheetHeader>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : email ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 pr-8">
                <Mail className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{email.subject}</span>
              </SheetTitle>
              <SheetDescription>
                From: {email.fromName || email.fromEmail}
                {email.fromName && (
                  <span className="text-muted-foreground">
                    {" "}
                    &lt;{email.fromEmail}&gt;
                  </span>
                )}
              </SheetDescription>
              <p className="text-xs text-muted-foreground">
                Received: {formatDate(email.receivedAt)}
              </p>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Classification Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Classification</h3>
                  {email.classification && (
                    <Badge
                      variant="secondary"
                      className={`gap-1 ${classificationConfig[email.classification].bgColor} ${classificationConfig[email.classification].color} border-0`}
                    >
                      {(() => {
                        const Icon =
                          classificationConfig[email.classification].icon;
                        return <Icon className="h-3 w-3" />;
                      })()}
                      {classificationConfig[email.classification].label}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={selectedClassification ?? undefined}
                    onValueChange={(value) =>
                      setSelectedClassification(value as EmailClassification)
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(classificationConfig).map(
                        ([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleSaveClassification}
                    disabled={!hasClassificationChanged || isPending}
                    size="sm"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span className="ml-1">Save</span>
                  </Button>
                </div>

                {classificationData?.manualOverride && (
                  <p className="text-xs text-muted-foreground">
                    Manually changed from{" "}
                    {classificationData.previousClassification}
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span>{statusLabels[email.status]}</span>
                </div>
              </div>

              <Separator />

              {/* Linked Entities */}
              {(email.createdContact ||
                email.createdProject ||
                email.financialDocument) && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Linked Entities</h3>

                    {email.createdContact && (
                      <Link
                        href={`/dashboard/contacts/${email.createdContact.id}`}
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {email.createdContact.firstName}{" "}
                          {email.createdContact.lastName}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    )}

                    {email.createdProject && (
                      <Link
                        href={`/dashboard/projects/${email.createdProject.id}`}
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{email.createdProject.name}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    )}

                    {email.financialDocument && (
                      <div className="flex items-center gap-2 text-sm">
                        {email.financialDocument.documentType === "INVOICE" ? (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>
                          {email.financialDocument.documentType}
                          {email.financialDocument.documentNumber &&
                            ` #${email.financialDocument.documentNumber}`}
                          {email.financialDocument.amount &&
                            ` - $${parseFloat(email.financialDocument.amount).toLocaleString()}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* AI Classification Details */}
              {classificationData && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">AI Analysis</h3>

                    {classificationData.confidence !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Confidence
                        </span>
                        <span>
                          {Math.round(classificationData.confidence * 100)}%
                        </span>
                      </div>
                    )}

                    {classificationData.summary && (
                      <div className="text-sm">
                        <span className="text-muted-foreground block mb-1">
                          Summary
                        </span>
                        <p className="text-foreground">
                          {classificationData.summary}
                        </p>
                      </div>
                    )}

                    {classificationData.suggestedAction && (
                      <div className="text-sm">
                        <span className="text-muted-foreground block mb-1">
                          Suggested Action
                        </span>
                        <p className="text-foreground">
                          {classificationData.suggestedAction}
                        </p>
                      </div>
                    )}

                    {classificationData.projectType && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Project Type
                        </span>
                        <Badge variant="outline">
                          {classificationData.projectType}
                        </Badge>
                      </div>
                    )}

                    {classificationData.isUrgent && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Marked as urgent</span>
                      </div>
                    )}

                    {classificationData.dates?.eventDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Event:</span>
                        <span>{classificationData.dates.eventDate}</span>
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Error Message */}
              {email.status === "FAILED" && email.errorMessage && (
                <>
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive mb-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        Processing Error
                      </span>
                    </div>
                    <p className="text-sm text-destructive/80">
                      {email.errorMessage}
                    </p>
                    {email.retryCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Retry attempts: {email.retryCount}
                      </p>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Email Content */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Email Content</h3>

                {contentError ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {contentError}
                    </p>
                    {email.snippet && (
                      <p className="text-sm mt-2 italic">&quot;{email.snippet}&quot;</p>
                    )}
                  </div>
                ) : emailContent ? (
                  <div className="p-3 bg-muted rounded-lg max-h-[300px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {emailContent.body}
                    </pre>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      No content available
                    </p>
                    {email.snippet && (
                      <p className="text-sm mt-2 italic">&quot;{email.snippet}&quot;</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
