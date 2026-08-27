'use client';

// ============================================================
// AdminUsersPage — Superadmin → Users
//
// Platform-level user management for superadmins.
// Lists all users across all accounts, allows creating new users
// with accounts and sharing credentials.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  UsersRound,
  Mail,
  Lock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { isAccountRole, type AccountRole } from '@/lib/auth/roles';

interface User {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  account_id: string | null;
  account_name: string | null;
  account_role: AccountRole | null;
  is_superadmin: boolean;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: AccountRole;
  label: string | null;
  created_at: string;
  expires_at: string;
  account_id: string;
}

interface NewUserForm {
  full_name: string;
  email: string;
  account_name: string;
  role: AccountRole;
}

const EDITABLE_ROLES: { value: AccountRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'agent', label: 'Agent' },
  { value: 'viewer', label: 'Viewer' },
];

const ROLE_COLORS: Record<AccountRole, string> = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  admin: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  agent: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  viewer: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminUsersPage() {
  const t = useTranslations('Admin.users');
  const { isSuperadmin, user } = useAuth();

  // Gate: only superadmins can access this page
  if (!isSuperadmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="size-12 text-amber-400" />
            <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">
              You must be a platform superadmin to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewUserForm>({
    full_name: '',
    email: '',
    account_name: '',
    role: 'agent',
  });
  const [submitting, setSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    temporary_password: string;
    invitation_url: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/users', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${(await (await import('@/lib/supabase/client')).createClient().auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Failed to load users');
        return;
      }

      const data = await res.json();
      setUsers(data.users ?? []);
      setInvitations(data.invitations ?? []);
    } catch (err) {
      console.error('[AdminUsersPage] load error:', err);
      toast.error('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Failed to create user');
        return;
      }

      const data = await res.json();
      setCreatedUser({
        email: data.credentials.email,
        temporary_password: data.credentials.temporary_password,
        invitation_url: data.invitation.url,
      });
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('[AdminUsersPage] create error:', err);
      toast.error('Could not reach the server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Failed to delete user');
        return;
      }

      toast.success('User deleted');
      loadData();
    } catch (err) {
      console.error('[AdminUsersPage] delete error:', err);
      toast.error('Could not reach the server');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copied to clipboard');
  };

  const getRoleBadge = (role: AccountRole | null) => {
    if (!role) return null;
    return (
      <Badge className={ROLE_COLORS[role]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
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
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage all users across all accounts
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UsersRound className="size-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No users yet</h3>
              <p className="mt-1 text-muted-foreground">
                Click "Add User" to create the first user
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            {u.avatar_url ? (
                              <AvatarImage src={u.avatar_url} alt={u.full_name} />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                              {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{u.full_name || 'Unnamed'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{u.email}</td>
                      <td className="px-4 py-3 text-sm">
                        {u.account_name || (
                          <span className="text-muted-foreground">No account</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(u.account_role)}</td>
                      <td className="px-4 py-3">
                        {u.is_superadmin ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                            <span className="flex items-center gap-1">
                              <span className="relative top-[1px]">
                                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              </span>
                              Superadmin
                            </span>
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Member</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {fmtDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!u.is_superadmin && u.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({invitations.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Expires
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">{inv.email}</td>
                      <td className="px-4 py-3 text-sm">
                        {users.find(u => u.account_id === inv.account_id)?.account_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(inv.role)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {fmtDate(inv.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {fmtDate(inv.expires_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-popover-foreground">
              <Plus className="size-4 text-primary" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              A new account will be created. Credentials and invitation link will be shown once.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                type="text"
                placeholder="Acme Corp"
                value={form.account_name}
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as AccountRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="bg-popover border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      {createdUser && (
        <Dialog open onOpenChange={() => setCreatedUser(null)}>
          <DialogContent className="bg-popover border-border sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <Check className="size-4 text-green-500" />
                User Created Successfully
              </DialogTitle>
              <DialogDescription>
                Share these credentials securely. The temporary password must be changed on first login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm flex-1">{createdUser.email}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdUser.email, 'email')}
                      >
                        {copiedField === 'email' ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm flex-1">
                        {showPassword ? createdUser.temporary_password : '••••••••'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdUser.temporary_password, 'password')}
                      >
                        {copiedField === 'password' ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Invitation Link</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate flex-1">{createdUser.invitation_url}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdUser.invitation_url, 'url')}
                      >
                        {copiedField === 'url' ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong> Save these credentials now. The password and invitation link will not be shown again.
              </p>
            </div>
            <DialogFooter className="bg-popover border-border">
              <Button onClick={() => setCreatedUser(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}