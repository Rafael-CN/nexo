import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { CalendarPage } from "@/pages/Calendar";
import { AccountsPage } from "@/pages/Accounts";
import { TransactionsPage } from "@/pages/Transactions";
import { PlaceholderPage } from "@/pages/Placeholder";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "calendario", element: <CalendarPage /> },
      { path: "contas", element: <AccountsPage /> },
      { path: "transacoes", element: <TransactionsPage /> },
      { path: "metas", element: <PlaceholderPage label="Metas financeiras" /> },
      {
        path: "configuracoes",
        element: <PlaceholderPage label="Configurações" />,
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
