import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, RefreshCw, WalletCards } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { DesktopTitleBar } from "./DesktopTitleBar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Onboarding } from "@/components/shared/Onboarding";
import { TransactionModal } from "@/components/shared/TransactionModal";
import { useDesktopShortcuts } from "@/hooks/useDesktopShortcuts";
import { appRoutes } from "@/lib/navigation";
import { getLocalProfile, type LocalProfile } from "@/lib/profile";
import { useFinanceStore } from "@/store/useFinanceStore";

export function AppLayout() {
  const initialize = useFinanceStore((s) => s.initialize);
  const isInitializing = useFinanceStore((s) => s.isInitializing);
  const initializeError = useFinanceStore((s) => s.initializeError);
  const isLoaded = useFinanceStore((s) => s.isLoaded);
  const accounts = useFinanceStore((s) => s.accounts);
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [profile, setProfile] = useState<LocalProfile | null>(() =>
    getLocalProfile(),
  );
  const openCommandPalette = () => setCommandPaletteOpen(true);
  const openNewTransaction = () => {
    setCommandPaletteOpen(false);
    setTransactionModalOpen(true);
  };
  const openSettings = () => navigate("/configuracoes");

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useDesktopShortcuts({
    enabled:
      isLoaded &&
      accounts.length > 0 &&
      !commandPaletteOpen &&
      !transactionModalOpen,
    onOpenPalette: openCommandPalette,
    onOpenNewTransaction: openNewTransaction,
    onOpenSettings: openSettings,
    onNavigateToIndex: (index) => {
      const route = appRoutes[index];
      if (route) navigate(route.path);
    },
  });

  if (!isLoaded) {
    return (
      <TooltipProvider delayDuration={120}>
        <div className="flex h-full flex-col bg-background">
          <DesktopTitleBar />
          <StartupState
            error={initializeError}
            isRetrying={isInitializing}
            onRetry={() => void initialize()}
          />
        </div>
      </TooltipProvider>
    );
  }

  if (accounts.length === 0) {
    return (
      <TooltipProvider delayDuration={120}>
        <div className="flex h-full flex-col bg-background">
          <DesktopTitleBar />
          <Onboarding onComplete={setProfile} />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex h-full flex-col bg-background">
        <DesktopTitleBar />
        <div className="flex min-h-0 w-full flex-1 overflow-hidden bg-background">
          <Sidebar profile={profile} />
          <div className="flex h-full min-w-0 flex-1 flex-col">
            <Header
              onOpenCommandPalette={openCommandPalette}
              onNewTransaction={openNewTransaction}
            />
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1400px] animate-fade-in px-8 py-8">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNewTransaction={openNewTransaction}
      />
      <TransactionModal
        open={transactionModalOpen}
        onOpenChange={setTransactionModalOpen}
      />
    </TooltipProvider>
  );
}

interface StartupStateProps {
  error: string | null;
  isRetrying: boolean;
  onRetry: () => void;
}

function StartupState({ error, isRetrying, onRetry }: StartupStateProps) {
  return (
    <div className="grid h-full w-full place-items-center bg-background px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-5 grid h-12 w-12 place-items-center border border-border bg-accent/40">
          {error ? (
            <AlertCircle
              className="h-5 w-5 text-destructive"
              strokeWidth={1.7}
            />
          ) : (
            <WalletCards
              className="h-5 w-5 text-muted-foreground"
              strokeWidth={1.7}
            />
          )}
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          financeiro /v1
        </p>
        <h1 className="mt-2 text-xl font-medium tracking-tight">
          {error ? "Não foi possível iniciar" : "Carregando seu painel"}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          {error
            ? error
            : "Preparando contas, categorias, transações e metas."}
        </p>

        {error ? (
          <Button
            className="mt-6"
            disabled={isRetrying}
            onClick={onRetry}
            type="button"
          >
            {isRetrying ? (
              <Loader2 className="animate-spin" strokeWidth={1.7} />
            ) : (
              <RefreshCw strokeWidth={1.7} />
            )}
            Tentar novamente
          </Button>
        ) : (
          <div className="mt-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.7} />
            Sincronizando dados
          </div>
        )}
      </div>
    </div>
  );
}
