'use client';

interface MetricItem {
  label: string;
  value: string | number;
  sub: string | null | undefined;
  className: string;
  pulse: boolean;
}

interface Props {
  items: MetricItem[];
}

export function MetricasBar({ items }: Props) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-md border px-3 py-2 ${item.className} ${item.pulse ? 'animate-pulse' : ''}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{item.label}</p>
          <p className="mt-1 font-sora text-lg font-bold">{item.value}</p>
          {item.sub && (
            <p className="mt-0.5 text-[10px] opacity-70">{item.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
