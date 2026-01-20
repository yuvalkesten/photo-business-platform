import { requireAuth } from "@/lib/auth/utils";
import { redirect } from "next/navigation";
import { getProjects } from "@/actions/projects";
import { InvoiceForm } from "@/components/features/invoices";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectStatus } from "@prisma/client";

interface NewInvoicePageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const user = await requireAuth();
  if (!user) redirect("/auth/signin");

  const params = await searchParams;
  const projectId = params.projectId;

  // Get all booked or later projects (excluding leads and cancelled)
  const result = await getProjects({
    limit: 500,
    excludeLeads: true,
  });

  if (result.error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter to only show projects that can have invoices
  const eligibleProjects =
    result.projects?.filter(
      (p) =>
        p.status !== ProjectStatus.CANCELLED &&
        p.status !== ProjectStatus.ARCHIVED
    ) || [];

  const formattedProjects = eligibleProjects.map((project) => ({
    id: project.id,
    name: project.name,
    totalPrice: project.totalPrice,
    contact: project.contact,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Invoice</h1>
        <p className="text-muted-foreground">Create an invoice for a project</p>
      </div>

      {formattedProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">No eligible projects</h3>
            <p className="text-muted-foreground text-center">
              You need at least one booked project to create an invoice.
            </p>
          </CardContent>
        </Card>
      ) : (
        <InvoiceForm projects={formattedProjects} defaultProjectId={projectId} />
      )}
    </div>
  );
}
