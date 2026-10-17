import React, { Fragment } from 'react';

const INLINE = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\)|https:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;
const LINK = /^\[([^\]\n]+)\]\(([^)\s]+)\)$/;

/** Only absolute https URLs become links; javascript:, data:, http: and relative URLs stay plain text. */
export function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

const linkClass =
  'font-semibold text-accent underline underline-offset-2 break-words hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm';

/**
 * Renders model text with **bold** spans and https links as React nodes.
 * Never uses innerHTML, so model output cannot inject markup or scripts.
 */
export const RichText: React.FC<{ text: string; newTabLabel?: string }> = ({ text, newTabLabel }) => (
  <>
    {text.split(INLINE).map((part, i) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      const md = LINK.exec(part);
      const label = md ? md[1] : part;
      const href = md ? safeHref(md[2]) : part.startsWith('https://') ? safeHref(part) : null;
      if (href) {
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {label}
            {newTabLabel && <span className="sr-only"> ({newTabLabel})</span>}
          </a>
        );
      }
      return <Fragment key={i}>{label}</Fragment>;
    })}
  </>
);
