import React from 'react';

const AMOUNTS = [100, 200, 500, 1000];

const chipClass = (selected: boolean) =>
  `min-h-[40px] px-3.5 rounded-full text-sm font-semibold border-[1.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
    selected ? 'bg-ink border-ink text-inverse' : 'bg-surface-1 border-hairline text-ink hover:border-ink'
  }`;

/** One-tap amounts under the amount field. Tapping fills the field; it stays editable. */
export const AmountChips: React.FC<{ value: string; onPick: (v: string) => void; label: string }> = ({
  value,
  onPick,
  label,
}) => (
  <div role="group" aria-label={label} className="flex flex-wrap gap-2 -mt-1">
    {AMOUNTS.map((n) => (
      <button key={n} type="button" aria-pressed={value === String(n)} onClick={() => onPick(String(n))} className={chipClass(value === String(n))}>
        ₹{n.toLocaleString('en-IN')}
      </button>
    ))}
  </div>
);

/** Platform names for this kind of work, so the source is one tap away. */
export const SourceChips: React.FC<{ options: string[]; value: string; onPick: (v: string) => void; label: string }> = ({
  options,
  value,
  onPick,
  label,
}) =>
  options.length ? (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2 -mt-1">
      {options.map((o) => {
        const selected = value.trim().toLowerCase() === o.toLowerCase();
        return (
          <button key={o} type="button" aria-pressed={selected} onClick={() => onPick(selected ? '' : o)} className={chipClass(selected)}>
            {o}
          </button>
        );
      })}
    </div>
  ) : null;
