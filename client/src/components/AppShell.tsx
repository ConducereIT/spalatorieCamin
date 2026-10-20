import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { BarChart3, CalendarDays, ListChecks, UserRound } from "lucide-react";
import { useMe } from "../lib/queries";
import { Credits } from "./Credits";
import { Logo } from "./Logo";

const nav = [
  { to: "/", label: "Calendar", icon: CalendarDays, end: true },
  { to: "/programari", label: "Programări", icon: ListChecks, end: false },
  { to: "/profil", label: "Profil", icon: UserRound, end: false },
];

// top bar on desktop, bottom bar on phone
const adminItem = { to: "/statistici", label: "Statistici", icon: BarChart3, end: false };

export function AppShell() {
  const me = useMe();
  const items = me.data?.user.isAdmin ? [...nav, adminItem] : nav;
  // keep the calendar url (machine + day) when coming back to it
  const { pathname, search } = useLocation();
  const calendarSearch = pathname === "/" ? search : sessionLastSearch();
  useEffect(() => {
    if (pathname === "/") rememberSearch(search);
  }, [pathname, search]);
  const to = (path: string) => (path === "/" ? `/${calendarSearch}` : path);

  return (
    <div className="min-h-dvh pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="hidden border-b border-line lg:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo size={34} />
          <nav aria-label="Meniu">
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={to(item.to)}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium ${
                        isActive ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface hover:text-ink"
                      }`
                    }
                  >
                    <item.icon size={17} aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-[max(12px,env(safe-area-inset-top))] pb-6 sm:px-6 lg:pt-5">
        <Outlet />
      </main>

      {/* on phone the credits sit on the Profil page, the calendar must stay one screen tall */}
      <Credits className="hidden border-t border-line py-5 lg:block" />

      <nav
        aria-label="Meniu"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className={`grid h-[68px] ${items.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={to(item.to)}
                end={item.end}
                className={({ isActive }) =>
                  `flex h-full flex-col items-center justify-center gap-1 text-[12px] font-medium ${
                    isActive ? "text-mine-text" : "text-ink-2"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`grid h-7 w-14 place-items-center rounded-full ${isActive ? "bg-mine-soft" : ""}`}>
                      <item.icon size={20} aria-hidden />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function sessionLastSearch() {
  try {
    return sessionStorage.getItem("calendar-search") ?? "";
  } catch {
    return "";
  }
}

function rememberSearch(search: string) {
  try {
    sessionStorage.setItem("calendar-search", search);
  } catch {
    // private mode, ignore
  }
}
