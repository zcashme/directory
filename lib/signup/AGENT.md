# /lib/signup - Profile Creation (Server)

## Purpose
Server actions that handle profile creation. Called by the signup form
in `/ui/signup/AddUserForm.tsx`.

## User Flow
When a user fills out the signup modal and hits "Add Name", this is what
runs on the server:

1. Validates username is not taken by a verified profile
2. Validates Zcash address is not already associated with another profile
3. Inserts a row into the `zcasher` table (profile starts unverified)
4. Inserts links into `zcasher_links` (all start unverified)
5. Returns the new profile — the client redirects to `/:slug`

The user must separately verify via the OTP/ZVS flow (`/lib/verification`)
to become a verified profile.

## Real-Time Validation
The signup form calls these server actions as the user types, before submit:
- `checkUsernameAvailabilityAction` — is this username taken? by a verified profile?
- `checkAddressTakenAction` — is this Zcash address already in use?

## Database
- `zcasher` — profile row (name, display_name, address, nearest_city_name, referred_by)
- `zcasher_links` — one row per link (url, label, platform, is_verified=false)

## File → Feature Map

| File | Feature |
|------|---------|
| `createProfileAction.ts` | Server actions: createProfile, insertLinks, checkUsername, checkAddress |
| `createProfile.ts` | Core DB operations: insert into `zcasher` and `zcasher_links` |

## See Also
- `/ui/signup/AGENT.md` — the 6-step form UI that calls these actions
