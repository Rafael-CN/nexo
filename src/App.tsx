import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { CalendarPage } from "@/pages/Calendar";
import { AccountsPage } from "@/pages/Accounts";
import { AccountDetailPage } from "@/pages/AccountDetail";
import { TransactionsPage } from "@/pages/Transactions";
import { GoalsPage } from "@/pages/Goals";
import { ReportsPage } from "@/pages/Reports";
import { SettingsPage } from "@/pages/Settings";
import { SelectionCopyPopover } from "@/components/shared/SelectionCopyPopover";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "calendario", element: <CalendarPage /> },
      { path: "contas", element: <AccountsPage /> },
      { path: "contas/:accountId", element: <AccountDetailPage /> },
      { path: "transacoes", element: <TransactionsPage /> },
      { path: "metas", element: <GoalsPage /> },
      { path: "relatorios", element: <ReportsPage /> },
      { path: "configuracoes", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    target.isContentEditable
  );
}

export default function App() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        if (!isEditableTarget(event.target)) {
          event.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <SelectionCopyPopover />
    </>
  );
}
