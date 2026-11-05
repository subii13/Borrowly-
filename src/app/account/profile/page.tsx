import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MailWarning } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { formatDay } from "@/lib/dates";
import { PasswordForm, ProfileForm } from "@/components/forms/profile-forms";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user } = await requireUserPage("/account/profile");
  const profile = await db.userProfile.findUnique({ where: { userId: user.id } });
  return (
    <>
      <PageHeader title="Profile" description="How you appear to sellers when you rent or buy." />
      <div className="space-y-6">
        <section className="card p-6">
          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">{user.email}</span>
            {user.emailVerifiedAt ? (
              <span className="inline-flex items-center gap-1 text-forest"><BadgeCheck className="size-4" /> Verified {formatDay(user.emailVerifiedAt)}</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber"><MailWarning className="size-4" /> Not verified — see <Link href="/account" className="underline">overview</Link></span>
            )}
          </div>
          <ProfileForm initial={{ name: user.name, phone: profile?.phone ?? "", area: profile?.area ?? "", bio: profile?.bio ?? "" }} />
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-bold">Password</h2>
          <PasswordForm />
        </section>
        <section className="card p-6 text-sm">
          <h2 className="text-lg font-bold">Selling on Borrowly</h2>
          <p className="mt-1 text-ink-soft">{user.sellerProfile ? `You sell as ${user.sellerProfile.displayName}.` : "The same account can list items for rent or sale."}</p>
          <Link href={user.sellerProfile ? "/seller/profile" : "/seller/onboarding"} className="mt-3 inline-block font-medium text-forest hover:underline">{user.sellerProfile ? "Edit seller profile" : "Become a seller"}</Link>
        </section>
      </div>
    </>
  );
}
