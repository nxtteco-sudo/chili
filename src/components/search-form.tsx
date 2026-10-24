import { Search } from "lucide-react";

// Plain GET form so search works without JavaScript and the URL is shareable.
export function SearchForm({
  action,
  q,
  placeholder,
  keep = {},
}: {
  action: string;
  q?: string;
  placeholder: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} className="relative">
      {Object.entries(keep).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-base outline-none placeholder:text-muted focus:border-accent"
      />
    </form>
  );
}
