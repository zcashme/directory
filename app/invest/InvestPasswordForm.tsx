"use client";

import { useState } from "react";
import Button from "@/ui/common/buttons/Button";
import { emitNavigationProgressStart } from "@/lib/navigation/navigationProgress";

type InvestPasswordFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  invalidPassword: boolean;
};

export default function InvestPasswordForm({ action, invalidPassword }: InvestPasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      action={action}
      className="invest-password-form"
      onSubmit={() => {
        setIsSubmitting(true);
        emitNavigationProgressStart();
      }}
    >
      <label htmlFor="invest-password">Access password</label>
      <input id="invest-password" name="password" type="password" autoComplete="current-password" required autoFocus disabled={isSubmitting} />
      {invalidPassword ? <p className="invest-form-error" role="alert">That password was not recognized.</p> : null}
      <Button type="submit" variant="primary" size="md" loading={isSubmitting}>
        {isSubmitting ? <><span className="invest-button-spinner" aria-hidden="true" />Opening brief...</> : "Open brief"}
      </Button>
    </form>
  );
}
