"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Phone,
  Mail,
  Building2,
  Users,
  Filter,
  Check,
  X,
  Calendar,
  MessageSquare,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  industry: string | null;
  team_size: string | null;
  message: string | null;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  assigned_to_user_id: string | null;
  created_at: string;
  last_contacted_at: string | null;
}

const STATUS_COLORS: Record<Lead["status"], string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  contacted: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  qualified: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  converted: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  lost: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const STATUS_LABELS: Record<Lead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminLeadsPage() {
  const { isSuperadmin, profileLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/leads?${params}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || "Failed to load leads");
        return;
      }

      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("[AdminLeadsPage] load error:", err);
      toast.error("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Wait for profile to load before checking superadmin status
  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperadmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <AlertTriangle className="size-12 mx-auto text-amber-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only superadmins can view leads.
          </p>
        </div>
      </div>
    );
  }

  const updateStatus = async (leadId: string, newStatus: Lead["status"]) => {
    setUpdating(leadId);
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || "Failed to update lead");
        return;
      }

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
      }
      toast.success(`Lead marked as ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      console.error("[AdminLeadsPage] update error:", err);
      toast.error("Failed to update lead");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            {total} total demo requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No leads yet</h3>
            <p className="text-muted-foreground mt-1">
              Demo requests will appear here
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{lead.full_name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-foreground">
                          <Mail className="size-3" />
                          {lead.email}
                        </a>
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-foreground">
                          <Phone className="size-3" />
                          {lead.phone}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{lead.company_name}</span>
                      {lead.industry && (
                        <span className="text-xs text-muted-foreground">{lead.industry}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {lead.team_size || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {fmtDate(lead.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="relative group">
                        <button className="p-1.5 rounded hover:bg-muted transition-colors">
                          <ChevronDown className="size-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 z-10 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px] hidden group-hover:block">
                          <button
                            onClick={() => updateStatus(lead.id, "contacted")}
                            disabled={updating === lead.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                          >
                            {updating === lead.id ? <Loader2 className="size-3 animate-spin" /> : <Phone className="size-3" />}
                            Mark Contacted
                          </button>
                          <button
                            onClick={() => updateStatus(lead.id, "qualified")}
                            disabled={updating === lead.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                          >
                            <Check className="size-3" />
                            Mark Qualified
                          </button>
                          <button
                            onClick={() => updateStatus(lead.id, "converted")}
                            disabled={updating === lead.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-green-600"
                          >
                            <Check className="size-3" />
                            Mark Converted
                          </button>
                          <button
                            onClick={() => updateStatus(lead.id, "lost")}
                            disabled={updating === lead.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-600"
                          >
                            <X className="size-3" />
                            Mark Lost
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
