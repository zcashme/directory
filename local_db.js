export const testUser = {
  id: "test-user-001",
  name: "domusgratiae",
  address: "u1hvyvnp3j4fmlwtxnc3asfx0wdkeyznfplw2qmdvrgyme",
  bio: "Zcash enthusiast and developer.",
  profile_image_url: "https://pbs.twimg.com/profile_images/1614723078427435008/V9X_4V3__400x400.jpg",
  created_at: new Date().toISOString(),
  last_signed_at: new Date().toISOString(),
  address_verified: false,
  verified_links_count: 0,
  links: [
    {
      id: "link-001",
      url: "https://x.com/domusgratiae",
      is_verified: false,
      verification_expires_at: null
    }
  ],
  // Rank placeholders
  rank_alltime: 0,
  rank_weekly: 0,
  rank_monthly: 0,
  rank_daily: 0
};

export const localDb = {
  zcasher_with_referral_rank: [testUser],
  zcasher_links: testUser.links,
  // Tables needed for leaderboard queries (empty for now)
  referrer_ranked_alltime: [],
  referrer_ranked_weekly: [],
  referrer_ranked_monthly: []
};
