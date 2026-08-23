'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { Product, ProductType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, FileText, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSaved: () => void;
}
﻿
export function ProductForm({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormProps) {
  const t = useTranslations('Products.form');
  const supabase = createClient();
  const { accountId } = useAuth();
  const isEdit = !!product;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProductType>('physical');
  const [priceCents, setPriceCents] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [digitalFileUrl, setDigitalFileUrl] = useState('');
  const [digitalFileName, setDigitalFileName] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [sku, setSku] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [requiresShipping, setRequiresShipping] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const isDigital = type === 'digital';
  const isPhysical = type === 'physical';

  useEffect(() => {
    if (open) {
      if (product) {
        setName(product.name);
        setDescription(product.description ?? '');
        setType(product.type);
        setPriceCents(product.price_cents);
        setCurrency(product.currency);
        setDigitalFileUrl(product.digital_file_url ?? '');
        setDigitalFileName(product.digital_file_name ?? '');
        setQrImageUrl((product.metadata as Record<string, unknown> | undefined)?.qr_image_url as string | undefined ?? '');
        setSku(product.sku ?? '');
        setWeightGrams(product.weight_grams?.toString() ?? '');
        setRequiresShipping(product.requires_shipping);
        setIsActive(product.is_active);
        setSortOrder(product.sort_order);
      } else {
        setName('');
        setDescription('');
        setType('physical');
        setPriceCents(0);
        setCurrency('USD');
        setDigitalFileUrl('');
        setDigitalFileName('');
        setQrImageUrl('');
        setSku('');
        setWeightGrams('');
        setRequiresShipping(true);
        setIsActive(true);
        setSortOrder(0);
      }
    }
  }, [open, product]);
async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t('nameRequired'));
      return;
    }

    if (priceCents < 0) {
      toast.error(t('priceRequired'));
      return;
    }

    if (isDigital && !digitalFileUrl.trim()) {
      toast.error(t('digitalFileRequired'));
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      if (!accountId) throw new Error('Your profile is not linked to an account.');

      const metadata = {
        ...(product?.metadata ?? {}),
      } as Record<string, unknown>;
      const normalizedQrImageUrl = qrImageUrl.trim();
      if (normalizedQrImageUrl) {
        metadata.qr_image_url = normalizedQrImageUrl;
      } else {
        delete metadata.qr_image_url;
      }

      const payload = {
        account_id: accountId,
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        type,
        price_cents: priceCents,
        currency: currency.trim().toUpperCase(),
        digital_file_url: isDigital ? digitalFileUrl.trim() : null,
        digital_file_name: isDigital ? digitalFileName.trim() : null,
        sku: isPhysical ? sku.trim() || null : null,
        weight_grams: isPhysical && weightGrams ? parseInt(weightGrams, 10) : null,
        requires_shipping: isPhysical ? requiresShipping : false,
        is_active: isActive,
        sort_order: sortOrder,
        metadata,
        qr_image_url: normalizedQrImageUrl || undefined,
      };

      let url = '/api/products';
      let method = 'POST';
      if (isEdit && product?.id) {
        url = `/api/products/${product.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to save product');
      }

      toast.success(isEdit ? t('toastSuccessEdit') : t('toastSuccessAdd'));
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      console.error('ProductForm submit error:', err);
      toast.error(err instanceof Error ? err.message : t('toastError'));
    } finally {
      setSaving(false);
    }
  }
return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">
            {isEdit ? t('editTitle') : t('newTitle')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit ? t('editDesc') : t('newDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">{t('nameLabel')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t('typeLabel')}</Label>
            <Select
              value={type}
              onValueChange={(value: ProductType | null) => {
                if (value !== null) setType(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('typePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="digital">
                  <FileText className="mr-2 h-4 w-4" /> {t('typeDigital')}
                </SelectItem>
                <SelectItem value="physical">
                  <Package className="mr-2 h-4 w-4" /> {t('typePhysical')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price_cents">{t('priceLabel')}</Label>
              <Input
                id="price_cents"
                type="number"
                min="0"
                step="1"
                value={priceCents}
                onChange={(e) => setPriceCents(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                required
              />
              <p className="text-xs text-muted-foreground">{t('priceCentsHint')}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">{t('currencyLabel')}</Label>
              <Select
                value={currency}
                onValueChange={(value: string | null) => {
                  if (value !== null) setCurrency(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="CNY">CNY (¥)</SelectItem>
                  <SelectItem value="AED">AED (د.إ)</SelectItem>
                  <SelectItem value="ZAR">ZAR (R)</SelectItem>
                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                  <SelectItem value="SGD">SGD (S$)</SelectItem>
                  <SelectItem value="MXN">MXN ($)</SelectItem>
                  <SelectItem value="COP">COP ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
{isDigital && (
            <div className="grid gap-2 border rounded-lg p-4 bg-muted/30">
              <h4 className="text-sm font-medium">{t('digitalFieldsTitle')}</h4>
              <div className="grid gap-2">
                <Label htmlFor="digital_file_url">{t('fileUrlLabel')}</Label>
                <Input
                  id="digital_file_url"
                  type="url"
                  value={digitalFileUrl}
                  onChange={(e) => setDigitalFileUrl(e.target.value)}
                  placeholder={t('fileUrlPlaceholder')}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="digital_file_name">{t('fileNameLabel')}</Label>
                <Input
                  id="digital_file_name"
                  value={digitalFileName}
                  onChange={(e) => setDigitalFileName(e.target.value)}
                  placeholder={t('fileNamePlaceholder')}
                />
              </div>
            </div>
          )}

          {isPhysical && (
            <div className="grid gap-2 border rounded-lg p-4 bg-muted/30">
              <h4 className="text-sm font-medium">{t('physicalFieldsTitle')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sku">{t('skuLabel')}</Label>
                  <Input
                    id="sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder={t('skuPlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="weight_grams">{t('weightLabel')}</Label>
                  <Input
                    id="weight_grams"
                    type="number"
                    min="0"
                    step="1"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    placeholder={t('weightPlaceholder')}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="requires_shipping"
                  checked={requiresShipping}
                  onCheckedChange={setRequiresShipping}
                />
                <Label htmlFor="requires_shipping" className="cursor-pointer text-sm">
                  {t('requiresShippingLabel')}
                </Label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is_active" className="cursor-pointer text-sm">
                {t('activeLabel')}
              </Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sort_order">{t('sortOrderLabel')}</Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                step="1"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter className="bg-popover/50 border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground hover:bg-muted"
              disabled={saving}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? t('saveBtn') : t('createBtn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
