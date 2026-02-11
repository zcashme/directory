import ProfileHeader from "@/ui/profile/ProfileHeader";

export default function SwapAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ProfileHeader />
      <div
        className="p-4 md:p-8 pt-16"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </div>
    </>
  );
}
