import { useNavigate } from "react-router-dom";
import { PricingCard } from "../components/PricingCard";
import { isAuthenticated } from "../lib/auth";
import { trpc } from "../lib/trpc";

const TIERS = [
  {
    name: "Free",
    price: 0,
    apiLimit: "100",
    plan: "free" as const,
    features: [
      "100 API calls/month",
      "Basic dashboard",
      "Email support",
      "Community access",
    ],
    highlighted: false,
    ctaLabel: "Current Free Plan",
  },
  {
    name: "Pro",
    price: 29,
    apiLimit: "10,000",
    plan: "pro" as const,
    features: [
      "10,000 API calls/month",
      "Advanced analytics",
      "Priority support",
      "Webhook integrations",
      "API key management",
    ],
    highlighted: true,
    ctaLabel: "Upgrade to Pro",
  },
  {
    name: "Enterprise",
    price: 99,
    apiLimit: "Unlimited",
    plan: "enterprise" as const,
    features: [
      "Unlimited API calls",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "Team seats",
      "Audit logs",
    ],
    highlighted: false,
    ctaLabel: "Go Enterprise",
  },
];

export function Pricing() {
  const navigate = useNavigate();
  const authed = isAuthenticated();

  const createSub = trpc.subscription.create.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
  });

  function handlePlanSelect(plan: "free" | "pro" | "enterprise") {
    if (!authed) {
      navigate("/register");
      return;
    }
    if (plan === "free") {
      navigate("/dashboard");
      return;
    }
    createSub.mutate({ plan });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">
            Choose your plan
          </h1>
          <p className="mt-3 text-gray-500 text-lg">
            Start free. Upgrade as you grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {TIERS.map((tier) => (
            <PricingCard
              key={tier.name}
              name={tier.name}
              price={tier.price}
              features={tier.features}
              apiLimit={tier.apiLimit}
              highlighted={tier.highlighted}
              ctaLabel={tier.ctaLabel}
              disabled={createSub.isPending}
              onSelect={() => handlePlanSelect(tier.plan)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
