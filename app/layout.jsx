import "./globals.css";

export const metadata = {
  title: "Zcash.me",
  description: "Zcash.me directory and profiles.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        {children}
      </body>
    </html>
  );
}
