import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-ink-2">This entry doesn’t exist (or was deleted).</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink">
        Back to home
      </Link>
    </div>
  );
}
