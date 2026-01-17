# Zcash Address Directory – Frontend

A React + Vite web application that serves as the **frontend for the Zcash Address Directory**.  
This project provides a simple, fast, and modern interface for browsing and interacting with Zcash addresses.

---

## 🚀 Tech Stack

- [React](https://reactjs.org/) – UI library  
- [Vite](https://vitejs.dev/) – build tool and dev server  
- [JavaScript / JSX](https://developer.mozilla.org/en-US/docs/Web/JavaScript)  

---

## 📦 Installation

Clone the repository and install dependencies:

```powershell
git clone https://github.com/ZcashUsersGroup/zcashme
cd zcashme
npm install
````

---

## 🛠 Development

Start the local development server:

```powershell
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📑 Build for Production

```powershell
npm run build
```

The compiled output will be in the `dist/` directory.

---

## 📂 Project Structure

```
zcashme/
├── public/          # Static assets
├── src/             # React components, pages, and styles
├── index.html       # Entry point
├── vite.config.js   # Vite configuration
├── package.json     # Dependencies and scripts
```

---

## 🤝 Contributing

## Social Links

Social links flow through three stages that share the same handle normalization rules.
Known platforms use `normalizeSocialUsername` (quotes/backslashes stripped, whitespace trimmed,
platform URL prefixes removed). Discord remains special-cased (IDs/labels).

- AddUserForm: link inserts set `zcasher_links.label` to the normalized handle for known platforms (except Discord).
- ProfileEditor: edits are staged in `pending_zcasher_edits.links` until OTP confirmation.
- Supabase OTP: `confirm_otp_sql` applies link edits/inserts and uses `public.extract_label(url)` to set `zcasher_links.label`.
- ProfileCard display: uses `getSocialHandle` (via `linkUtils`) to render handles from URLs.

To keep labels consistent everywhere, align `public.extract_label` with the same normalization
rules used in the frontend.

---

Pull requests are welcome!
For major changes, please open an issue first to discuss what you’d like to change.

---

## 📜 License

MIT License © 2025 Zcash Users Group
