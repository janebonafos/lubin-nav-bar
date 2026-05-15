import { createFileRoute } from "@tanstack/react-router";
import Navbar from "@/components/Navbar";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-white pt-16">
      <Navbar />
      <main className="px-5 md:px-10 py-10 text-brand-purple-dark">
        <h1 className="text-2xl font-semibold">Lubin.AI</h1>
      </main>
    </div>
  );
}
