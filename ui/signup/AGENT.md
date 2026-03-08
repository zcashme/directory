# /ui/signup - Profile Creation Form (Client)

## Purpose
Multi-step signup modal for creating a new Zcash profile. Calls server
actions in `/lib/signup/createProfileAction.ts`.

## User Flow
The user clicks "Join" in the header (or visits `/:username/refer` which
opens the modal automatically with the referrer pre-filled). The modal
walks through 6 steps:

1. **Username + Display Name** — username shows as `Zcash.me/username`,
   live-checks availability against verified profiles
2. **Zcash Address** — validates address type, blocks transparent/tex/viewing
   keys, checks if address is already taken
3. **Social Links** — add links from supported platforms (X, GitHub, Discord,
   etc.) or custom URLs. All start unverified
4. **City** — optional, autocomplete dropdown searching `city-timezones`
5. **Referrer** — optional, autocomplete search for existing profiles.
   Pre-filled when arriving via `/:username/refer` referral links
6. **Review + Submit** — summary of all fields, submits to server

On success, the user is redirected to their new profile page. The profile
is unverified until they complete the OTP/ZVS flow.

## Zcash Address Validation
`zcashAddress.ts` validates addresses client-side using `bech32`/`bech32m`/`bs58check`:
- **Unified (u1...)** — recommended, accepted
- **Sapling (zs1...)** — accepted
- **Transparent (t1.../t3...)** — valid but blocked during signup
- **TEX (tex1...)** — valid but blocked during signup
- **Viewing keys** — rejected with hint

## File → Feature Map

| File | Feature |
|------|---------|
| `AddUserForm.tsx` | The 6-step signup modal (all steps, validation, submit) |
| `ZcashAddressInput.tsx` | Zcash address input field with live validation hints |
| `zcashAddress.ts` | Client-side address validation (type detection, hints) |
| `SocialLinkInput.tsx` | Social platform selector + username/URL input |
| `LinkInput.tsx` | Generic link input field |
| `CitySearchDropdown.tsx` | City autocomplete dropdown (uses `searchCitiesAction`) |
| `StepContainer.tsx` | Animated step wrapper (Framer Motion transitions) |

## See Also
- `/lib/signup/AGENT.md` — server actions that this form calls
