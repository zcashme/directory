# /lib/directory - Profile Discovery

## Purpose
Search, discovery, and featured profile logic for the zcash.me directory.
Powers the homepage carousel, header search bar, signup city dropdown, and NS directory.

## Database
Queries the `zcasher_searchable` table (denormalized, optimized for search)
and `zcasher_links` for profile links.

## Homepage Carousel
When a user lands on zcash.me, the first thing they see is a fanned
carousel of profile cards with a typewriter headline that cycles through
featured users: "The easiest way to Zcash [name]". On desktop the cards
fan out with 3D tilt on hover; on mobile they stack and swipe.

The profiles shown are randomly selected from those flagged `featured=true`
in the `zcasher_searchable` table. Each card shows the user's avatar,
display name, bio, Zcash address, and verified links. Clicking any card
navigates to that user's profile page.

## Directory Search
The header contains a search bar available on every page. As the user
types, it searches profiles by username, display name, and links. Results
are case-insensitive and space-insensitive ("alice z" matches "alicez").
Results paginate via cursor for infinite scroll.

## City Search (Signup)
During profile creation, users can optionally pick a city. The dropdown
searches the `city-timezones` npm package as they type, returning up to
20 matching cities with country and province info.

## Network School Directory
The `/ns` page shows a filtered view of profiles who are Network School
members, filtered by `is_ns`, `is_ns_core`, and `is_ns_longterm` flags.

## File → Feature Map

| File | Feature |
|------|---------|
| `fetchFeaturedProfiles.server.ts` | Homepage carousel — queries featured profiles + links from Supabase |
| `directoryClient.ts` | Directory search — response types for `/api/directory` + `toProfile()` transform |
| `searchCitiesAction.ts` | City search — server action powering the signup city dropdown |
| `getNsProfilesAction.ts` | NS directory — server action fetching Network School profiles |
