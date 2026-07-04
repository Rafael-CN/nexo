import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, RefreshCw, WalletCards } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { DesktopTitleBar } from "./DesktopTitleBar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { ImportStatementModal } from "@/components/shared/ImportStatementModal";
import { Onboarding } from "@/components/shared/Onboarding";
import { ShortcutsHelp } from "@/components/shared/ShortcutsHelp";
import { TransactionModal } from "@/components/shared/TransactionModal";
import { UpdateBanner } from "@/components/shared/UpdateBanner";
import { useDesktopShortcuts } from "@/hooks/useDesktopShortcuts";
import type { Transaction, TransactionType } from "@/types";
import type { TransactionModalFormState } from "@/components/shared/transactionModalUtils";
import { isTauri } from "@/lib/db";
import { appRoutes } from "@/lib/navigation";
import { getLocalProfile, type LocalProfile } from "@/lib/profile";
import {
  checkForUpdate,
  dismissVersion,
  getDismissedVersion,
  markChecked,
  shouldAutoCheck,
  type UpdateInfo,
} from "@/lib/updates";
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
  const [transactionModalType, setTransactionModalType] =
    useState<TransactionType>("expense");
  const [transactionDraft, setTransactionDraft] =
    useState<Partial<TransactionModalFormState> | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [importStatementOpen, setImportStatementOpen] = useState(false);
  const [profile, setProfile] = useState<LocalProfile | null>(() =>
    getLocalProfile(),
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);
  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);
  const openNewTransaction = useCallback(() => {
    setCommandPaletteOpen(false);
    setTransactionModalType("expense");
    setTransactionDraft(undefined);
    setEditingTransaction(null);
    setTransactionModalOpen(true);
  }, []);
  const openNewTransfer = useCallback(() => {
    setCommandPaletteOpen(false);
    setTransactionModalType("transfer");
    setTransactionDraft(undefined);
    setEditingTransaction(null);
    setTransactionModalOpen(true);
  }, []);
  const openQuickCreate = useCallback(
    (draft: Partial<TransactionModalFormState>) => {
      setCommandPaletteOpen(false);
      setTransactionModalType(draft.type ?? "expense");
      setTransactionDraft(draft);
      setEditingTransaction(null);
      setTransactionModalOpen(true);
    },
    [],
  );
  const openEditTransaction = useCallback((transaction: Transaction) => {
    setCommandPaletteOpen(false);
    setTransactionDraft(undefined);
    setEditingTransaction(transaction);
    setTransactionModalOpen(true);
  }, []);
  const handleTransactionModalOpenChange = useCallback((next: boolean) => {
    setTransactionModalOpen(next);
    if (!next) {
      setTransactionDraft(undefined);
      setEditingTransaction(null);
    }
  }, []);
  const openShortcutsHelp = useCallback(() => {
    setCommandPaletteOpen(false);
    setShortcutsHelpOpen(true);
  }, []);
  const openImportStatement = useCallback(() => {
    setCommandPaletteOpen(false);
    setImportStatementOpen(true);
  }, []);
  const closeTransactionModal = useCallback(() => {
    setTransactionModalOpen(false);
  }, []);
  const openSettings = useCallback(() => navigate("/configuracoes"), [navigate]);
  const navigateToIndex = useCallback(
    (index: number) => {
      const route = appRoutes[index];
      if (route) navigate(route.path);
    },
    [navigate],
  );

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Verificação silenciosa de atualização (apenas no desktop, com throttle).
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(
    null,
  );
  useEffect(() => {
    if (!isTauri || !shouldAutoCheck()) return;

    let cancelled = false;
    markChecked();
    checkForUpdate()
      .then((update) => {
        if (cancelled || !update) return;
        if (getDismissedVersion() === update.version) return;
        setAvailableUpdate(update);
      })
      .catch(() => undefined); // sem rede: tenta de novo na próxima janela

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadUpdate = useCallback(() => {
    if (!availableUpdate) return;
    if (isTauri) {
      void openExternal(availableUpdate.url);
    } else {
      window.open(availableUpdate.url, "_blank", "noopener");
    }
    setAvailableUpdate(null);
  }, [availableUpdate]);

  const handleDismissUpdate = useCallback(() => {
    if (availableUpdate) dismissVersion(availableUpdate.version);
    setAvailableUpdate(null);
  }, [availableUpdate]);

  useDesktopShortcuts({
    enabled: isLoaded && accounts.length > 0,
    onOpenPalette: openCommandPalette,
    onOpenNewTransaction: openNewTransaction,
    onOpenNewTransfer: openNewTransfer,
    onOpenHelp: openShortcutsHelp,
    onOpenSettings: openSettings,
    onNavigateToIndex: navigateToIndex,
    onClosePalette: closeCommandPalette,
    onCloseTransactionModal: closeTransactionModal,
    isCommandPaletteOpen: commandPaletteOpen,
    isTransactionModalOpen: transactionModalOpen,
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
          <Sidebar profile={profile} className="hidden lg:flex" />
          <div className="flex h-full min-w-0 flex-1 flex-col">
            <Header
              onOpenCommandPalette={openCommandPalette}
              onNewTransaction={openNewTransaction}
              onToggleNav={() => setMobileNavOpen((open) => !open)}
            />
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1400px] animate-fade-in px-4 py-6 md:px-8 md:py-8">
                <Outlet />
              </div>
            </main>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              onClick={(event) => {
                // Fecha ao navegar ou ao clicar fora da navegação.
                if (event.target instanceof HTMLElement && event.target.closest("a")) {
                  setMobileNavOpen(false);
                }
              }}
            >
              <Sidebar profile={profile} className="animate-in slide-in-from-left-4 duration-150" />
            </div>
            <button
              type="button"
              aria-label="Fechar navegação"
              className="flex-1 bg-background/60 backdrop-blur-[2px]"
              onClick={() => setMobileNavOpen(false)}
            />
          </div>
        )}
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNewTransaction={openNewTransaction}
        onNewTransfer={openNewTransfer}
        onOpenHelp={openShortcutsHelp}
        onImportStatement={openImportStatement}
        onQuickCreate={openQuickCreate}
        onEditTransaction={openEditTransaction}
      />
      <TransactionModal
        open={transactionModalOpen}
        onOpenChange={handleTransactionModalOpenChange}
        transaction={editingTransaction}
        initialType={transactionModalType}
        initialDraft={transactionDraft}
      />
      <ShortcutsHelp
        open={shortcutsHelpOpen}
        onOpenChange={setShortcutsHelpOpen}
      />
      <ImportStatementModal
        open={importStatementOpen}
        onOpenChange={setImportStatementOpen}
      />
      {availableUpdate && (
        <UpdateBanner
          info={availableUpdate}
          onDownload={handleDownloadUpdate}
          onDismiss={handleDismissUpdate}
        />
      )}
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
          Nexo / v1
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
