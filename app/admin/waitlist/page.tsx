import { getWaitlistEntries } from '@/app/actions/waitlist';
import { Bell, Users, Calendar } from 'lucide-react';

export default async function WaitlistPage() {
  const result = await getWaitlistEntries();

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600">{result.error}</p>
        </div>
      </div>
    );
  }

  const waitlistEntries = result.data || [];
  const daepCount = waitlistEntries.filter(e => e.module_name === 'DAEP').length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Module Waitlist</h1>
        </div>
        <p className="text-slate-600">
          View and manage users interested in upcoming modules
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-700">Total Signups</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{waitlistEntries.length}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-700">DAEP Dashboard</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{daepCount}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-slate-700">Latest Signup</h3>
          </div>
          <p className="text-sm font-medium text-slate-900">
            {waitlistEntries.length > 0
              ? new Date(waitlistEntries[0].created_at).toLocaleDateString()
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Waitlist Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Waitlist Entries</h2>
        </div>

        {waitlistEntries.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No waitlist entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {waitlistEntries.map((entry: any) => {
                  const userProfile = entry.user_profiles;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {userProfile?.first_name} {userProfile?.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">{userProfile?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {entry.module_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">
                          {userProfile?.display_organization || entry.tenant_id || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">
                          {new Date(entry.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
