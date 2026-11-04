import type { Role } from "@prisma/client";
import { AppError, forbidden } from "./errors";

/** The authenticated principal passed into domain services. Always built server-side from the session. */
export type Actor = {
  id: string;
  role: Role;
  sellerId: string | null;
};

export const isAdmin = (actor: Actor) => actor.role === "ADMIN";

export function assertAdmin(actor: Actor | null): asserts actor is Actor {
  if (!actor) throw new AppError("UNAUTHENTICATED", "Please sign in");
  if (!isAdmin(actor)) throw forbidden("Administrator access required");
}

export function assertSeller(actor: Actor | null): asserts actor is Actor & { sellerId: string } {
  if (!actor) throw new AppError("UNAUTHENTICATED", "Please sign in");
  if (!actor.sellerId) throw forbidden("Create a seller profile first");
}

/** A party to a transaction: the customer, the listing's seller, or an administrator. */
export type Party = "customer" | "seller" | "admin";

export function partyOf(actor: Actor, tx: { customerId: string; sellerId: string }): Party | null {
  if (actor.id === tx.customerId) return "customer";
  if (actor.sellerId && actor.sellerId === tx.sellerId) return "seller";
  if (isAdmin(actor)) return "admin";
  return null;
}

export function requireParty(actor: Actor, tx: { customerId: string; sellerId: string }): Party {
  const party = partyOf(actor, tx);
  // Respond with NOT_FOUND rather than FORBIDDEN so private record ids cannot be probed.
  if (!party) throw new AppError("NOT_FOUND", "Not found");
  return party;
}
