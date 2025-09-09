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

// --- user actions ---

// export async function logIn(prevState: unknown, formData: unknown) {
//   if (!(formData instanceof FormData)) {
//     return {
//       message: "Invalid form data.",
//     };
//   }

//   try {
//     await signIn("credentials", formData);
//   } catch (error) {
//     if (error instanceof AuthError) {
//       switch (error.type) {
//         case "CredentialsSignin": {
//           return {
//             message: "Invalid credentials.",
//           };
//         }
//         default: {
//           return {
//             message: "Error. Could not sign in.",
//           };
//         }
//       }
//     }
//     throw error;
//   }
// }

export async function logIn(prevState: unknown, formData: unknown) {
  if (!(formData instanceof FormData)) {
    return { message: "Invalid form data." };
  }

  try {
    await signIn("credentials", formData);

    // If signIn didn't already throw a redirect, do it explicitly:
    redirect("/app/dashboard");
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { message: "Invalid credentials." };
        default:
          return { message: "Error. Could not sign in." };
      }
    }
    // Important: let NEXT_REDIRECT (or any non-AuthError redirect) bubble up
    throw error;
  }
}

// export async function signUp(prevState: unknown, formData: unknown) {
//   if (!(formData instanceof FormData)) {
//     return { message: "Invalid form data." };
//   }

//   const formDataEntries = Object.fromEntries(formData.entries());

//   const validatedFormData = authSchema.safeParse(formDataEntries);
//   if (!validatedFormData.success) {
//     return { message: "Invalid form data." };
//   }

//   const { email, password } = validatedFormData.data;
//   const hashedPassword = await bcrypt.hash(password, 10);

//   try {
//     console.info("SIGNUP: creating user", { email });
//     await prisma.user.create({
//       data: { email, hashedPassword },
//     });
//   } catch (err: unknown) {
//     // 🔎 Log the real error so you can see it in your server/Vercel logs
//     console.error("SIGNUP prisma.user.create failed:", err);

//     // Prisma-known errors
//     if (err instanceof Prisma.PrismaClientKnownRequestError) {
//       if (err.code === "P2002") {
//         // Unique constraint (email)
//         return { message: "Email already exists." };
//       }
//       if (err.code === "P2000") {
//         return {
//           message: "Value too long for a column (check input lengths).",
//         };
//       }
//       if (err.code === "P2012") {
//         return {
//           message: "Server error: missing required column. Run migrations.",
//         };
//       }
//       // Fallback with code for visibility
//       return { message: `Could not create user (Prisma ${err.code}).` };
//     }

//     // Other Prisma errors
//     if (err instanceof Prisma.PrismaClientValidationError) {
//       return { message: "Invalid data sent to the database." };
//     }
//     if (err instanceof Prisma.PrismaClientInitializationError) {
//       return { message: "Database connection error. Check your env vars/DB." };
//     }

//     // Generic fallback
//     return {
//       message: `Could not create user: ${
//         (err as Error)?.message ?? "Unknown error"
//       }`,
//     };
//   }

//   await signIn("credentials", formData);
// }

export async function signUp(prevState: unknown, formData: unknown) {
  if (!(formData instanceof FormData)) {
    return { message: "Invalid form data." };
  }

  const formDataEntries = Object.fromEntries(formData.entries());
  const validatedFormData = authSchema.safeParse(formDataEntries);
  if (!validatedFormData.success) {
    return { message: "Invalid form data." };
  }

  const { email, password } = validatedFormData.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    console.info("SIGNUP: creating user", { email });
    await prisma.user.create({ data: { email, hashedPassword } });
  } catch (err: unknown) {
    console.error("SIGNUP prisma.user.create failed:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return { message: "Email already exists." };
      if (err.code === "P2000")
        return {
          message: "Value too long for a column (check input lengths).",
        };
      if (err.code === "P2012")
        return {
          message: "Server error: missing required column. Run migrations.",
        };
      return { message: `Could not create user (Prisma ${err.code}).` };
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      return { message: "Invalid data sent to the database." };
    }
    if (err instanceof Prisma.PrismaClientInitializationError) {
      return { message: "Database connection error. Check your env vars/DB." };
    }
    return {
      message: `Could not create user: ${
        (err as Error)?.message ?? "Unknown error"
      }`,
    };
  }

  // Create the session
  await signIn("credentials", formData);

  // Then navigate
  redirect("/app/dashboard");
}

export async function logOut() {
  await signOut({ redirectTo: "/" });
}

// --- pet actions ---

export async function addPet(pet: unknown) {
  const session = await checkAuth();

  const validatedPet = petFormSchema.safeParse(pet);
  if (!validatedPet.success) {
    return {
      message: "Invalid pet data.",
    };
  }

  try {
    await prisma.pet.create({
      data: {
        ...validatedPet.data,
        user: {
          connect: {
            id: session.user.id,
          },
        },
      },
    });
  } catch (error) {
    console.log(error);
    return {
      message: "Could not add pet.",
    };
  }

  revalidatePath("/app", "layout");
}

export async function editPet(petId: unknown, newPetData: unknown) {
  // authentication check
  const session = await checkAuth();

  // validation

  const validatedPetId = petIdSchema.safeParse(petId);
  const validatedPet = petFormSchema.safeParse(newPetData);

  if (!validatedPetId.success || !validatedPet.success) {
    return {
      message: "Invalid pet data.",
    };
  }

  // authorization check
  const pet = await getPetById(validatedPetId.data);
  if (!pet) {
    return {
      message: "Pet not found.",
    };
  }
  if (pet.userId !== session.user.id) {
    return {
      message: "Not authorized.",
    };
  }

  // database mutation

  try {
    await prisma.pet.update({
      where: {
        id: validatedPetId.data,
      },
      data: validatedPet.data,
    });
  } catch (error) {
    return {
      message: "Could not edit pet.",
    };
  }
  revalidatePath("/app", "layout");
}

export async function deletePet(petId: unknown) {
  // authentication check
  const session = await checkAuth();

  // validation
  const validatedPetId = petIdSchema.safeParse(petId);

  if (!validatedPetId.success) {
    return {
      message: "Invalid pet data.",
    };
  }

  // authorization check
  const pet = await getPetById(validatedPetId.data);
  if (!pet) {
    return {
      message: "Pet not found.",
    };
  }
  if (pet.userId !== session.user.id) {
    return {
      message: "Not authorized.",
    };
  }

  // database mutation

  try {
    await prisma.pet.delete({
      where: {
        id: validatedPetId.data,
      },
    });
  } catch (error) {
    return {
      message: "Could not delete pet...",
    };
  }
  revalidatePath("/app", "layout");
}

// payment actions

export async function createCheckoutSession() {
  // authentication check
  const session = await checkAuth();

  console.log(session.user.email);

  // create checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer_email: session.user.email,
    line_items: [
      {
        price: "price_1S3fq1BUzkE5WYavwfF4hGQs",
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.CANONICAL_URL}/payment?success=true`,
    cancel_url: `${process.env.CANONICAL_URL}/payment?cancelled=true`,
  });

  // redirect user
  redirect(checkoutSession.url);
}
