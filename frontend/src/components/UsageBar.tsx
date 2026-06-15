interface UsageBarProps {
  used: number;
  limit: number | null;
  plan: string;
}

export function UsageBar({ used, limit, plan }: UsageBarProps) {
  if (limit === null) {
    return (
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>API Usage</span>
          <span className="font-medium text-green-600">Unlimited ({plan})</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full w-full" />
        </div>
        <p className="text-xs text-gray-500 mt-1">{used.toLocaleString()} calls made</p>
      </div>
    );
  }

  const pct = Math.min((used / limit) * 100, 100);
  const color =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-blue-500";

  return (
    <div>
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>API Usage</span>
        <span className="font-medium">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {Math.round(pct)}% used · {(limit - used).toLocaleString()} remaining
      </p>
    </div>
  );
}
