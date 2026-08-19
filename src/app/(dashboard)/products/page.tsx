"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Product, ProductType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useCan } from "@/hooks/use-can";
import { GatedButton } from "@/components/ui/gated-button";
import { ProductForm } from "@/components/products/product-form";
import { ProductsTable } from "./components/products-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

const PAGE_SIZE = 25;

export default function ProductsPage() {
  const t = useTranslations("Products.page");
  const supabase = createClient();
  const canCreate = useCan("send-messages");
  const canEdit = useCan("send-messages");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState<ProductType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  const searchRef = useRef(search);
  searchRef.current = search;

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
        sortBy: "sort_order",
        sortOrder: "asc",
      });

      if (searchRef.current.trim()) {
        params.set("search", searchRef.current.trim());
      }
      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }
      if (statusFilter !== "all") {
        params.set("isActive", statusFilter === "active" ? "true" : "false");
      }

      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to fetch products");
      }

      setProducts(data.products ?? []);
      setTotalCount(data.totalCount ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("toastFailedLoad");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, typeFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleTypeFilterChange = (value: ProductType | "all" | null) => {
    if (value !== null) {
      setTypeFilter(value);
      setPage(0);
    }
  };

  const handleStatusFilterChange = (value: "all" | "active" | "inactive" | null) => {
    if (value !== null) {
      setStatusFilter(value);
      setPage(0);
    }
  };

  const openCreateForm = () => {
    setEditProduct(null);
    setFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setEditProduct(product);
    setFormOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteTarget(product);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete product");
      }

      toast.success(t("toastDeleted"));
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("toastFailedDelete");
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaved = () => {
    fetchProducts();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground">
            {totalCount > 0
              ? t("subtitle", { count: totalCount })
              : t("subtitleZero")}
          </p>
        </div>

        <GatedButton
          canAct={canCreate}
          gateReason={t("addProductBtn")}
          onClick={openCreateForm}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("addProductBtn")}
        </GatedButton>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("filterByType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAllTypes")}</SelectItem>
              <SelectItem value="digital">{t("filterDigital")}</SelectItem>
              <SelectItem value="physical">{t("filterPhysical")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
              <SelectItem value="active">{t("filterActive")}</SelectItem>
              <SelectItem value="inactive">{t("filterInactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="sr-only">{t("loading")}</span>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-destructive">
            {error}
          </div>
        ) : (
          <ProductsTable
            products={products}
            onEdit={openEditForm}
            onDelete={handleDeleteClick}
            canEdit={canEdit}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            {t("showingPagination", {
              start: totalCount === 0 ? 0 : page * PAGE_SIZE + 1,
              end: Math.min((page + 1) * PAGE_SIZE, totalCount),
              total: totalCount,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border-border"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("pageCount", { page: page + 1, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="border-border"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Product Form Dialog */}
      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editProduct}
        onSaved={handleSaved}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">
              {t("deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("deleteConfirmDesc", { name: deleteTarget?.name || "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-popover border-border">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("deleteAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}