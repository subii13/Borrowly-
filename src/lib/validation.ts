import { z } from "zod";
import { AREA_NAMES, CONDITIONS } from "./constants";

// Shared Zod schemas: used by forms on the client and re-validated on the server.

export const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(160);
export const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email,
  password,
});

export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password").max(72) });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(10).max(200), password });

export const phone = z
  .string()
  .trim()
  .regex(/^(\+91[ -]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phone.optional().or(z.literal("")),
  area: z.enum(AREA_NAMES).optional().or(z.literal("")),
  bio: z.string().trim().max(400).optional(),
});

export const pincode = z.string().trim().regex(/^6\d{5}$/, "Enter a valid Coimbatore pincode");

export const sellerProfileSchema = z.object({
  displayName: z.string().trim().min(2, "Enter a display name").max(60),
  sellerType: z.enum(["INDIVIDUAL", "BUSINESS"]),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
  area: z.enum(AREA_NAMES, { error: "Choose your area" }),
  pincode,
  pickupAddress: z.string().trim().max(240).optional().or(z.literal("")),
  phone: phone.optional().or(z.literal("")),
});

const rupees = z
  .string()
  .trim()
  .regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter an amount in rupees");

export const listingImageInput = z.object({
  id: z.string().optional(),
  storageKey: z.string().max(200).optional(),
  url: z.string().max(500),
});

export const listingSchema = z
  .object({
    title: z.string().trim().min(6, "Title should be at least 6 characters").max(90),
    description: z.string().trim().min(30, "Describe the item in at least 30 characters").max(3000),
    categoryId: z.string().min(1, "Choose a category"),
    brand: z.string().trim().max(60).optional().or(z.literal("")),
    model: z.string().trim().max(60).optional().or(z.literal("")),
    condition: z.enum(CONDITIONS),
    images: z.array(listingImageInput).min(1, "Add at least one photo").max(8, "Up to 8 photos"),
    rentalEnabled: z.boolean(),
    purchaseEnabled: z.boolean(),
    dailyRate: rupees.optional().or(z.literal("")),
    deposit: rupees.optional().or(z.literal("")),
    salePrice: rupees.optional().or(z.literal("")),
    stockQuantity: z.coerce.number().int().min(1).max(50),
    minRentalDays: z.coerce.number().int().min(1).max(30),
    maxRentalDays: z.coerce.number().int().min(1).max(90),
    area: z.enum(AREA_NAMES, { error: "Choose an area" }),
    pincode,
    publish: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.rentalEnabled && !v.purchaseEnabled)
      ctx.addIssue({ code: "custom", path: ["rentalEnabled"], message: "Enable renting, selling or both" });
    if (v.rentalEnabled && !v.dailyRate) ctx.addIssue({ code: "custom", path: ["dailyRate"], message: "Enter a daily rate" });
    if (v.rentalEnabled && v.deposit === undefined) ctx.addIssue({ code: "custom", path: ["deposit"], message: "Enter a deposit (0 if none)" });
    if (v.purchaseEnabled && !v.salePrice) ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Enter a selling price" });
    if (v.minRentalDays > v.maxRentalDays)
      ctx.addIssue({ code: "custom", path: ["maxRentalDays"], message: "Maximum must be at least the minimum" });
  });

export type ListingInput = z.input<typeof listingSchema>;

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});

export const paymentOutcome = z.enum(["approve", "decline"]);

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  comment: z.string().trim().min(10, "Write at least 10 characters").max(1000),
});

export const disputeSchema = z.object({
  category: z.enum(["CONDITION_MISMATCH", "NOT_RECEIVED", "NOT_RETURNED", "DAMAGE", "INCORRECT_LISTING", "PAYMENT_ISSUE", "REFUND_ISSUE"]),
  description: z.string().trim().min(20, "Describe the issue in at least 20 characters").max(2000),
  evidenceKeys: z.array(z.string().max(200)).max(6).default([]),
});

export const evidenceSchema = z.object({
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  photoKeys: z.array(z.string().max(200)).max(6).default([]),
});
