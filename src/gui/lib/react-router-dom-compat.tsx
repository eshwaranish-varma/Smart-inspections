"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AnchorHTMLAttributes,
  ReactNode,
  createContext,
  forwardRef,
  useContext,
  useEffect,
} from "react";

type RouterCompatValue = {
  pathname: string;
  params: Record<string, string | string[] | undefined>;
  outlet?: ReactNode;
};

const RouterCompatContext = createContext<RouterCompatValue | null>(null);

function useRouterCompatContext() {
  const value = useContext(RouterCompatContext);
  if (!value) {
    throw new Error("RouterCompatProvider is required for react-router-dom compatibility");
  }
  return value;
}

export function RouterCompatProvider({
  pathname,
  params,
  outlet,
  children,
}: RouterCompatValue & { children: ReactNode }) {
  return (
    <RouterCompatContext.Provider value={{ pathname, params, outlet }}>
      {children}
    </RouterCompatContext.Provider>
  );
}

export function useLocation() {
  const { pathname } = useRouterCompatContext();
  return {
    pathname,
    search: "",
    hash: "",
    state: null,
    key: pathname,
  };
}

export function useParams<T extends Record<string, string | undefined>>() {
  const { params } = useRouterCompatContext();
  return params as T;
}

export function useNavigate() {
  const router = useRouter();

  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      if (to < 0) {
        router.back();
      }
      return;
    }

    if (options?.replace) {
      router.replace(to);
      return;
    }

    router.push(to);
  };
}

export function Outlet() {
  const { outlet } = useRouterCompatContext();
  return <>{outlet ?? null}</>;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
};

type NavLinkProps = Omit<LinkProps, "className" | "children"> & {
  className?: string | ((args: { isActive: boolean }) => string);
  children?: ReactNode | ((args: { isActive: boolean }) => ReactNode);
};

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(({ to, className, children, ...props }, ref) => {
  const { pathname } = useRouterCompatContext();
  const isActive = pathname === to || pathname.startsWith(`${to}/`);
  const resolvedClassName =
    typeof className === "function" ? className({ isActive }) : className;
  const resolvedChildren =
    typeof children === "function" ? children({ isActive }) : children;

  return (
    <Link ref={ref} href={to} className={resolvedClassName} {...props}>
      {resolvedChildren}
    </Link>
  );
});
NavLink.displayName = "NavLink";

export const RRLink = forwardRef<HTMLAnchorElement, LinkProps>(({ to, ...props }, ref) => {
  return <Link ref={ref} href={to} {...props} />;
});
RRLink.displayName = "Link";
export { RRLink as Link };

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [replace, router, to]);

  return null;
}
