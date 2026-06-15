import { useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { UsageBar } from "../components/UsageBar";
import { getUser } from "../lib/auth";

const PLAN_LABELS = {
  free: { label: "Free", color: "bg-gray-100 text-gray-700" },
  pro: { label: "Pro", color: "bg-blue-100 text-blue-700" },
  enterprise: { label: "Enterprise", color: "bg-purple-100 text-purple-700" },
};

export function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getUser();
  const successParam = searchParams.get("success");

  const { data: sub, isLoading: subLoading } = trpc.subscription.status.useQuery();
  const { data: usage, isLoading: usageLoading } = trpc.usage.getUsage.useQuery();
  const { data: limits } = trpc.usage.getLimits.useQuery();

  const createPortal = trpc.subscription.portalUrl.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const cancelSub = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  if (subLoading || usageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const plan = (sub?.plan ?? "free") as keyof typeof PLAN_LABELS;
  const planInfo = PLAN_LABELS[plan];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {successParam && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-6 text-sm">
            Payment successful! Your plan has been updated.
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Current Plan
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${planInfo.color}`}
              >
                {planInfo.label}
              </span>
              <span className="text-sm text-gray-500">
                Status:{" "}
                <span className="font-medium text-gray-700">
                  {sub?.status ?? "—"}
                </span>
              </span>
            </div>

            {sub?.currentPeriodEnd && (
              <p className="text-xs text-gray-400 mb-4">
                Renews:{" "}
                {new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}

            <div className="flex flex-col gap-2 mt-auto">
              {plan === "free" && (
                <button
                  onClick={() => navigate("/pricing")}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Upgrade to Pro
                </button>
              )}
              {plan !== "free" && (
                <>
                  <button
                    onClick={() => createPortal.mutate()}
                    disabled={createPortal.isPending}
                    className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Manage Billing
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Cancel your subscription?")) {
                        cancelSub.mutate();
                      }
                    }}
                    disabled={cancelSub.isPending}
                    className="w-full text-red-600 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Cancel Subscription
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Usage Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              API Usage
            </h2>
            <UsageBar
              used={usage?.used ?? 0}
              limit={limits?.limit ?? 100}
              plan={plan}
            />

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Usage resets at the start of each billing period
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Account Info
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {usage?.used ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  API calls this month
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {planInfo.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Current plan</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {limits?.limit === null
                    ? "∞"
                    : ((limits?.limit ?? 100) - (usage?.used ?? 0)).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Calls remaining</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
