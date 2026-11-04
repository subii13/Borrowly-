"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { ActionResult } from "@/lib/errors";
import { Button } from "./button";

type Props = {
  action: (input?: string) => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "light";
  size?: "sm" | "md" | "lg";
  confirm?: string;
  /** Ask for a reason/note before running; the text is passed to the action. */
  prompt?: { label: string; required?: boolean; placeholder?: string };
  success?: string;
  redirectTo?: string;
  className?: string;
};

/** Runs a bound server action with confirmation, pending state, toast feedback and refresh. */
export function ActionButton({ action, children, variant = "primary", size = "sm", confirm, prompt, success, redirectTo, className }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const run = (input?: string) =>
    start(async () => {
      const r = await action(input);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setOpen(false);
      setText("");
      toast.success(r.message ?? success ?? "Done");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });

  const onClick = () => {
    if (prompt) return setOpen(true);
    if (confirm && !window.confirm(confirm)) return;
    run();
  };

  return (
    <>
      <Button type="button" variant={variant} size={size} disabled={pending} onClick={onClick} className={className}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </Button>
      {open && prompt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <label className="label" htmlFor="action-prompt">{prompt.label}</label>
            <textarea id="action-prompt" className="input min-h-24" placeholder={prompt.placeholder} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant={variant} size="sm" disabled={pending || (prompt.required && text.trim().length < 3)} onClick={() => run(text)}>
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {children}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
