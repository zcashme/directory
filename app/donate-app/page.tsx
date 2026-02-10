"use client";

import ProfileHeader from "@/ui/profile/ProfileHeader";
import DonatePage from "./DonatePage";

export default function DonateAppPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <ProfileHeader profileCount={0} />

      <div className="pt-24 pb-12 px-4">
        <DonatePage />
      </div>
    </div>
  );
}
