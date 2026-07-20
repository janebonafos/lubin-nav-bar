import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/email-preview")({
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
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b border-[#EAE7F5] bg-[#F7F2FE] p-4 text-center">
        <p className="text-sm font-semibold text-[#7E6BAF]">
          Preview: Lubin booking confirmation email
        </p>
      </div>
      <iframe
        src="/api/public/email-preview"
        title="Email preview"
        className="w-full flex-1 border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
