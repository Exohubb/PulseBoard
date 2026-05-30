import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { useWorkspaceStore } from '../lib/workspace-store';
import { useThemeStore } from '../lib/theme-store';
import {
  User,
  Building,
  Palette,
  Bell,
  Shield,
  Trash2,
  UserPlus,
  Sun,
  Moon,
  Monitor as MonitorIcon,
  Check,
  AlertCircle,
  Lock,
  Key,
  Copy,
  Eye,
  EyeOff,
  Code,
} from 'lucide-react';

type Toast = { kind: 'success' | 'error'; text: string } | null;

const NOTIF_KEY = 'pulseboard-notifications';
const defaultNotifs = { email: true, weekly: true, slack: false, browser: false };

function loadNotifs() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? { ...defaultNotifs, ...JSON.parse(raw) } : defaultNotifs;
  } catch {
    return defaultNotifs;
  }
}

export function SettingsPage() {
  const { user, accessToken } = useAuthStore();
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const { theme, setTheme } = useThemeStore();
  const qc = useQueryClient();
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!currentWorkspace) fetchWorkspaces();
  }, [currentWorkspace, fetchWorkspaces]);

  // ===== Profile =====
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
    enabled: !!accessToken,
  });

  const [profile, setProfile] = useState({ name: '', email: '' });
  useEffect(() => {
    if (meQuery.data) setProfile({ name: meQuery.data.name ?? '', email: meQuery.data.email ?? '' });
  }, [meQuery.data]);

  const saveProfile = useMutation({
    mutationFn: async () => (await api.put('/users/me', { name: profile.name })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      useAuthStore.setState((s) => ({ user: s.user ? { ...s.user, name: profile.name } : s.user }));
      setToast({ kind: 'success', text: 'Profile updated' });
    },
    onError: (e: any) => setToast({ kind: 'error', text: e?.response?.data?.message || 'Failed to update profile' }),
  });

  // ===== Workspace =====
  const wsQuery = useQuery({
    queryKey: ['workspace-detail', currentWorkspace?.id],
    queryFn: async () => (await api.get(`/workspaces/${currentWorkspace!.id}`)).data,
    enabled: !!currentWorkspace?.id,
  });

  const [ws, setWs] = useState({ name: '', slug: '', description: '', accentColor: '#6366f1', logoUrl: '' });
  useEffect(() => {
    if (wsQuery.data) {
      setWs({
        name: wsQuery.data.name ?? '',
        slug: wsQuery.data.slug ?? '',
        description: wsQuery.data.description ?? '',
        accentColor: wsQuery.data.accentColor ?? '#6366f1',
        logoUrl: wsQuery.data.logoUrl ?? '',
      });
    }
  }, [wsQuery.data]);

  const saveWorkspace = useMutation({
    mutationFn: async (patch: Partial<typeof ws>) =>
      (await api.put(`/workspaces/${currentWorkspace!.id}`, patch)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workspace-detail'] });
      if (data?.name && currentWorkspace) {
        useWorkspaceStore.setState((s) => ({
          currentWorkspace: s.currentWorkspace ? { ...s.currentWorkspace, name: data.name } : s.currentWorkspace,
          workspaces: s.workspaces.map((w) => (w.id === data.id ? { ...w, name: data.name } : w)),
        }));
      }
      setToast({ kind: 'success', text: 'Workspace saved' });
    },
    onError: (e: any) => setToast({ kind: 'error', text: e?.response?.data?.message || 'Save failed' }),
  });

  // ===== Members =====
  const membersQuery = useQuery({
    queryKey: ['members', currentWorkspace?.id],
    queryFn: async () => (await api.get(`/workspaces/${currentWorkspace!.id}/members`)).data,
    enabled: !!currentWorkspace?.id,
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: '', role: 'member' });

  const addMember = useMutation({
    mutationFn: async () =>
      (await api.post(`/workspaces/${currentWorkspace!.id}/members`, { email: invite.email, role: invite.role })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      setInviteOpen(false);
      setInvite({ email: '', role: 'member' });
      setToast({ kind: 'success', text: 'Member added' });
    },
    onError: (e: any) => setToast({ kind: 'error', text: e?.response?.data?.message || 'Could not add member' }),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) =>
      (await api.delete(`/workspaces/${currentWorkspace!.id}/members/${userId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      setToast({ kind: 'success', text: 'Member removed' });
    },
    onError: (e: any) => setToast({ kind: 'error', text: e?.response?.data?.message || 'Could not remove' }),
  });

  // ===== Notifications (local) =====
  const [notifs, setNotifs] = useState(loadNotifs());
  const saveNotifs = (next: typeof notifs) => {
    setNotifs(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    setToast({ kind: 'success', text: 'Preferences saved' });
  };

  const isOwner = (membersQuery.data ?? []).find((m: any) => m.userId === user?.id)?.role === 'owner';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your account and workspace</p>
      </div>

      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm ${
            toast.kind === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.kind === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.text}
        </div>
      )}

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meQuery.isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <Input
                label="Name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
              <Input label="Email" value={profile.email} disabled hint="Email cannot be changed" />
              <div className="pt-2">
                <Button
                  onClick={() => saveProfile.mutate()}
                  isLoading={saveProfile.isPending}
                  disabled={!profile.name || profile.name === meQuery.data?.name}
                >
                  Save Profile
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme</p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {([
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: MonitorIcon },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border transition-all ${
                  theme === id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workspace */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {wsQuery.isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <Input
                label="Workspace Name"
                value={ws.name}
                onChange={(e) => setWs({ ...ws, name: e.target.value })}
              />
              <Input label="Slug" value={ws.slug} disabled hint="URL identifier (cannot be changed)" />
              <Textarea
                label="Description"
                value={ws.description}
                onChange={(e) => setWs({ ...ws, description: e.target.value })}
              />
              <div>
                <label className="text-sm font-medium block mb-2">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={ws.accentColor}
                    onChange={(e) => setWs({ ...ws, accentColor: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer border dark:border-gray-700"
                  />
                  <span className="text-sm font-mono text-gray-500">{ws.accentColor}</span>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() =>
                    saveWorkspace.mutate({
                      name: ws.name,
                      description: ws.description,
                      accentColor: ws.accentColor,
                      logoUrl: ws.logoUrl,
                    })
                  }
                  isLoading={saveWorkspace.isPending}
                >
                  Save Workspace
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membersQuery.isLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-2">
              {(membersQuery.data ?? []).map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-200">
                        {(m.user?.name ?? '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{m.user?.name}</p>
                      <p className="text-sm text-gray-500">{m.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.role === 'owner' ? 'info' : 'default'}>{m.role}</Badge>
                    {isOwner && m.role !== 'owner' && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${m.user?.email}?`)) removeMember.mutate(m.userId);
                        }}
                        className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {isOwner && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" /> Invite Member
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { key: 'email', label: 'Email notifications', hint: 'Receive incident alerts via email' },
            { key: 'weekly', label: 'Weekly summary', hint: 'Get weekly uptime reports' },
            { key: 'slack', label: 'Slack notifications', hint: 'Send alerts to your Slack workspace' },
            { key: 'browser', label: 'Browser notifications', hint: 'Real-time desktop alerts' },
          ].map(({ key, label, hint }) => (
            <label
              key={key}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-gray-500">{hint}</p>
              </div>
              <button
                type="button"
                onClick={() => saveNotifs({ ...notifs, [key]: !(notifs as any)[key] })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  (notifs as any)[key] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-pressed={(notifs as any)[key]}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    (notifs as any)[key] ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div>
              <p className="font-medium">Active session</p>
              <p className="text-sm text-gray-500">Signed in as {user?.email}</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm('Sign out of this session?')) useAuthStore.getState().logout();
              }}
            >
              Sign Out
            </Button>
          </div>

          <ChangePasswordSection setToast={setToast} />
        </CardContent>
      </Card>

      <ApiKeysSection setToast={setToast} />

      <DangerZone email={user?.email ?? ''} setToast={setToast} />

      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)}>
        <ModalHeader onClose={() => setInviteOpen(false)}>Invite member</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              placeholder="user@example.com"
              hint="The user must already have a PulseBoard account"
            />
            <div>
              <label className="text-sm font-medium block mb-1">Role</label>
              <select
                value={invite.role}
                onChange={(e) => setInvite({ ...invite, role: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setInviteOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => addMember.mutate()} isLoading={addMember.isPending} disabled={!invite.email}>
            Add Member
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

/* ===== Change password ===== */
function ChangePasswordSection({ setToast }: { setToast: (t: Toast) => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [show, setShow] = useState(false);

  const change = useMutation({
    mutationFn: async () =>
      (await api.put('/auth/password', { currentPassword: current, newPassword: next })).data,
    onSuccess: () => {
      setToast({ kind: 'success', text: 'Password changed. You may need to sign in again on other devices.' });
      setCurrent('');
      setNext('');
      setConfirmPw('');
    },
    onError: (e: any) =>
      setToast({ kind: 'error', text: e?.response?.data?.message || 'Could not change password' }),
  });

  const canSubmit = current && next.length >= 8 && next === confirmPw;

  return (
    <div className="border-t dark:border-gray-800 pt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-gray-500" />
        <p className="font-medium">Change password</p>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Input
          label="Current password"
          type={show ? 'text' : 'password'}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
        <Input
          label="New password"
          type={show ? 'text' : 'password'}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          hint="At least 8 characters"
        />
        <Input
          label="Confirm new password"
          type={show ? 'text' : 'password'}
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          autoComplete="new-password"
          error={confirmPw && next !== confirmPw ? 'Passwords do not match' : undefined}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => change.mutate()} isLoading={change.isPending} disabled={!canSubmit}>
          Change password
        </Button>
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-1"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

/* ===== API keys ===== */
function ApiKeysSection({ setToast }: { setToast: (t: Toast) => void }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [scopes, setScopes] = useState<'read' | 'write'>('read');
  const [revealed, setRevealed] = useState<{ token: string; name: string } | null>(null);

  const keysQ = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => (await api.get('/api-keys')).data as any[],
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/api-keys', { name: keyName, scopes })).data,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setRevealed({ token: data.token, name: data.name });
      setCreateOpen(false);
      setKeyName('');
      setScopes('read');
    },
    onError: (e: any) =>
      setToast({ kind: 'error', text: e?.response?.data?.message || 'Could not create key' }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api-keys/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setToast({ kind: 'success', text: 'Key revoked' });
    },
    onError: (e: any) => setToast({ kind: 'error', text: e?.response?.data?.message || 'Failed to revoke' }),
  });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ kind: 'success', text: 'Copied to clipboard' });
    } catch {
      setToast({ kind: 'error', text: 'Clipboard unavailable' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API keys
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
              <Code className="h-4 w-4" /> How to use
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              + Create key
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {keysQ.isLoading ? (
          <LoadingSpinner />
        ) : !keysQ.data || keysQ.data.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
            <Key className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No API keys yet</p>
            <p className="text-xs text-gray-400 mt-1">Create one to access PulseBoard from your scripts or CI</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keysQ.data.map((k: any) => (
              <div
                key={k.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{k.name}</p>
                    <Badge variant={k.scopes === 'write' ? 'warning' : 'info'}>{k.scopes}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    {k.prefix}…{' · '}
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Revoke key "${k.name}"? This cannot be undone.`)) revoke.mutate(k.id);
                  }}
                  className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create key modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)}>
        <ModalHeader onClose={() => setCreateOpen(false)}>Create API key</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Name"
              placeholder="CI deploy script"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              hint="A label so you can recognize the key later"
              required
            />
            <div>
              <label className="text-sm font-medium block mb-1">Scope</label>
              <div className="grid grid-cols-2 gap-2">
                {(['read', 'write'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScopes(s)}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      scopes === s
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <p className="font-medium capitalize">{s}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {s === 'read'
                        ? 'List monitors, incidents, checks. Cannot modify anything.'
                        : 'Full read + create/update/delete monitors and incidents.'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 text-sm text-amber-800 dark:text-amber-300">
              The token is shown <strong>once</strong>. Store it somewhere safe — you won't see it again.
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} isLoading={create.isPending} disabled={!keyName}>
            Create key
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reveal token modal */}
      <Modal isOpen={!!revealed} onClose={() => setRevealed(null)}>
        <ModalHeader onClose={() => setRevealed(null)}>Your new API key</ModalHeader>
        <ModalBody>
          {revealed && (
            <div className="space-y-4">
              <p className="text-sm">
                <strong>Copy this token now.</strong> It won't be shown again.
              </p>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm break-all">
                {revealed.token}
              </div>
              <Button onClick={() => copy(revealed.token)} variant="outline" size="sm">
                <Copy className="h-4 w-4" /> Copy token
              </Button>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setRevealed(null)}>I've saved it</Button>
        </ModalFooter>
      </Modal>

      {/* Usage docs */}
      <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} size="lg">
        <ModalHeader onClose={() => setHelpOpen(false)}>Using your API key</ModalHeader>
        <ModalBody>
          <div className="space-y-5 text-sm">
            <div>
              <p className="font-medium mb-1">Authentication</p>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Send your token in the <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">Authorization</code> header on every request.
              </p>
              <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-x-auto">
{`Authorization: Bearer pb_<your-key>`}
              </pre>
            </div>

            <div>
              <p className="font-medium mb-1">Example: list monitors</p>
              <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-x-auto">
{`curl -H "Authorization: Bearer pb_…" \\
  http://localhost:4000/api/workspaces/<workspace-slug>/monitors`}
              </pre>
            </div>

            <div>
              <p className="font-medium mb-1">Example: create an incident</p>
              <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-x-auto">
{`curl -X POST \\
  -H "Authorization: Bearer pb_…" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"DB latency","severity":"high"}' \\
  http://localhost:4000/api/workspaces/<workspace-slug>/incidents`}
              </pre>
            </div>

            <div>
              <p className="font-medium mb-1">Scopes</p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                <li><code>read</code> — GET endpoints only.</li>
                <li><code>write</code> — full create/update/delete on monitors and incidents.</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300">
              <strong>Treat keys like passwords.</strong> Never commit them to git. Use environment variables or a secrets manager.
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setHelpOpen(false)}>Got it</Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
}

/* ===== Danger zone ===== */
function DangerZone({ email, setToast }: { email: string; setToast: (t: Toast) => void }) {
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');

  const del = useMutation({
    mutationFn: async () => (await api.delete('/users/me', { data: { password } })).data,
    onSuccess: () => {
      setToast({ kind: 'success', text: 'Account deleted' });
      // Clear local state and redirect
      localStorage.clear();
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    },
    onError: (e: any) =>
      setToast({ kind: 'error', text: e?.response?.data?.message || 'Could not delete account' }),
  });

  const canSubmit = confirmEmail === email && password.length > 0;

  return (
    <Card className="border-red-200 dark:border-red-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
          <AlertCircle className="h-5 w-5" />
          Danger zone
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Delete account</p>
            <p className="text-sm text-gray-500 mt-1">
              Permanently remove your account and any workspaces you solely own. Workspaces with other members are preserved.
            </p>
          </div>
          <Button variant="danger" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        </div>
      </CardContent>

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <ModalHeader onClose={() => setOpen(false)}>Delete account</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
              <p className="font-medium mb-1">This is permanent.</p>
              <p>
                We'll delete your profile, your sessions, your API keys, and any workspace where you're the only owner.
                Workspaces with other members keep going — you'll just be removed.
              </p>
            </div>
            <Input
              label={`Type your email to confirm (${email})`}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={email}
            />
            <Input
              label="Your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => del.mutate()}
            isLoading={del.isPending}
            disabled={!canSubmit}
          >
            Delete forever
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
}
