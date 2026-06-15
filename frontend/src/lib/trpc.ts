import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/index";

export const trpc = createTRPCReact<AppRouter>();

export function createTrpcClient() {
  const backendUrl = import.meta.env["VITE_BACKEND_URL"] as string | undefined;
  const trpcUrl = backendUrl ? `${backendUrl}/trpc` : "/trpc";

  return trpc.createClient({
    links: [
      httpBatchLink({
        url: trpcUrl,
        headers() {
          const token = localStorage.getItem("token");
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
