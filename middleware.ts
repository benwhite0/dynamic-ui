import NextAuth from "next-auth";

import { authConfig } from "@/app/(auth)/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/",
    "/:id",
    "/api/:path*",
    "/login",
    "/register",
    // Nested paths fall outside "/:id", so cover the reports app explicitly.
    "/reports/:path*",
  ],
};
