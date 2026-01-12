import Directory from "../src/Directory";
import { fetchProfilesWithRanks } from "../lib/profiles";
import { fetchLeaderboard, fetchStatsData } from "../lib/stats";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [profiles, statsBase, ranked] = await Promise.all([
    fetchProfilesWithRanks(),
    fetchStatsData(),
    fetchLeaderboard("weekly", 10),
  ]);

  const initialStats = {
    ...statsBase,
    ranked,
  };

  return (
    <Directory
      initialProfiles={profiles}
      initialSelectedAddress={null}
      initialShowDirectory
      initialStats={initialStats}
    />
  );
}
