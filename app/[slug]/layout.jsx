import ProfileHeader from "@/ui/profile/ProfileHeader";

export default function ProfileLayout({ children }) {
  return (
    <>
      <ProfileHeader />
      {children}
    </>
  );
}
