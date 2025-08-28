import z from "zod";
import { DEFAULT_PET_IMAGE } from "./constants";
import { exitCode } from "process";

export const petIdSchema = z.string().cuid();

export const petFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required" })
      .max(100, { message: "Name is too long" }),
    ownerName: z
      .string()
      .trim()
      .min(2, { message: "Owner name is required" })
      .max(100, { message: "Owner name is too long" }),
    imageUrl: z.union([
      z.literal(""),
      z.string().trim().url({ message: "Image url must be a valid url" }),
    ]),
    age: z.coerce.number().int().positive().max(50),
    // age: z.coerce.number().int().nonnegative(),

    notes: z.union([
      z.literal(""),
      z
        .string()
        .trim()
        .max(1000, { message: "Notes should be less than 1000 characters" }),
    ]),
  })
  .transform((data) => ({
    ...data,
    imageUrl: data.imageUrl || DEFAULT_PET_IMAGE,
  }));

export type TPetForm = z.infer<typeof petFormSchema>;
