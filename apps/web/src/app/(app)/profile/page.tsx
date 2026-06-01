'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type User = { id: string; name: string; email: string; role: string; branchId?: string; branch?: string };

export default function ProfilePage() {
  const [user, setUser]       = useState<User | null>(null);
  const [name, setName]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const [oldPwd, setOldPwd]   = useState('');
  const [newPwd, setNewPwd]   = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<any>('/auth/me').then(u => {
      setUser(u);
      setName(u.name);
    });
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      const updated = await api<User>('/auth/profile', { method: 'PATCH', body: JSON.stringify({ name }) });
      setUser(u => u ? { ...u, name: updated.name } : u);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const changePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confPwd) { setPwdMsg({ ok: false, text: 'New passwords do not match' }); return; }
    if (newPwd.length < 6)  { setPwdMsg({ ok: false, text: 'Password must be at least 6 characters' }); return; }
    setPwdSaving(true); setPwdMsg(null);
    try {
      const res = await api<{ message: string }>('/auth/change-password', {
        method: 'POST', body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
      });
      setPwdMsg({ ok: true, text: res.message });
      setOldPwd(''); setNewPwd(''); setConfPwd('');
    } catch (err: any) {
      setPwdMsg({ ok: false, text: err?.message ?? 'Failed to change password' });
    }
    setPwdSaving(false);
  };

  if (!user) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy" />
    </div>
  );

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin', CRM_MANAGER: 'CRM Manager', CALL_CENTER: 'Call Center',
    SALES_HEAD: 'Sales Head', BRANCH_MANAGER: 'Branch Manager',
    SALES_EXECUTIVE: 'Sales Executive', TEAM_LEADER: 'Team Leader',
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-navy">My Profile</h1>

      {/* Account info */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center text-white text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-navy/10 text-navy text-xs font-medium">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <h2 className="text-base font-semibold text-gray-700">Edit Profile</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              required value={name} onChange={e => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input disabled value={user.email}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input disabled value={ROLE_LABELS[user.role] ?? user.role}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || name === user.name}
              className="px-5 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-light disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved ✓</span>}
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <form onSubmit={changePwd} className="space-y-4">
          <h2 className="text-base font-semibold text-gray-700">Change Password</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input required type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input required type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input required type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy focus:outline-none" />
          </div>
          {pwdMsg && (
            <p className={`text-sm font-medium ${pwdMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{pwdMsg.text}</p>
          )}
          <button type="submit" disabled={pwdSaving}
            className="px-5 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-light disabled:opacity-50 transition-colors">
            {pwdSaving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
