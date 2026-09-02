"use client";

import Button from "@/ui/common/buttons/Button";
import { emitNavigationProgressStart } from "@/lib/navigation/navigationProgress";

type InvestPasswordFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  invalidPassword: boolean;
};

export default function InvestPasswordForm({ action, invalidPassword }: InvestPasswordFormProps) {
  return (
    <form action={action} className="invest-password-form" onSubmit={emitNavigationProgressStart}>
      <label htmlFor="invest-password">Access password</label>
      <input id="invest-password" name="password" type="password" autoComplete="current-password" required autoFocus />
      {invalidPassword ? <p className="invest-form-error" role="alert">That password was not recognized.</p> : null}
      <Button type="submit" variant="primary" size="md">Open brief</Button>
    </form>
  );
}
