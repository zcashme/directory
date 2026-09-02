import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InvestDocument from "./InvestDocument";
import { authenticateInvestPassword, getInvestSession } from "@/lib/invest/auth";
import { getInvestDocument } from "@/lib/invest/document";
import InvestPasswordForm from "./InvestPasswordForm";
import "./invest.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Investor Brief | ZcashMe",
  robots: { index: false, follow: false },
};

type InvestPageProps = {
  searchParams: Promise<{ error?: string }>;
};

async function unlockInvest(formData: FormData) {
  "use server";

  const password = formData.get("password");
  const validPassword = typeof password === "string" && await authenticateInvestPassword(password);
  redirect(validPassword ? "/invest" : "/invest?error=invalid");
}

function PasswordGate({ invalidPassword }: { invalidPassword: boolean }) {
  return (
    <main className="invest-gate-shell">
      <section className="invest-gate" aria-labelledby="invest-gate-title">
        <img className="invest-gate-logo" src="/assets/icons/zcashme-logo.svg" alt="ZcashMe" />
        <p className="invest-eyebrow">ZcashMe / Confidential</p>
        <h1 id="invest-gate-title">Investor brief</h1>
        <p>This material is available to invited recipients only.</p>
        <InvestPasswordForm action={unlockInvest} invalidPassword={invalidPassword} />
      </section>
    </main>
  );
}

export default async function InvestPage({ searchParams }: InvestPageProps) {
  const [{ error }, session] = await Promise.all([searchParams, getInvestSession()]);
  if (!session) return <PasswordGate invalidPassword={error === "invalid"} />;

  const document = await getInvestDocument();
  if (!document) {
    return (
      <main className="invest-gate-shell">
        <section className="invest-gate">
          <p className="invest-eyebrow">ZcashMe / Confidential</p>
          <h1>Brief unavailable</h1>
          <p>The investor document has not been published yet. Please contact the sender.</p>
        </section>
      </main>
    );
  }

  return <InvestDocument document={document} />;
}
