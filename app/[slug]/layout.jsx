import ProfileHeader from "../../src/components/ProfileHeader";

export default function ProfileLayout({ children }) {
  return (
    <>
      <ProfileHeader />
      {children}
    </>
  );
}
