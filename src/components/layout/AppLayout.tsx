import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useFinanceStore } from "@/store/useFinanceStore";

export function AppLayout() {
  const initialize = useFinanceStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex h-full w-full overflow-hidden bg-background">
        <Sidebar />
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-8 py-8 animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
