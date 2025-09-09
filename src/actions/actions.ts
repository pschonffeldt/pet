"use server";

import { signIn, signOut } from "@/lib/auth-no-edge";
import prisma from "@/lib/db";
import { checkAuth, getPetById } from "@/lib/server-utils";
import { authSchema, petFormSchema, petIdSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/** Prefer explicit canonical URL; fall back to Vercel host; dev -> localhost */
function getBaseUrl() {
  if (process.env.CANONICAL_URL) return process.env.CANONICAL_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// --- user actions ---

export async function logOut() {
  await signOut({ redirectTo: "/" });
}

// actions.ts (only the auth parts shown)

export async function logIn(prevState: unknown, formData: unknown) {
  if (!(formData instanceof FormData)) return { message: "Invalid form data." };

  const entries = Object.fromEntries(formData.entries());
  const parsed = authSchema.safeParse(entries);
  if (!parsed.success) return { message: "Invalid form data." };

  // Decide destination BEFORE sign-in
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { hasAccess: true },
  });
  const dest = user?.hasAccess ? "/app/dashboard" : "/payment";

  try {
    // Important: prevent NextAuth from doing its own redirect
    // Then we call Next.js `redirect()` ourselves.
    await signIn(
      "credentials",
      formData as FormData,
      { redirect: false } as any
    );
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { message: "Invalid credentials." };
        default:
          return { message: "Error. Could not sign in." };
      }
    }
    throw error;
  }

  redirect(dest);
}

export async function signUp(prevState: unknown, formData: unknown) {
  if (!(formData instanceof FormData)) return { message: "Invalid form data." };

  const entries = Object.fromEntries(formData.entries());
  const parsed = authSchema.safeParse(entries);
  if (!parsed.success) return { message: "Invalid form data." };

  const { email, password } = parsed.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({ data: { email, hashedPassword } });
  } catch (err: unknown) {
    console.error("SIGNUP prisma.user.create failed:", err);
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

  // Create the session for the new user (hasAccess=false by default)
  try {
    await signIn(
      "credentials",
      formData as FormData,
      { redirect: false } as any
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "Error. Could not sign in after sign up." };
    }
    throw error;
  }

  // New users must pay → force navigation to /payment
  redirect("/payment");
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

  const base = getBaseUrl();

  const checkoutSession = await stripe.checkout.sessions.create({
    customer_email: session.user.email,
    line_items: [
      {
        // keep your existing price id here
        price: "price_1S3fq1BUzkE5WYavwfF4hGQs",
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${base}/payment?success=true`,
    cancel_url: `${base}/payment?cancelled=true`,
  });

  redirect(checkoutSession.url);
}
