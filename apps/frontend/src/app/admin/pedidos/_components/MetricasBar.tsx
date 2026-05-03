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
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          title={item.sub ?? undefined}
          className={`flex cursor-default items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${item.className} ${item.pulse ? 'animate-pulse' : ''}`}
        >
          <span className="opacity-70">{item.label}</span>
          <span className="font-sora font-bold">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
