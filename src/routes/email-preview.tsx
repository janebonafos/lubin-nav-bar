import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { TEMPLATES } from "@/lib/email-templates/registry";

const searchSchema = z.object({
  template: z.string().default("booking-confirmation"),
});

export const Route = createFileRoute("/email-preview")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Email Preview | Lubin" },
      { name: "description", content: "Preview Lubin email templates." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EmailPreviewPage,
});

function EmailPreviewPage() {
  const { template } = Route.useSearch();
  const templateNames = Object.keys(TEMPLATES);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b border-[#EAE7F5] bg-[#F7F2FE] p-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm font-semibold text-[#7E6BAF]">
            Preview: Lubin booking email
          </p>
          <select
            value={template}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              params.set("template", e.target.value);
              window.location.search = params.toString();
            }}
            className="rounded-lg border border-[#EAE7F5] bg-white px-3 py-1.5 text-sm text-[#2A2550] focus:outline-none focus:ring-2 focus:ring-[#7E6BAF]"
          >
            {templateNames.map((name) => (
              <option key={name} value={name}>
                {TEMPLATES[name]?.displayName ?? name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <iframe
        src={`/api/public/email-preview?template=${encodeURIComponent(template)}`}
        title="Email preview"
        className="w-full flex-1 border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
