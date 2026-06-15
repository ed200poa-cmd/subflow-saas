interface PricingCardProps {
  name: string;
  price: number;
  features: string[];
  apiLimit: string;
  highlighted?: boolean;
  onSelect: () => void;
  ctaLabel: string;
  disabled?: boolean;
}

export function PricingCard({
  name,
  price,
  features,
  apiLimit,
  highlighted = false,
  onSelect,
  ctaLabel,
  disabled = false,
}: PricingCardProps) {
  return (
    <div
      className={`rounded-2xl p-8 flex flex-col gap-6 border ${
        highlighted
          ? "bg-blue-600 text-white border-blue-600 shadow-xl scale-105"
          : "bg-white text-gray-900 border-gray-200 shadow-sm"
      }`}
    >
      <div>
        <h3
          className={`text-sm font-semibold uppercase tracking-wide ${
            highlighted ? "text-blue-100" : "text-gray-500"
          }`}
        >
          {name}
        </h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-bold">${price}</span>
          <span
            className={`text-sm ${highlighted ? "text-blue-200" : "text-gray-500"}`}
          >
            /month
          </span>
        </div>
        <p
          className={`mt-1 text-sm ${highlighted ? "text-blue-200" : "text-gray-500"}`}
        >
          {apiLimit} API calls/month
        </p>
      </div>

      <ul className="flex flex-col gap-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <svg
              className={`w-4 h-4 flex-shrink-0 ${highlighted ? "text-blue-200" : "text-blue-500"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={disabled}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          highlighted
            ? "bg-white text-blue-600 hover:bg-blue-50"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
