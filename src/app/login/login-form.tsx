"use client";

import { FormError, FormField, Input, SubmitButton, useFormAction } from "@/components/form-ui";
import { signIn } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const { state, onSubmit, onInput, err, pending } = useFormAction(signIn);
  return (
    <form onSubmit={onSubmit} onInput={onInput} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormError state={state} />
      <FormField label="Email" error={err("email")}>
        <Input type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" error={err("email")} />
      </FormField>
      <FormField label="Password" error={err("password")}>
        <Input type="password" name="password" autoComplete="current-password" error={err("password")} />
      </FormField>
      <SubmitButton pending={pending} className="w-full">
        Log in · Log masuk
      </SubmitButton>
    </form>
  );
}
