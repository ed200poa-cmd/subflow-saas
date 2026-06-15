import { trpc } from "../lib/trpc";

export function Admin() {
  const { data: stats, isLoading: statsLoading } = trpc.admin.getStats.useQuery();
  const { data: userList, isLoading: usersLoading } = trpc.admin.getUsers.useQuery();
  const { data: revenue, isLoading: revenueLoading } = trpc.admin.getRevenue.useQuery();
  const { data: usageStats } = trpc.admin.getUsageStats.useQuery();

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading admin data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          Admin Portal
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Users",
              value: stats?.totalUsers ?? 0,
              color: "text-gray-900",
            },
            {
              label: "Active Subscribers",
              value: stats?.activeSubscribers ?? 0,
              color: "text-blue-600",
            },
            {
              label: "Churn Rate",
              value: `${stats?.churnRate ?? 0}%`,
              color: "text-red-600",
            },
            {
              label: "Total Revenue",
              value: `$${((stats?.totalRevenueCents ?? 0) / 100).toFixed(2)}`,
              color: "text-green-600",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
            >
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                Subscribers
              </h2>
            </div>
            {usersLoading ? (
              <div className="p-6 text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        Email
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        Plan
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(userList ?? []).map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 truncate max-w-[160px]">
                          {u.email}
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-600">
                          {u.plan ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.subscriptionStatus === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {u.subscriptionStatus ?? "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(userList ?? []).length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-gray-400 text-sm"
                        >
                          No users yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Revenue Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                Recent Payments
              </h2>
            </div>
            {revenueLoading ? (
              <div className="p-6 text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        User
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        Amount
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(revenue ?? []).map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 truncate max-w-[140px]">
                          {p.userEmail ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-medium">
                          ${(p.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.status === "succeeded"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(revenue ?? []).length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-gray-400 text-sm"
                        >
                          No payments yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          {usageStats && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                API Usage (Last 30 Days)
              </h2>
              <p className="text-3xl font-bold text-gray-900 mb-4">
                {usageStats.totalCallsThisMonth.toLocaleString()}{" "}
                <span className="text-sm font-normal text-gray-500">
                  total calls
                </span>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {usageStats.topEndpoints.map((e) => (
                  <div
                    key={e.endpoint}
                    className="bg-gray-50 rounded-lg p-3 text-center"
                  >
                    <p className="text-lg font-bold text-gray-900">
                      {e.calls}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {e.endpoint}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
