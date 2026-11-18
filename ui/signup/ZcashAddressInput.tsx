import { isValidSignupAddress, SIGNUP_ADDRESS_ERROR } from "@/lib/signup/addressValidation";
import FormField from "@/ui/common/forms/FormField";
import { withFieldBorderState } from "@/ui/common/forms/styles";

interface ZcashAddressInputProps {
  value: string;
  onChange: (_value: string) => void;
  label?: string;
  id?: string;
  hasConflict?: boolean;
}

export default function ZcashAddressInput({
  value,
  onChange,
  label = "Zcash Address (shielded)",
  id = "zcash-address",
  hasConflict = false,
}: ZcashAddressInputProps) {
  const isValid = isValidSignupAddress(value);
  const help = !value.trim() ? "Enter your Unified Zcash address (u1…)." : isValid ? "Looks good — valid Unified address ✓" : SIGNUP_ADDRESS_ERROR;

  return (
    <FormField
      label={label}
      htmlFor={id}
      labelClassName="text-xs uppercase tracking-wide text-gray-600"
      className="mb-0"
    >
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="u1..."
        className={`w-full rounded-2xl border px-3 py-2 text-sm font-mono outline-hidden bg-transparent ${withFieldBorderState("border-black/30", hasConflict || !isValid)}`}
        autoComplete="off"
      />
      <p className={`mt-1 text-xs ${isValid ? "text-green-600" : value.trim() ? "text-red-600" : "text-gray-500"}`}>{help}</p>
    </FormField>
  );
}
