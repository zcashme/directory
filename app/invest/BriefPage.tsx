import { redirect } from "next/navigation";
import InvestDocument from "./InvestDocument";
import InvestPasswordForm from "./InvestPasswordForm";
import { authenticateInvestPassword, getInvestSession } from "@/lib/invest/auth";
import { getInvestDocument } from "@/lib/invest/document";

type BriefRoute = "/brief" | "/invest";

type BriefPageProps = {
  route: BriefRoute;
  searchParams: Promise<{ error?: string }>;
};

async function unlockBrief(route: BriefRoute, formData: FormData) {
  "use server";

  const password = formData.get("password");
  const validPassword = typeof password === "string" && await authenticateInvestPassword(password);
  redirect(validPassword ? route : `${route}?error=invalid`);
}

function PasswordGate({ invalidPassword, route }: { invalidPassword: boolean; route: BriefRoute }) {
  const unlockForRoute = unlockBrief.bind(null, route);

  return (
    <main className="invest-gate-shell">
      <section className="invest-gate" aria-labelledby="invest-gate-title">
        <img className="invest-gate-logo" src="/assets/icons/zcashme-logo.svg" alt="ZcashMe" />
        <p className="invest-eyebrow">ZcashMe, Inc / Confidential</p>
        <h1 id="invest-gate-title">Company brief</h1>
        <p>This material is available to invited recipients only.</p>
        <InvestPasswordForm action={unlockForRoute} invalidPassword={invalidPassword} />
      </section>
    </main>
  );
}

export default async function BriefPage({ route, searchParams }: BriefPageProps) {
  const [{ error }, session] = await Promise.all([searchParams, getInvestSession()]);
  if (!session) return <PasswordGate route={route} invalidPassword={error === "invalid"} />;

  const document = await getInvestDocument();
  if (!document) {
    return (
      <main className="invest-gate-shell">
        <section className="invest-gate">
          <p className="invest-eyebrow">ZcashMe / Confidential</p>
          <h1>Brief unavailable</h1>
          <p>The company brief has not been published yet. Please contact the sender.</p>
        </section>
      </main>
    );
  }

  return <InvestDocument document={document} />;
}
