import type { Metadata } from "next";
import { db } from "@/lib/db";
import { env, storageMode } from "@/lib/env";
import { getSettings } from "@/modules/platform/service";
import { resetDemoAction } from "@/app/actions/admin";
import { SettingsForm } from "@/components/admin/settings-form";
import { ActionButton } from "@/components/ui/action-button";
import { DefinitionList, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettings() {
  const s = await getSettings(db);
  return (
    <>
      <PageHeader title="Platform settings" description="Business rules applied to new transactions. Existing bookings keep the rates they were created with." />
      <section className="card p-6"><SettingsForm initial={s} /></section>
      <section className="card mt-6 p-6">
        <h2 className="text-lg font-bold">Environment</h2>
        <div className="mt-3">
          <DefinitionList items={[["Payment provider", `${env.paymentProvider} (simulated)`], ["File storage", storageMode() === "supabase" ? "Supabase Storage" : "Local disk (development)"], ["Demo mode", env.demoMode ? "On" : "Off"]]} />
        </div>
      </section>
      {env.demoMode && (
        <section className="card mt-6 border-rose/30 p-6">
          <h2 className="text-lg font-bold">Reset demo data</h2>
          <p className="mt-1 text-sm text-ink-soft">Deletes all records — including accounts and listings created by evaluators — and restores the original demonstration dataset. Everyone is signed out. Only available when DEMO_MODE is on.</p>
          <div className="mt-4">
            <ActionButton variant="danger" action={resetDemoAction} confirm="Delete all data and restore the demo dataset? This cannot be undone." redirectTo="/login">Reset demo data</ActionButton>
          </div>
        </section>
      )}
    </>
  );
}
