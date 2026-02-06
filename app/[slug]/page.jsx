import ProfilePage from "./ProfilePage";

// Removed force-dynamic - this component does no server-side data fetching
// All data is fetched client-side in ProfilePage via useEffect

export default async function Page({ params }) {
  return <ProfilePage params={params} />;
}
