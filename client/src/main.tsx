import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { ApiError } from "./lib/api";
import { authClient } from "./lib/auth";
import { fmt } from "./lib/time";
import { useMe, useStatus } from "./lib/queries";
import { ToastProvider } from "./components/Toasts";
import { AppShell } from "./components/AppShell";
import { FullScreenMessage } from "./components/ui";
import { LoginPage } from "./pages/LoginPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ProfilePage } from "./pages/ProfilePage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { StatsPage } from "./pages/StatsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Se încarcă">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-mine motion-reduce:animate-none" />
    </div>
  );
}

// maintenance and login checks
function Root() {
  const status = useStatus();
  const session = authClient.useSession();

  if (status.isPending || session.isPending) return <Loading />;
  if (status.isError) {
    return <FullScreenMessage title="Serverul nu răspunde." />;
  }
  if (status.data.maintenance.active) {
    const until = status.data.maintenance.until;
    return (
      <FullScreenMessage title="Aplicația este în mentenanță.">
        {until ? `Revenire estimată: ${fmt(until, "d MMMM, HH:mm")}.` : "Programările sunt temporar indisponibile."}
      </FullScreenMessage>
    );
  }

  return (
    <Routes>
      <Route
        path="/autentificare"
        element={session.data ? <Navigate to="/" replace /> : <LoginPage status={status.data} />}
      />
      <Route element={session.data ? <SignedIn /> : <Navigate to="/autentificare" replace />}>
        <Route element={<AppShell />}>
          <Route index element={<RequireProfile><CalendarPage rules={status.data.rules} /></RequireProfile>} />
          <Route path="programari" element={<MyBookingsPage />} />
          <Route path="profil" element={<ProfileRoute />} />
          <Route path="statistici" element={<AdminOnly />} />
        </Route>
      </Route>
      <Route path="*" element={<FullScreenMessage title="Pagina nu există." />} />
    </Routes>
  );
}

function SignedIn() {
  const me = useMe();
  if (me.isPending) return <Loading />;
  if (me.error instanceof ApiError && me.error.status === 401) {
    // session expired
    authClient.signOut().finally(() => window.location.assign("/autentificare"));
    return <Loading />;
  }
  if (me.isError) return <FullScreenMessage title="Datele contului nu au putut fi încărcate." />;
  return <Outlet />;
}

function RequireProfile({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();
  if (me.data && !me.data.profile) return <Navigate to="/profil" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

// statistics page, admins only (the server checks too)
function AdminOnly() {
  const me = useMe();
  if (!me.data) return null;
  return me.data.user.isAdmin ? <StatsPage /> : <Navigate to="/" replace />;
}

function ProfileRoute() {
  const me = useMe();
  return me.data ? <ProfilePage me={me.data} /> : null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Root />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
