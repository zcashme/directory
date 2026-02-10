<p align="center">
  <a href="https://zcash.me">
    <h1 align="center">zcash.me</h1>
  </a>
  <p align="center">
    The open-source Zcash address directory.
    <br />
    <a href="https://zcash.me"><strong>Visit zcash.me »</strong></a>
    <br />
    <br />
    <a href="https://zcash.me">Directory</a>
  </p>
</p>

## About the Project

<p align="center">
  <strong>A public directory for Zcash addresses — find anyone, share your address, get paid.</strong>
</p>

Sending Zcash to someone shouldn't require copying long addresses from chat messages. zcash.me gives every Zcash user a short, shareable profile page with a QR code — like a phone book for shielded payments.

Register your address, share `zcash.me/yourname`, and anyone can send you ZEC. No account required. No tracking. Fully open source.

### Features

- Browse and search the full directory of Zcash addresses
- Shareable profile pages with QR codes (`zcash.me/yourname`)
- Verify address ownership via one-time passcode (OTP)
- Edit your profile and add social links after verification
- Network School directory at [`/ns`](https://zcash.me/ns)
- Privacy-first — no analytics, no cookies, no tracking

## Contributing

Contributions are welcome. For major changes, please [open an issue](https://github.com/zcashme/directory/issues) first to discuss what you'd like to change.

## License

MIT License © 2025 Zcash Users Group

---

## Backend (ZVS) Deployment Note

The Zcash Verification Service backend is deployed separately on an Azure VM and is not part of this frontend repo.
Local development uses a NEXT_PUBLIC_VERIFY_API_URL env var to point at the VM API, and the Vercel project is configured
with the same variable for production.

