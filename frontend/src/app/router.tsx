import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { PermissionRoute } from "@/features/auth/PermissionRoute";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { ComingSoonPage } from "@/features/shared/ComingSoonPage";
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

function lazyPage(page: ReactNode) {
  return <Suspense fallback={<div className="text-slate-500">Loading page…</div>}>{page}</Suspense>;
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
        { path: "design-orders", element: <ComingSoonPage /> },
        { path: "payments", element: <ComingSoonPage /> },
        { path: "expenses", element: <ComingSoonPage /> },
        { path: "reports", element: <ComingSoonPage /> },
      ],
    }],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
