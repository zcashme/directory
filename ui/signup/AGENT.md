# /ui/signup - Profile Creation Form (Client)

## Purpose
Multi-step signup modal for creating a new Zcash profile. Calls server
actions in `/lib/signup/createProfileAction.ts`.

## User Flow
The user clicks "Join" in the header. The modal
walks through 5 steps:

1. **Username + Display Name** — username shows as `Zcash.me/username`,
   live-checks protected names, Zcash Names SDK ownership, waitlist count, and verified zcashers profiles.
   New usernames are lowercase letters and numbers only (1–62).
2. **Zcash Address** — accepts only valid Unified addresses; blocks transparent,
   Sapling, TEX, and viewing keys. Multiple profiles and ZNS names may share a UA.
3. **Social Links** — add links from supported platforms (X, GitHub, Discord,
   etc.) or custom URLs. All start unverified
4. **City** — optional, autocomplete dropdown searching `city-timezones`
5. **Review + Submit** — summary of all fields, submits to server.

On success, the user is redirected to their new profile page. The profile
is unverified until they complete the OTP/ZVS flow.

## Zcash Address Validation
`lib/signup/addressValidation.ts` uses the SDK's Unified address checksum and length
validation in both the form and the profile-creation server action. The broader
`zcashAddress.ts` validator is still shared by profile editing and swaps:
- **Unified (u1...)** — recommended, accepted
- **Sapling (zs1...)** — blocked during signup
- **Transparent (t1.../t3...)** — valid but blocked during signup
- **TEX (tex1...)** — valid but blocked during signup
- **Viewing keys** — rejected with hint

## File → Feature Map

| File | Feature |
|------|---------|
| `AddUserForm.tsx` | The 5-step signup modal (all steps, validation, submit) |
| `ZcashAddressInput.tsx` | Zcash address input field with live validation hints |
| `zcashAddress.ts` | Client-side address validation (type detection, hints) |
| `SocialLinkInput.tsx` | Social platform selector + username/URL input |
| `LinkInput.tsx` | Generic link input field |
| `CitySearchDropdown.tsx` | City autocomplete dropdown (uses `searchCitiesAction`) |
| `StepContainer.tsx` | Animated step wrapper (Framer Motion transitions) |

## See Also
- `/lib/signup/AGENT.md` — server actions that this form calls
