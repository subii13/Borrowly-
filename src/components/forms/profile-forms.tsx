"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AREAS } from "@/lib/constants";
import { changePasswordAction, updateProfileAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/primitives";

export function ProfileForm({ initial }: { initial: { name: string; phone: string; area: string; bio: string } }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateProfileAction(v);
          if (!r.ok) {
            setErrors(r.fieldErrors ?? {});
            return void toast.error(r.error);
          }
          setErrors({});
          toast.success(r.message ?? "Saved");
          router.refresh();
        });
      }}
    >
      <Field label="Full name" htmlFor="p-name" error={errors.name}><input id="p-name" className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Mobile number" htmlFor="p-phone" error={errors.phone}><input id="p-phone" className="input" inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} placeholder="98xxxxxxxx" /></Field>
      <Field label="Area" htmlFor="p-area" error={errors.area}>
        <select id="p-area" className="input" value={v.area} onChange={(e) => setV({ ...v, area: e.target.value })}>
          <option value="">Choose area</option>
          {AREAS.map((a) => <option key={a.name}>{a.name}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2"><Field label="About you" htmlFor="p-bio" error={errors.bio}><textarea id="p-bio" className="input min-h-20" value={v.bio} maxLength={400} onChange={(e) => setV({ ...v, bio: e.target.value })} /></Field></div>
      <div><Button disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Save profile</Button></div>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await changePasswordAction({ current, next });
          if (!r.ok) return void toast.error(r.fieldErrors ? Object.values(r.fieldErrors)[0] : r.error);
          toast.success("Password changed");
          setCurrent("");
          setNext("");
        });
      }}
    >
      <Field label="Current password" htmlFor="pw-cur"><input id="pw-cur" type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
      <Field label="New password" htmlFor="pw-new" hint="8+ characters with a letter and a number"><input id="pw-new" type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
      <div><Button variant="secondary" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Change password</Button></div>
    </form>
  );
}
