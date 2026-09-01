# Private Investor Brief

`/invest` is a server-gated route. The investor document and password hashes live only in Supabase; neither should be added to this repository.

## Deployment setup

1. Run [20260901_invest_access.sql](database/20260901_invest_access.sql) in the Supabase SQL editor.
2. Set `SUPABASE_SERVICE_KEY` in the Vercel project. The route requires the service role because the tables are RLS-protected.
3. Set `INVEST_SESSION_SECRET` to a random value of at least 32 characters. On PowerShell, run `$bytes = New-Object byte[] 48; $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($bytes); [Convert]::ToBase64String($bytes)`. On systems with OpenSSL, `openssl rand -base64 48` also works.
4. Insert a separate row in `invest_access_passwords` for every recipient. Use a meaningful `label`; reporting joins events to that label.
5. Insert or update the `invest` row in `invest_documents`, then set `is_published` to `true`.

The database function logs a successful event with `password_id`, timestamp, IP address, and user agent. It never stores the submitted password. Revoking a password means setting `is_active` to `false` or setting `revoked_at`.

The page's **Download as PDF** control opens the browser print dialog. The print stylesheet is sized for US Letter; users can select "Save as PDF" there. Browser screenshots and downloaded PDFs cannot be prevented after a recipient is authorized.
