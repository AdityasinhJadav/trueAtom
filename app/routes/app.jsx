import { Outlet, useLoaderData, useRouteError, useLocation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { TestProvider } from "../contexts/TestContext";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const location = useLocation();
  const path = location?.pathname || "";
  const isActive = (href) => {
    if (!href) return false;
    // Treat nested routes as active (e.g., /app/tests/123 should keep /app/additional active)
    try {
      const u = new URL(href, "http://x");
      const target = u.pathname;
      return path === target || path.startsWith(target + "/");
    } catch {
      return path === href || path.startsWith(href + "/");
    }
  };

  return (
    <AppProvider embedded apiKey={apiKey}>
      <TestProvider>
        <s-app-nav>
          <s-link href="/app" class={`${isActive('/app') ? 'font-semibold underline' : ''}`}>Dashboard</s-link>
          <s-link href="/app/additional" class={`${isActive('/app/additional') ? 'font-semibold underline' : ''}`}>Price Tests</s-link>
          <s-link href="/app/create" class={`${isActive('/app/create') ? 'font-semibold underline' : ''}`}>Create Test</s-link>
          <s-link href="/app/analytics" class={`${isActive('/app/analytics') ? 'font-semibold underline' : ''}`}>Analytics</s-link>
        </s-app-nav>
        <Outlet />
      </TestProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
