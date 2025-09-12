// src/types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      hasAccess?: boolean;
    };
  }

  // Augment the existing User; no need to extend DefaultUser
  interface User {
    id?: string;
    hasAccess?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    email?: string;
    hasAccess?: boolean;
  }
}
