"use client";

import type { Product } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  canEdit: boolean;
}

export function ProductsTable({
  products,
  onEdit,
  onDelete,
  canEdit,
}: ProductsTableProps) {
  const t = useTranslations("Products.table");
  const tPage = useTranslations("Products.page");

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-muted-foreground mb-4">{tPage("noProductsYet")}</div>
        <p className="text-sm text-muted-foreground">{tPage("addFirstProduct")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-muted-foreground">{t("name")}</TableHead>
            <TableHead className="hidden text-muted-foreground sm:table-cell">
              {t("type")}
            </TableHead>
            <TableHead className="hidden text-right text-muted-foreground md:table-cell">
              {t("price")}
            </TableHead>
            <TableHead className="hidden text-muted-foreground lg:table-cell">
              {t("active")}
            </TableHead>
            <TableHead className="hidden text-muted-foreground xl:table-cell">
              {t("sort")}
            </TableHead>
            <TableHead className="text-right text-muted-foreground w-[80px]">
              {t("actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.id}
              className="border-border hover:bg-muted/50 transition-colors"
            >
              <TableCell className="font-medium text-foreground">
                {product.name}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge
                  variant={
                    product.type === "digital"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-xs"
                >
                  {product.type === "digital"
                    ? tPage("filterDigital")
                    : tPage("filterPhysical")}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-right md:table-cell tabular-nums text-muted-foreground">
                {formatCurrency(product.price_cents / 100, product.currency)}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge
                  variant={product.is_active ? "default" : "secondary"}
                  className="text-xs"
                >
                  {product.is_active ? tPage("filterActive") : tPage("filterInactive")}
                </Badge>
              </TableCell>
              <TableCell className="hidden xl:table-cell tabular-nums text-muted-foreground">
                {product.sort_order}
              </TableCell>
              <TableCell className="text-right">
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={tPage("editAction")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem
                        onClick={() => onEdit(product)}
                        className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                        {tPage("editAction")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={() => onDelete(product)}
                        className="flex items-center gap-2 text-destructive focus:bg-accent focus:text-accent-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                        {tPage("deleteAction")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}