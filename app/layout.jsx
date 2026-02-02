import "./globals.css";

export const metadata = {
  title: "Zcash.me",
  description: "Zcash.me directory and profiles.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
