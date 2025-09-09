// lib/auth-edge.ts
import { NextAuthConfig } from "next-auth";
import prisma from "./db";

export const nextAuthEdgeConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ auth, request }) => {
      // runs on every request via middleware
      const isLoggedIn = Boolean(auth?.user);
      const path = request.nextUrl.pathname;
      const isTryingToAccessApp = path.startsWith("/app");

      if (!isLoggedIn && isTryingToAccessApp) {
        return false; // sends to /login
      }

      if (isLoggedIn && isTryingToAccessApp && !auth?.user.hasAccess) {
        return Response.redirect(new URL("/payment", request.nextUrl));
      }

      if (isLoggedIn && isTryingToAccessApp && auth?.user.hasAccess) {
        return true;
      }

      if (
        isLoggedIn &&
        (path.startsWith("/login") || path.startsWith("/signup")) &&
        auth?.user.hasAccess
      ) {
        return Response.redirect(new URL("/app/dashboard", request.nextUrl));
      }

      if (isLoggedIn && !isTryingToAccessApp && !auth?.user.hasAccess) {
        if (path.startsWith("/login") || path.startsWith("/signup")) {
          return Response.redirect(new URL("/payment", request.nextUrl));
        }
        return true;
      }

      if (!isLoggedIn && !isTryingToAccessApp) {
        return true;
      }

      return false;
    },

    jwt: async ({ token, user, trigger }) => {
      if (user) {
        token.userId = user.id!;
        token.email = user.email!;
        token.hasAccess = (user as any).hasAccess;
      }

      if (trigger === "update") {
        const userFromDb = await prisma.user.findUnique({
          where: { email: token.email as string },
        });
        if (userFromDb) token.hasAccess = userFromDb.hasAccess;
      }

      return token;
    },

    session: ({ session, token }) => {
      session.user.id = token.userId as string;
      session.user.hasAccess = token.hasAccess as boolean;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
