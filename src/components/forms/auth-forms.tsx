"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { forgotSchema, loginSchema, password, registerSchema } from "@/lib/validation";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/primitives";

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        start(async () => {
          setError(null);
          const r = await loginAction({ ...v, next });
          if (!r.ok) return setError(r.error);
          router.push(r.data);
          router.refresh();
        }),
      )}
    >
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose" role="alert">{error}</p>}
      <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className="input" {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
        <input id="password" type="password" autoComplete="current-password" className="input" {...register("password")} />
      </Field>
      <div className="text-right text-sm"><Link href="/forgot-password" className="text-forest hover:underline">Forgot password?</Link></div>
      <Submit pending={pending}>Log in</Submit>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        start(async () => {
          setError(null);
          const r = await registerAction({ ...v, next });
          if (!r.ok) return setError(r.error);
          toast.success("Welcome to Borrowly! Check your email to verify your account.");
          router.push(r.data);
          router.refresh();
        }),
      )}
    >
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose" role="alert">{error}</p>}
      <Field label="Full name" htmlFor="name" error={formState.errors.name?.message}>
        <input id="name" autoComplete="name" className="input" {...register("name")} />
      </Field>
      <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className="input" {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={formState.errors.password?.message} hint="At least 8 characters with a letter and a number">
        <input id="password" type="password" autoComplete="new-password" className="input" {...register("password")} />
      </Field>
      <Submit pending={pending}>Create account</Submit>
      <p className="text-xs text-ink-faint">By signing up you agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy policy</Link>.</p>
    </form>
  );
}

export function ForgotForm() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });
  if (sent) return <p className="rounded-lg bg-forest-50 px-4 py-3 text-sm text-forest">{sent}</p>;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        start(async () => {
          const r = await forgotPasswordAction(v);
          if (!r.ok) return void toast.error(r.error);
          setSent(r.message ?? "Check your email");
        }),
      )}
    >
      <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className="input" {...register("email")} />
      </Field>
      <Submit pending={pending}>Send reset link</Submit>
    </form>
  );
}

const resetForm = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState } = useForm<z.infer<typeof resetForm>>({ resolver: zodResolver(resetForm) });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        start(async () => {
          const r = await resetPasswordAction({ token, password: v.password });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message ?? "Password updated");
          router.push("/login");
        }),
      )}
    >
      <Field label="New password" htmlFor="password" error={formState.errors.password?.message}>
        <input id="password" type="password" autoComplete="new-password" className="input" {...register("password")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={formState.errors.confirm?.message}>
        <input id="confirm" type="password" autoComplete="new-password" className="input" {...register("confirm")} />
      </Field>
      <Submit pending={pending}>Update password</Submit>
    </form>
  );
}
