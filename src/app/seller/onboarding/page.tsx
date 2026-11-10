import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { becomeSellerAction } from "@/app/actions/seller";
import { SellerProfileForm } from "@/components/forms/seller-profile-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Become a seller" };

export default async function OnboardingPage() {
  const { user } = await requireUserPage("/seller/onboarding");
  if (user.sellerProfile) redirect("/seller");
  const profile = await db.userProfile.findUnique({ where: { userId: user.id } });
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Start selling" title="Create your seller profile" description="Your customer account stays the same — selling is just switched on." />
      <ul className="mb-6 grid grid-cols-1 gap-2 text-sm text-ink-soft sm:grid-cols-3">
        {["List items to rent, sell, or both", "You set prices, deposits and dates", "Get verified to earn the trust badge"].map((t) => (
          <li key={t} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-brand" />{t}</li>
        ))}
      </ul>
      <div className="card p-6">
        <SellerProfileForm
          action={becomeSellerAction}
          submitLabel="Create seller profile"
          redirectTo="/seller"
          initial={{ displayName: user.name, sellerType: "INDIVIDUAL", bio: "", area: profile?.area ?? "", pincode: "", pickupAddress: "", phone: profile?.phone ?? "" }}
        />
      </div>
    </div>
  );
}
