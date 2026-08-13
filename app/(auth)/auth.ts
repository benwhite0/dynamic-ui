import { compare } from "bcrypt-ts";
import NextAuth, { User, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import {
  ensureGuestUser,
  getUser,
  GUEST_USER_EMAIL,
  GUEST_USER_ID,
} from "@/db/queries";

import { authConfig } from "./auth.config";

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth: nextAuth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        let users = await getUser(email);
        if (users.length === 0) return null;
        let passwordsMatch = await compare(password, users[0].password!);
        if (passwordsMatch) return users[0] as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});

/**
 * Login is bypassed for now. Anything without a real session falls back to a
 * shared guest user, so every `auth()` caller still gets a session carrying a
 * user id and none of them need a signed-in visitor.
 *
 * To turn login back on: export NextAuth's `auth` directly (rename `nextAuth`
 * above), drop this wrapper, and restore the check in auth.config.ts.
 */
export async function auth(): Promise<Session | null> {
  const session = await nextAuth();
  if (session?.user) {
    return session;
  }

  try {
    await ensureGuestUser();
  } catch (error) {
    // Best-effort: the reports pages read a CSV and need no database at all,
    // so an outage here shouldn't take them down. The chat routes that do
    // write a userId will surface their own error.
    console.error("Failed to provision the guest user", error);
  }

  return {
    user: { id: GUEST_USER_ID, email: GUEST_USER_EMAIL },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function isGuest(session: Session | null) {
  return session?.user?.id === GUEST_USER_ID;
}
