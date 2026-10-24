import type { SVGProps } from "react";

// Lucide has no chili, so this one is drawn to match its 24px stroke style.
export function ChiliIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M16 6c0-2 1-3.5 3-4" />
      <path d="M13.5 7.5c1.2-1.4 3.4-1.8 5-0.8" />
      <path d="M18.5 6.7c1.6 1.2 1.7 4 0 7.3-2.2 4.2-7 8-13 9.3-1.1.2-1.5-.7-.7-1.4 3.8-3.1 6.4-6.8 7.7-11 .5-1.7 1.5-3.4 2.9-4.3" />
    </svg>
  );
}
