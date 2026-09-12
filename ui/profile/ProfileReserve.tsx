"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { Profile } from "@/lib/profile/types";
import Button from "@/ui/common/buttons/Button";
import { normalizeZnsName } from "@/lib/zns/name";

const CLAIM_PRICE_ROWS = [
  { minLength: 6, maxLength: 62, length: "6–62 characters", yearly: "$20/year", once: "$60", onceValue: 60 },
  { minLength: 5, maxLength: 5, length: "5 characters", yearly: "$100/year", once: "$300", onceValue: 300 },
  { minLength: 4, maxLength: 4, length: "4 characters", yearly: "$400/year", once: "$1,200", onceValue: 1200 },
  { minLength: 3, maxLength: 3, length: "3 characters", yearly: "$800/year", once: "$2,400", onceValue: 2400 },
  { minLength: 2, maxLength: 2, length: "2 characters", yearly: "$2,500/year", once: "$7,500", onceValue: 7500 },
  { minLength: 1, maxLength: 1, length: "1 character", yearly: "$10,000/year", once: "$30,000", onceValue: 30000 },
] as const;

const CLAIM_PRICES = [...CLAIM_PRICE_ROWS].sort((a, b) => a.onceValue - b.onceValue);

const BENEFIT_TOGGLE_CLASS =
  "inline cursor-pointer border-0 bg-transparent p-0 font-bold text-[var(--color-brand-blue)] hover:underline";

const ZCASH_WALLET_APPS = [
  "Cake",
  "Edge",
  "Zingo",
  "Noir",
  "Zucchini",
  "CYZE",
  "Unstoppable",
  "and more...",
] as const;

const ZCASH_APP_LOGINS = ["PGPZ", "ZEC-OS", "Zecmarket (TBA)", "and more..."] as const;

function CollapsiblePriceCell({
  open,
  dur,
  align = "left",
  children,
}: {
  open: boolean;
  dur: string;
  align?: "left" | "right";
  children: string;
}) {
  return (
    <td
      className={`overflow-hidden px-3 align-top transition-[padding] ${dur} ${
        open ? "py-2" : "py-0"
      } ${align === "right" ? "text-right" : "text-left"}`}
    >
      <div
        className={`grid transition-[grid-template-rows] ${dur} ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className={`min-h-0 overflow-hidden ${open ? "opacity-100" : "opacity-0"}`}>
          {children}
        </div>
      </div>
    </td>
  );
}

function ExpandableSublist({
  open,
  dur,
  items,
}: {
  open: boolean;
  dur: string;
  items: readonly string[];
}) {
  return (
    <div
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity,margin] ${dur} ${
        open ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 mt-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function abbreviateAlphanumeric(value: string): string {
  const alnum = (value || "").replace(/[^A-Za-z0-9]/g, "");
  if (!alnum) return "";
  if (alnum.length <= 12) return alnum;
  return `${alnum.slice(0, 6)}...${alnum.slice(-6)}`;
}

interface ProfileReserveProps {
  profile: Profile;
  waitlistPosition?: number;
  onStartReservation?: () => void;
  isReservationGenerating?: boolean;
  reserved?: boolean;
  started?: boolean;
  priority?: boolean;
  referralCode?: string;
  error?: string;
}

export default function ProfileReserve({
  profile,
  waitlistPosition = 1,
  onStartReservation,
  isReservationGenerating = false,
  reserved = false,
  started = false,
  priority = false,
  referralCode = "",
  error = "",
}: ProfileReserveProps) {
  const shouldReduceMotion = useReducedMotion();
  const [pricesExpanded, setPricesExpanded] = useState(false);
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [walletsOpen, setWalletsOpen] = useState(false);
  const [appLoginsOpen, setAppLoginsOpen] = useState(false);
  const name = normalizeZnsName(profile.name || "");
  const nameLength = name.length;
  const username = name || "username";
  const zcasherId = profile.id;
  const dur = shouldReduceMotion ? "duration-100" : "duration-300 ease-in-out";
  const normalizedReferralCode = referralCode.trim();

  const togglePrices = () => {
    if (pricesExpanded) {
      setPricesExpanded(false);
      return;
    }
    setBenefitsOpen(false);
    setPricesExpanded(true);
  };

  const toggleBenefits = () => {
    if (benefitsOpen) {
      setBenefitsOpen(false);
      return;
    }
    setPricesExpanded(false);
    setBenefitsOpen(true);
  };

  const toggleWallets = () => {
    if (walletsOpen) {
      setWalletsOpen(false);
      return;
    }
    setAppLoginsOpen(false);
    setWalletsOpen(true);
  };

  const toggleAppLogins = () => {
    if (appLoginsOpen) {
      setAppLoginsOpen(false);
      return;
    }
    setWalletsOpen(false);
    setAppLoginsOpen(true);
  };

  if (priority) {
    const referralUrl = normalizedReferralCode
      ? `https://www.zcashnames.com/sharekit?ref=${encodeURIComponent(normalizedReferralCode)}`
      : "";
    const leadersRefUrl = normalizedReferralCode
      ? `https://zcashnames.com/leaders/ref/${encodeURIComponent(normalizedReferralCode)}`
      : "";

    return (
      <div className="w-full text-left text-sm text-gray-800">
        <h2 className="text-center text-lg font-semibold">{username} is protected</h2>
        <p className="mt-3 text-gray-600">
          Because you verified your Zcash.me profile before May 2026, no reservation is needed.
        </p>
        <p className="mt-3 text-gray-600">
          We&apos;ll send an access code to your shielded address before Early Access.
        </p>
        <p className="mt-3 text-gray-600">
          Use the code to claim your Zcash Name on-chain before others can.
        </p>
        {referralUrl && leadersRefUrl ? (
        <p className="mt-3 text-gray-600">
          In the meantime,{" "}
          <a
            href={referralUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[var(--color-brand-blue)] hover:underline"
          >
            share your referral link
          </a>{" "}
          to{" "}
          <a
            href={leadersRefUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[var(--color-brand-blue)] hover:underline"
          >
            earn ZEC
          </a>{" "}
          when your referrals claim their Zcash Name.
        </p>
        ) : null}
      </div>
    );
  }

  if (reserved) {
    const abbreviatedAddress = abbreviateAlphanumeric(profile.address || "");
    const waitlistUrl = `https://zcashnames.com/waitlist/view?search=${encodeURIComponent(username)}`;
    const referralUrl = normalizedReferralCode
      ? `https://www.zcashnames.com/sharekit?ref=${encodeURIComponent(normalizedReferralCode)}`
      : "";
    const leadersRefUrl = normalizedReferralCode
      ? `https://zcashnames.com/leaders/ref/${encodeURIComponent(normalizedReferralCode)}`
      : "";
    return (
      <div className="w-full text-left text-sm text-gray-800">
        <h2 className="text-center text-lg font-semibold">
          You&apos;re #{waitlistPosition} in line for {username}
        </h2>
        <p className="mt-3 text-gray-600">
          Your reservation is confirmed.{" "}
          <a
            href={waitlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[var(--color-brand-blue)] hover:underline"
          >
            View waitlist
          </a>
        </p>
        <p className="mt-3 text-gray-600">
          When Early Access begins, we&apos;ll send an access code by shielded memo to the address on this profile
          {abbreviatedAddress ? ` ${abbreviatedAddress}` : ""}, in waitlist order.
        </p>
        <p className="mt-3 text-gray-600">
          When you receive your code, use it to claim <span className="font-bold">{username}</span> on-chain before
          the people behind you in line.
        </p>
        <p className="mt-3 text-gray-600">
          {referralUrl ? (
            <a
              href={referralUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[var(--color-brand-blue)] hover:underline"
            >
              Share your referral link
            </a>
          ) : (
            <span className="font-bold">share your referral link</span>
          )}{" "}
          to{" "}
          {leadersRefUrl ? (
            <a
              href={leadersRefUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[var(--color-brand-blue)] hover:underline"
            >
              earn ZEC
            </a>
          ) : (
            <span className="font-bold">earn ZEC</span>
          )}{" "}
          when your referrals claim their Zcash Name, too.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full text-left text-sm text-gray-800">
      <h2 className="text-center text-lg font-semibold">Reserve {name || "this name"}</h2>
      <p className="mt-2 text-gray-600">
        You could be #{waitlistPosition} in line for this Zcash Name.
      </p>
      <p className="mt-3 text-gray-600">
        Reserve to receive a code before Early Access begins.
        Use your code to purchase the Zcash Name on-chain before others get a chance.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-expanded={pricesExpanded}
        aria-label={pricesExpanded ? "Collapse claim prices" : "Expand claim prices"}
        onClick={togglePrices}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            togglePrices();
          }
        }}
        className="mt-4 cursor-pointer select-none overflow-hidden rounded-xl border border-black/10"
      >
        <table className="w-full table-fixed text-xs pointer-events-none">
          <colgroup>
            <col className="w-[40%]" />
            <col className="w-[35%]" />
            <col className="w-[25%]" />
          </colgroup>
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-1">
                  Name length
                  <span
                    aria-hidden
                    className={`inline-block text-[10px] transition-transform ${dur} ${pricesExpanded ? "rotate-180" : "rotate-0"}`}
                  >
                    {"\u25BE"}
                  </span>
                </span>
              </th>
              <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Yearly</th>
              <th className="px-3 py-2 text-right font-medium whitespace-nowrap">One-time</th>
            </tr>
          </thead>
          <tbody>
            {CLAIM_PRICES.map((row) => {
              const highlighted = nameLength >= row.minLength && nameLength <= row.maxLength;
              const open = pricesExpanded || highlighted;
              return (
                <tr
                  key={row.length}
                  aria-hidden={!open}
                  aria-current={highlighted ? "true" : undefined}
                  className={`${open ? "border-t border-black/5" : "border-t border-transparent"} ${
                    highlighted
                      ? "bg-[var(--color-brand-blue)]/10 font-semibold text-[var(--color-brand-blue)]"
                      : ""
                  }`}
                >
                  <CollapsiblePriceCell open={open} dur={dur}>
                    {row.length}
                  </CollapsiblePriceCell>
                  <CollapsiblePriceCell open={open} dur={dur} align="right">
                    {row.yearly}
                  </CollapsiblePriceCell>
                  <CollapsiblePriceCell open={open} dur={dur} align="right">
                    {row.once}
                  </CollapsiblePriceCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        The table shows the price to claim your name during Early Access. A reservation is a smaller payment plus a memo that holds your place in line.
      </p>

      <div
        aria-hidden={!benefitsOpen}
        className={`grid transition-[grid-template-rows,opacity,margin] ${dur} ${
          benefitsOpen ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-black/10 pt-4">
          <ul className="list-disc space-y-1.5 break-words pl-5 text-sm text-gray-800">
            <li>
              Share <span className="font-bold">Zcash.me/{username}</span> instead of{" "}
              <span className="font-bold">Zcash.me/{username}-{zcasherId}</span>
            </li>
            <li>
              Use your{" "}
              <button
                type="button"
                className={BENEFIT_TOGGLE_CLASS}
                aria-expanded={walletsOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleWallets();
                }}
              >
                name in Zcash wallets
              </button>
              <ExpandableSublist open={walletsOpen} dur={dur} items={ZCASH_WALLET_APPS} />
            </li>
            <li>
              People can <span className="font-bold"> check your profile</span> before sending to your Zcash Name in wallets
            </li>
            <li>
              Customize your profile with{" "}
              <span className="font-bold">card colors, backgrounds, and patterns</span>
            </li>
            <li>
              <span className="font-bold">Login with ZNS</span> and edit your profile without OTP verification
            </li>
            <li>
              Get a <span className="font-bold">Zcash Names badge</span> next to your display name
            </li>
            <li>
              Coming soon:{" "}
              <span className="font-bold">
                subnames, multiple currencies,{" "}
                <button
                  type="button"
                  className={BENEFIT_TOGGLE_CLASS}
                  aria-expanded={appLoginsOpen}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleAppLogins();
                  }}
                >
                  login with ZNS
                </button>
              </span>
              , and more
              <ExpandableSublist open={appLoginsOpen} dur={dur} items={ZCASH_APP_LOGINS} />
            </li>
          </ul>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={toggleBenefits}
        aria-expanded={benefitsOpen}
        className={`${benefitsOpen ? "mt-4" : "mt-8"} block w-full text-center font-normal text-[var(--color-brand-blue)] hover:underline`}
      >
        {benefitsOpen ? "Hide Benefits" : "See Benefits"}
      </button>

      <div className="mt-8 pt-4 border-t border-black/10">
        {started ? (
          <p className="text-center text-sm text-gray-600">
            Scan the QR below to send the payment and memo.
          </p>
        ) : (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                if (!name || isReservationGenerating) return;
                onStartReservation?.();
              }}
              disabled={!name || isReservationGenerating}
              className={`relative overflow-hidden rounded-xl hover:border-[var(--color-brand-blue)] ${
                isReservationGenerating ? "text-white border-[var(--color-brand-blue)] bg-white" : "hover:text-[var(--color-brand-blue)]"
              }`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-[var(--color-brand-blue)] transition-[height] duration-500 ease-out"
                style={{ height: isReservationGenerating ? "100%" : "0%" }}
              />
              <span className="relative z-10 font-semibold">
                Start Reservation
              </span>
            </Button>
          </div>
        )}
        {error ? <p className="mt-2 text-center text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
