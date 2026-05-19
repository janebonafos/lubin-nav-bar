import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Lubin" },
      { name: "description", content: "Support resources and ways to connect with a professional." },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <div className="min-h-screen bg-brand-lavender/60 px-4 py-16">
      <div className="mx-auto max-w-[640px] text-center">
        <h1 className="text-3xl font-semibold text-brand-purple-dark">Resources</h1>
        <p className="mt-3 text-sm text-brand-purple-dark/60">
          We're putting together a thoughtful list of resources and ways to connect with
          professionals. Check back soon.
        </p>
        <Link
          to="/my-health-passport"
          className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark"
        >
          Back to passport
        </Link>
      </div>
    </div>
  );
}
