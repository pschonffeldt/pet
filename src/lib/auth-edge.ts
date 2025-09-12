import { NextAuthConfig } from "next-auth";
import prisma from "./db";

export const nextAuthEdgeConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ auth, request }) => {
      const isLoggedIn = Boolean(auth?.user);
      const isTryingToAccessApp = request.nextUrl.pathname.includes("/app");

      if (!isLoggedIn && isTryingToAccessApp) return false;

      if (isLoggedIn && isTryingToAccessApp && !auth?.user?.hasAccess) {
        return Response.redirect(new URL("/payment", request.nextUrl));
      }

      if (isLoggedIn && isTryingToAccessApp && auth?.user?.hasAccess)
        return true;

      if (
        isLoggedIn &&
        (request.nextUrl.pathname.includes("/login") ||
          request.nextUrl.pathname.includes("/signup")) &&
        auth?.user?.hasAccess
      ) {
        return Response.redirect(new URL("/app/dashboard", request.nextUrl));
      }

      if (isLoggedIn && !isTryingToAccessApp && !auth?.user?.hasAccess) {
        if (
          request.nextUrl.pathname.includes("/login") ||
          request.nextUrl.pathname.includes("/signup")
        ) {
          return Response.redirect(new URL("/payment", request.nextUrl));
        }
        return true;
      }

      if (!isLoggedIn && !isTryingToAccessApp) return true;

      return false;
    },

    jwt: async ({ token, user, trigger }) => {
      if (user) {
        if (user.id) token.userId = user.id;
        if (user.email) token.email = user.email;
        if (typeof user.hasAccess !== "undefined") {
          token.hasAccess = !!user.hasAccess;
        }
      }

      if (trigger === "update") {
        if (token.email) {
          const userFromDb = await prisma.user.findUnique({
            where: { email: token.email },
            select: { hasAccess: true },
          });
          if (userFromDb) token.hasAccess = userFromDb.hasAccess;
        }
      }

      return token;
    },

    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.userId;
        session.user.hasAccess = token.hasAccess ?? false;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
