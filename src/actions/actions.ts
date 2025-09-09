"use server";

import { signIn, signOut } from "@/lib/auth-no-edge";
import prisma from "@/lib/db";
import { authSchema, petFormSchema, petIdSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { checkAuth, getPetById } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";

// Instantiate Stripe (do NOT pass apiVersion to avoid TS mismatch)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Simple base URL helper (replaces any old getBaseUrl usage)
const BASE_URL =
  process.env.CANONICAL_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

// --- user actions ---

export async function logOut() {
  await signOut({ redirectTo: "/" });
}

export async function logIn(_prev: unknown, formData: unknown) {
  if (!(formData instanceof FormData)) return { message: "Invalid form data." };

  const entries = Object.fromEntries(formData.entries());
  const parsed = authSchema.safeParse(entries);
  if (!parsed.success) return { message: "Invalid form data." };

  // where should this user land?
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { hasAccess: true },
  });
  const dest = user?.hasAccess ? "/app/dashboard" : "/payment";

  try {
    // create session but DON'T redirect
    await signIn("credentials", formData, { redirect: false } as any);
  } catch (err) {
    if (err instanceof AuthError && err.type === "CredentialsSignin") {
      return { message: "Invalid credentials." };
    }
    throw err;
  }

  // YOU redirect
  redirect(dest);
}

export async function signUp(_prev: unknown, formData: unknown) {
  if (!(formData instanceof FormData)) return { message: "Invalid form data." };

  // Validate input
  const entries = Object.fromEntries(formData.entries());
  const parsed = authSchema.safeParse(entries);
  if (!parsed.success) return { message: "Invalid form data." };

  const { email, password } = parsed.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  try {
    await prisma.user.create({ data: { email, hashedPassword } });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return { message: "Email already exists." };
      return { message: `Could not create user (Prisma ${err.code}).` };
    }
    return {
      message: `Could not create user: ${
        (err as Error)?.message ?? "Unknown error"
      }`,
    };
  }

  // Immediately sign the user in and let NextAuth redirect to /payment.
  try {
    const creds = new FormData();
    creds.set("email", email);
    creds.set("password", password);

    // NextAuth will throw a NEXT_REDIRECT on success, so this call won't return.
    await signIn("credentials", creds, { redirectTo: "/payment" } as any);

    // Fallback (shouldn't be reached if redirect happens)
    return { message: "Signed up. Redirecting…" };
  } catch (err) {
    if (err instanceof AuthError) {
      // e.g. CredentialsSignin
      console.error("SIGNUP: signIn after create failed:", err);
      return { message: "Error. Could not sign in after sign up." };
    }
    // Preserve non-auth errors (e.g., the redirect signal)
    throw err;
  }
}

// --- pet actions ---

export async function addPet(pet: unknown) {
  const session = await checkAuth();

  const validatedPet = petFormSchema.safeParse(pet);
  if (!validatedPet.success) {
    return { message: "Invalid pet data." };
  }

  try {
    await prisma.pet.create({
      data: {
        ...validatedPet.data,
        user: { connect: { id: session.user.id } },
      },
    });
  } catch (error) {
    console.error(error);
    return { message: "Could not add pet." };
  }

  revalidatePath("/app", "layout");
}

export async function editPet(petId: unknown, newPetData: unknown) {
  const session = await checkAuth();

  const validatedPetId = petIdSchema.safeParse(petId);
  const validatedPet = petFormSchema.safeParse(newPetData);

  if (!validatedPetId.success || !validatedPet.success) {
    return { message: "Invalid pet data." };
  }

  // Authorization
  const pet = await getPetById(validatedPetId.data);
  if (!pet) return { message: "Pet not found." };
  if (pet.userId !== session.user.id) return { message: "Not authorized." };

  try {
    await prisma.pet.update({
      where: { id: validatedPetId.data },
      data: validatedPet.data,
    });
  } catch {
    return { message: "Could not edit pet." };
  }

  revalidatePath("/app", "layout");
}

export async function deletePet(petId: unknown) {
  const session = await checkAuth();

  const validatedPetId = petIdSchema.safeParse(petId);
  if (!validatedPetId.success) {
    return { message: "Invalid pet data." };
  }

  const pet = await getPetById(validatedPetId.data);
  if (!pet) return { message: "Pet not found." };
  if (pet.userId !== session.user.id) return { message: "Not authorized." };

  try {
    await prisma.pet.delete({ where: { id: validatedPetId.data } });
  } catch {
    return { message: "Could not delete pet..." };
  }

  revalidatePath("/app", "layout");
}

// --- payment actions ---

export async function createCheckoutSession() {
  const session = await checkAuth();

  const checkoutSession = await stripe.checkout.sessions.create({
    customer_email: session.user.email,
    line_items: [
      {
        // keep your existing price ID
        price: "price_1S3fq1BUzkE5WYavwfF4hGQs",
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${BASE_URL}/payment?success=true`,
    cancel_url: `${BASE_URL}/payment?cancelled=true`,
  });

  // Redirect the user to Stripe Checkout
  redirect(checkoutSession.url!);
}
