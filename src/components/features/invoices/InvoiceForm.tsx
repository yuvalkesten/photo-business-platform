"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition, useMemo } from "react";
import { z } from "zod";
import { createInvoice } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface ContactInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  amount: z.number(),
});

const invoiceFormSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface Project {
  id: string;
  name: string;
  totalPrice: number | null;
  contact: ContactInfo;
}

interface InvoiceFormProps {
  projects: Project[];
  defaultProjectId?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function InvoiceForm({ projects, defaultProjectId }: InvoiceFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const defaultDueDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Default to 30 days from now
    return date.toISOString().split("T")[0];
  }, []);

  const selectedProject = defaultProjectId
    ? projects.find((p) => p.id === defaultProjectId)
    : undefined;

  const defaultLineItems = selectedProject?.totalPrice
    ? [
        {
          description: selectedProject.name,
          quantity: 1,
          unitPrice: selectedProject.totalPrice,
          amount: selectedProject.totalPrice,
        },
      ]
    : [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }];

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      projectId: defaultProjectId || "",
      lineItems: defaultLineItems,
      taxRate: 0,
      notes: "",
      dueDate: defaultDueDate,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchLineItems = form.watch("lineItems");
  const watchTaxRate = form.watch("taxRate") || 0;

  const subtotal = watchLineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const tax = (subtotal * watchTaxRate) / 100;
  const total = subtotal + tax;

  const updateLineItemAmount = (index: number) => {
    const quantity = form.getValues(`lineItems.${index}.quantity`) || 0;
    const unitPrice = form.getValues(`lineItems.${index}.unitPrice`) || 0;
    const amount = quantity * unitPrice;
    form.setValue(`lineItems.${index}.amount`, amount);
  };

  const onSubmit = (data: InvoiceFormData) => {
    startTransition(async () => {
      const result = await createInvoice({
        projectId: data.projectId,
        lineItems: data.lineItems,
        taxRate: data.taxRate,
        notes: data.notes,
        dueDate: new Date(data.dueDate),
      });

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Invoice created",
        description: `Invoice ${result.invoice?.invoiceNumber} has been created.`,
      });

      router.push(`/dashboard/invoices/${result.invoice?.id}`);
    });
  };

  const handleProjectChange = (projectId: string) => {
    form.setValue("projectId", projectId);
    const project = projects.find((p) => p.id === projectId);
    if (project?.totalPrice) {
      form.setValue("lineItems", [
        {
          description: project.name,
          quantity: 1,
          unitPrice: project.totalPrice,
          amount: project.totalPrice,
        },
      ]);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Project</CardTitle>
          <CardDescription>
            Select the project this invoice is for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="projectId">Project *</Label>
            <Select
              value={form.watch("projectId")}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} - {project.contact.firstName}{" "}
                    {project.contact.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.projectId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.projectId.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
          <CardDescription>Add items to the invoice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1"></div>
          </div>

          {/* Items */}
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5">
                <Input
                  {...form.register(`lineItems.${index}.description`)}
                  placeholder="Service description"
                />
                {form.formState.errors.lineItems?.[index]?.description && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.lineItems[index]?.description?.message}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min="1"
                  {...form.register(`lineItems.${index}.quantity`, {
                    valueAsNumber: true,
                  })}
                  onChange={(e) => {
                    form.setValue(
                      `lineItems.${index}.quantity`,
                      parseInt(e.target.value) || 0
                    );
                    updateLineItemAmount(index);
                  }}
                  className="text-center"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register(`lineItems.${index}.unitPrice`, {
                    valueAsNumber: true,
                  })}
                  onChange={(e) => {
                    form.setValue(
                      `lineItems.${index}.unitPrice`,
                      parseFloat(e.target.value) || 0
                    );
                    updateLineItemAmount(index);
                  }}
                  className="text-right"
                />
              </div>
              <div className="col-span-2 flex items-center justify-end h-10 text-sm">
                {formatCurrency(watchLineItems[index]?.amount || 0)}
              </div>
              <div className="col-span-1 flex justify-end">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ description: "", quantity: 1, unitPrice: 0, amount: 0 })
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Line Item
          </Button>

          {form.formState.errors.lineItems && (
            <p className="text-sm text-destructive">
              {form.formState.errors.lineItems.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tax & Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-end space-y-2">
            <div className="grid grid-cols-2 gap-4 w-64">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-right">{formatCurrency(subtotal)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 w-64 items-center">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                {...form.register("taxRate", { valueAsNumber: true })}
                className="w-20 text-right ml-auto"
              />
            </div>
            {tax > 0 && (
              <div className="grid grid-cols-2 gap-4 w-64">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-right">{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 w-64 pt-2 border-t font-semibold">
              <span>Total</span>
              <span className="text-right">{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Due Date & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input type="date" {...form.register("dueDate")} className="w-48" />
            {form.formState.errors.dueDate && (
              <p className="text-sm text-destructive">
                {form.formState.errors.dueDate.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              {...form.register("notes")}
              placeholder="Additional notes (payment terms, thank you message, etc.)"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
