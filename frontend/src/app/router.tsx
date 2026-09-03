import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { DailyJournalPage } from "@/features/daily-journal/DailyJournalPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { PermissionRoute } from "@/features/auth/PermissionRoute";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { HomeRedirect } from "@/features/auth/HomeRedirect";
import { NotFoundPage } from "@/features/system/SystemStatePages";

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
const SuppliersPage = lazy(() => import("@/features/suppliers/SuppliersPage").then((module) => ({ default: module.SuppliersPage })));
const BackupsPage = lazy(() => import("@/features/backups/BackupsPage").then((module) => ({ default: module.BackupsPage })));
const UsersPage = lazy(() => import("@/features/users/UsersPage"));
const AccountPage = lazy(() => import("@/features/auth/AccountPage"));
  const SupplierDetailPage = lazy(() => import("@/features/suppliers/SupplierDetailPage").then((module) => ({ default: module.SupplierDetailPage })));
  const SupplierEditPage = lazy(() => import("@/features/suppliers/SupplierEditPage").then((module) => ({ default: module.SupplierEditPage })));

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
        { index: true, element: <HomeRedirect /> },
        { element: <PermissionRoute permission="view_reports" />, children: [{ path: "dashboard", element: <DashboardPage /> }] },
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
        { element: <PermissionRoute permission="manage_expenses" />, children: [
          { path: "suppliers", element: lazyPage(<SuppliersPage />) },
          { path: "suppliers/:supplierId", element: lazyPage(<SupplierDetailPage />) },
          { path: "suppliers/:supplierId/edit", element: lazyPage(<SupplierEditPage />) },
        ] },
        { element: <PermissionRoute permission="view_reports" />, children: [{ path: "reports", element: lazyPage(<ReportsPage />) }] },
        { element: <PermissionRoute permission="manage_backups" />, children: [{ path: "backups", element: lazyPage(<BackupsPage />) }] },
        { element: <PermissionRoute permission="manage_users" />, children: [{ path: "users", element: lazyPage(<UsersPage />) }] },
        { path: "account", element: lazyPage(<AccountPage />) },
        { path: "*", element: <NotFoundPage /> },
      ],
    }],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
