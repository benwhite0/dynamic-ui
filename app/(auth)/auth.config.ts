import { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    // Login is bypassed for now: every route is public, and `auth()` falls back
    // to a shared guest session so the pages behind it still get a user id.
    // Restore the real gate here to turn login back on — see app/(auth)/auth.ts.
    authorized() {
      return true;
    },
  },
} satisfies NextAuthConfig;
