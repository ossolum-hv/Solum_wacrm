"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCan } from "@/hooks/use-can";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  Search,
  Filter,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  UserPlus,
  Building2,
  Mail,
  Phone,
  TrendingUp,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Input,
} from "@/components/ui/input";
import {
  Badge,
} from "@/components/ui/badge";
import { toast } from "sonner";

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
type StatusFilter = LeadStatus | "all";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  industry: string | null;
  team_size: string | null;
  message: string | null;
  status: LeadStatus;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  source: string;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  limit: number;
  offset: number;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

const STATUS_COLORS: Record<LeadStatus, "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"> = {
  new: "default",
  contacted: "secondary",
  qualified: "outline",
  converted: "ghost",
  lost: "destructive",
};

const STATUS_ICONS: Record<LeadStatus, React.ComponentType<{ className?: string }>> = {
  new: UserPlus,
  contacted: Clock,
  qualified: TrendingUp,
  converted: CheckCircle,
  lost: XCircle,
};

function StatusBadge({ status }: { status: LeadStatus }) {
  const t = useTranslations("Leads");
  const Icon = STATUS_ICONS[status];
  const color = STATUS_COLORS[status];
  const label = t(`status.${status}` as any) || STATUS_LABELS[status];

  return (
    <Badge variant={color} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function StatusDropdown({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, status: LeadStatus) => void }) {
  const t = useTranslations("Leads");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(["new", "contacted", "qualified", "converted", "lost"] as LeadStatus[]).map((status) => {
          const StatusIcon = STATUS_ICONS[status];
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => onUpdate(lead.id, status)}
              className={cn(
                lead.status === status && "bg-primary/10 text-primary",
                "flex items-center gap-2"
              )}
            >
              <StatusIcon className="h-4 w-4" />
              {t(`status.${status}` as any) || STATUS_LABELS[status]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortableHeader({
  title,
  sortKey,
  currentSort,
  currentOrder,
  onSort,
}: {
  title: string;
  sortKey: string;
  currentSort: string;
  currentOrder: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const isActive = currentSort === sortKey;
  const handleClick = () => onSort(sortKey);

  return (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 text-left font-medium hover:bg-transparent"
        onClick={handleClick}
      >
        <div className="flex items-center gap-1">
          {title}
          {isActive && (
            <ArrowUpDown className={cn("h-3 w-3", currentOrder === "asc" && "rotate-180")} />
          )}
        </div>
      </Button>
    </TableHead>
  );
}

export default function LeadsPage() {
  const t = useTranslations("Leads");
  const { accountId, profileLoading } = useAuth();
  const canManage = useCan("manage-leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<keyof Lead>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLeads = useCallback(async () => {
    if (!accountId || profileLoading) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
        sort: sortKey,
        order: sortOrder,
      });

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch leads");

      const data: LeadsResponse = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch (error) {
      console.error("[LeadsPage] fetch error:", error);
      toast.error(t("toast.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [accountId, profileLoading, page, pageSize, debouncedSearch, statusFilter, sortKey, sortOrder, t]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusUpdate = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status: newStatus, updated_at: new Date().toISOString() } : lead
        )
      );
      toast.success(t("toast.statusUpdated"));
    } catch (error) {
      console.error("[LeadsPage] status update error:", error);
      toast.error(t("toast.failedStatusUpdate"));
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as keyof Lead);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (profileLoading || !canManage) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLeads}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("search.placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t("filter.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.allStatuses")}</SelectItem>
              <SelectItem value="new">{t("status.new")}</SelectItem>
              <SelectItem value="contacted">{t("status.contacted")}</SelectItem>
              <SelectItem value="qualified">{t("status.qualified")}</SelectItem>
              <SelectItem value="converted">{t("status.converted")}</SelectItem>
              <SelectItem value="lost">{t("status.lost")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                title={t("table.name")}
                sortKey="full_name"
                currentSort={sortKey}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                title={t("table.email")}
                sortKey="email"
                currentSort={sortKey}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                title={t("table.company")}
                sortKey="company_name"
                currentSort={sortKey}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                title={t("table.phone")}
                sortKey="phone"
                currentSort={sortKey}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                title={t("table.status")}
                sortKey="status"
                currentSort={sortKey}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                title={t("table.source")}
                sortKey="source"
                currentSort={sortKey}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                title={t("table.createdAt")}
                sortKey="created_at"
                currentSort={sortKey}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <TableHead className="w-[60px] text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  {t("emptyState")}
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{lead.full_name}</TableCell>
                  <TableCell>
                    <a href={`mailto:${lead.email}`} className="text-primary hover:underline flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {lead.email}
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {lead.company_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <a href={`tel:${lead.phone}`} className="text-primary hover:underline flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </a>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="capitalize">{lead.source}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusDropdown lead={lead} onUpdate={handleStatusUpdate} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border p-4">
          <p className="text-sm text-muted-foreground">
            {t("pagination.showing", {
              start: (page - 1) * pageSize + 1,
              end: Math.min(page * pageSize, total),
              total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-20 text-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}