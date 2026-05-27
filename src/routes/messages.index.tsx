import { createFileRoute } from "@tanstack/react-router";
import { ContactsSidebar } from "@/components/ContactsSidebar";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/messages/")({
  component: MessagesIndex,
});

function MessagesIndex() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 text-center">
        <MessageSquare size={60} className="text-muted-foreground/30 mb-4" />
        <h1 className="text-xl font-bold">Connectez-vous pour voir vos messages</h1>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* Sidebar — full width on mobile, 280px on desktop */}
      <aside className="w-full md:w-[280px] md:border-r flex-shrink-0 h-full">
        <ContactsSidebar />
      </aside>
      {/* Empty chat placeholder — desktop only */}
      <section
        className="hidden md:flex flex-1 items-center justify-center text-center p-8"
        style={{ background: "#f0f2f5" }}
      >
        <div>
          <div className="w-20 h-20 rounded-full bg-card mx-auto mb-4 flex items-center justify-center shadow-sm">
            <MessageSquare size={36} className="text-muted-foreground/40" />
          </div>
          <p className="font-semibold">Sélectionnez une conversation</p>
          <p className="text-sm text-muted-foreground mt-1">
            Choisissez un contact dans la liste pour démarrer.
          </p>
        </div>
      </section>
    </div>
  );
}
