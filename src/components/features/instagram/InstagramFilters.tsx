"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface InstagramFiltersProps {
  currentClassification?: string;
  currentStatus?: string;
}

export function InstagramFilters({
  currentClassification,
  currentStatus,
}: InstagramFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Reset to page 1 when filtering
    params.delete("page");

    router.push(`/dashboard/messages?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/dashboard/messages");
  };

  const hasFilters = currentClassification || currentStatus;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Classification Filter */}
      <Select
        value={currentClassification || "all"}
        onValueChange={(value) => updateFilter("classification", value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Classification" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="INQUIRY">Inquiries</SelectItem>
          <SelectItem value="URGENT_REQUEST">Urgent Requests</SelectItem>
          <SelectItem value="OTHER">Other</SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={currentStatus || "all"}
        onValueChange={(value) => updateFilter("status", value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="ACTION_TAKEN">Action Taken</SelectItem>
          <SelectItem value="CLASSIFIED">Classified</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="FAILED">Failed</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
