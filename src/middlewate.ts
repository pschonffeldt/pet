import NextAuth from "next-auth";
import { nextAuthEdgeConfig } from "./lib/auth-edge";

export default NextAuth(nextAuthEdgeConfig).auth;

export const config = {
  // Protect everything except api/static assets/images/favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
