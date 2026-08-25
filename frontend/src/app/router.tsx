import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { DailyJournalPage } from "@/features/daily-journal/DailyJournalPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { PermissionRoute } from "@/features/auth/PermissionRoute";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";

const CustomersPage = lazy(() =>
  import("@/features/customers/CustomersPage").then((module) => ({
    default: module.CustomersPage,
  })),
);
const CustomerCreatePage = lazy(() =>
  import("@/features/customers/CustomerCreatePage").then((module) => ({
    default: module.CustomerCreatePage,
  })),
);
const CustomerDetailPage = lazy(() =>
  import("@/features/customers/CustomerDetailPage").then((module) => ({
    default: module.CustomerDetailPage,
  })),
);
const CustomerEditPage = lazy(() =>
  import("@/features/customers/CustomerEditPage").then((module) => ({
    default: module.CustomerEditPage,
  })),
);
const DesignOrdersPage = lazy(() => import("@/features/design-orders/DesignOrdersPage"));
const DesignOrderCreatePage = lazy(() => import("@/features/design-orders/DesignOrderCreatePage").then((module) => ({ default: module.DesignOrderCreatePage })));
const DesignOrderDetailPage = lazy(() => import("@/features/design-orders/DesignOrderDetailPage").then((module) => ({ default: module.DesignOrderDetailPage })));
const DesignOrderEditPage = lazy(() => import("@/features/design-orders/DesignOrderEditPage").then((module) => ({ default: module.DesignOrderEditPage })));
const PaymentsPage = lazy(() => import("@/features/payments/PaymentsPage").then((module) => ({ default: module.PaymentsPage })));
const ReportsPage = lazy(() => import("@/features/reports/ReportsPage").then((module) => ({ default: module.ReportsPage })));

function lazyPage(page: ReactNode) {
  return <Suspense fallback={<div className="text-slate-500">پاڼه راځي…</div>}>{page}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppLayout />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: "dashboard", element: <DashboardPage /> },
        {
          element: <PermissionRoute permission="manage_customers" />,
          children: [
            { path: "customers", element: lazyPage(<CustomersPage />) },
            { path: "customers/new", element: lazyPage(<CustomerCreatePage />) },
            { path: "customers/:customerId", element: lazyPage(<CustomerDetailPage />) },
            { path: "customers/:customerId/edit", element: lazyPage(<CustomerEditPage />) },
          ],
        },
        {
          element: <PermissionRoute permission="manage_design_orders" />,
          children: [
            { path: "design-orders", element: lazyPage(<DesignOrdersPage />) },
            { path: "design-orders/new", element: lazyPage(<DesignOrderCreatePage />) },
            { path: "design-orders/:orderId", element: lazyPage(<DesignOrderDetailPage />) },
            { path: "design-orders/:orderId/edit", element: lazyPage(<DesignOrderEditPage />) },
          ],
        },
        { element: <PermissionRoute permission="manage_payments" />, children: [{ path: "payments", element: lazyPage(<PaymentsPage />) }] },
        { element: <PermissionRoute permission="manage_expenses" />, children: [{ path: "expenses", element: <DailyJournalPage /> }] },
        { element: <PermissionRoute permission="view_reports" />, children: [{ path: "reports", element: lazyPage(<ReportsPage />) }] },
      ],
    }],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
