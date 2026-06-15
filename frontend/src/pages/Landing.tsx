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
    ctaLabel: "Get Started Free",
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
    ctaLabel: "Start Pro",
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

export function Landing() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Production SaaS Demo
          </span>
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
            Subscription management
            <br />
            <span className="text-blue-600">that just works.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto">
            SubFlow handles billing, usage tracking, and plan management with
            Stripe — so you can focus on your product.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={() => navigate("/register")}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Start for free
            </button>
            <button
              onClick={() => navigate("/login")}
              className="bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 bg-white py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-3 divide-x divide-gray-200 text-center">
          {[
            { label: "Plans", value: "3" },
            { label: "Stack", value: "tRPC + Drizzle" },
            { label: "Billing", value: "Stripe" },
          ].map(({ label, value }) => (
            <div key={label} className="px-6">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-2 text-gray-500">
              No hidden fees. Cancel anytime.
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
      </section>

      {/* Tech Stack */}
      <section className="bg-white border-t border-gray-200 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-6">
            Built with production-grade technology
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "TypeScript",
              "tRPC",
              "Drizzle ORM",
              "PostgreSQL",
              "Stripe",
              "React 19",
              "Tailwind CSS",
              "Railway",
            ].map((tech) => (
              <span
                key={tech}
                className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-gray-50 border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        Built by{" "}
        <span className="font-semibold text-gray-600">
          Edward Kim — Full-Stack AI Developer
        </span>
      </footer>
    </div>
  );
}
