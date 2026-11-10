import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireSellerPage } from "@/lib/session";
import { updateSellerProfileAction } from "@/app/actions/seller";
import { SellerProfileForm } from "@/components/forms/seller-profile-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Seller profile" };

export default async function SellerProfileSettings() {
  const { actor } = await requireSellerPage();
  const s = await db.sellerProfile.findUniqueOrThrow({ where: { id: actor.sellerId } });
  return (
    <>
      <PageHeader title="Seller profile" description={<>How customers see you. <Link href={`/sellers/${s.id}`} className="text-brand underline">View public profile</Link></>} />
      <div className="card p-6">
        <SellerProfileForm
          action={updateSellerProfileAction}
          submitLabel="Save profile"
          initial={{ displayName: s.displayName, sellerType: s.sellerType, bio: s.bio ?? "", area: s.area, pincode: s.pincode, pickupAddress: s.pickupAddress ?? "", phone: s.phone ?? "" }}
        />
      </div>
      <p className="mt-3 text-xs text-ink-faint">Changing your phone number resets phone verification.</p>
    </>
  );
}
