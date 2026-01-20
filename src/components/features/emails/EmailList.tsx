import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProcessedEmails } from "@/actions/email";
import { EmailClassification, ProcessingStatus } from "@prisma/client";
import { EmailFilters } from "./EmailFilters";
import { EmailPagination } from "./EmailPagination";
import { EmailListClient } from "./EmailListClient";
import { Mail } from "lucide-react";

interface EmailListProps {
  classification?: string;
  status?: string;
  page: number;
}

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
          <EmailListClient emails={emails} />
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
