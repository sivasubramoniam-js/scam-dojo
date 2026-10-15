"use client";

import React from "react";
import {
  Link as RouterLink,
  LinkProps as RouterLinkProps,
  useNavigate,
  useLocation,
  useSearchParams as useRouterSearchParams,
  useInRouterContext,
} from "react-router-dom";

export interface LinkProps extends Omit<RouterLinkProps, "to"> {
  to?: string;
  href?: string;
  children?: React.ReactNode;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, href, ...props }, ref) => {
    const destination = to || href || "";
    const inRouter = useInRouterContext();

    if (
      !inRouter ||
      (typeof destination === "string" &&
        (destination.startsWith("http://") ||
          destination.startsWith("https://") ||
          destination.startsWith("tel:") ||
          destination.startsWith("mailto:")))
    ) {
      return <a ref={ref} href={destination} {...props} />;
    }

    return <RouterLink ref={ref} to={destination} {...props} />;
  }
);

Link.displayName = "Link";

export default Link;

export function useRouter() {
  const inRouter = useInRouterContext();
  const navigate = inRouter ? useNavigate() : () => {};
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
  };
}

export function usePathname(): string {
  const inRouter = useInRouterContext();
  const location = inRouter ? useLocation() : { pathname: "/" };
  return location.pathname;
}

export function useSearchParams() {
  const inRouter = useInRouterContext();
  const [searchParams] = inRouter
    ? useRouterSearchParams()
    : [new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")];

  return {
    get: (key: string) => searchParams.get(key),
    getAll: (key: string) => searchParams.getAll(key),
    has: (key: string) => searchParams.has(key),
    toString: () => searchParams.toString(),
  };
}
