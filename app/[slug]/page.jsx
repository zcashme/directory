import ProfilePage from "./ProfilePage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }) {
  return <ProfilePage params={params} />;
}
