import bcrypt from "bcryptjs";

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

let dummy: Promise<string> | null = null;
/** A real bcrypt hash used to keep login timing similar when an email does not exist. */
export const dummyHash = () => (dummy ??= hashPassword("borrowly-timing-equaliser"));
