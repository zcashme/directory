import "./globals.css";
import Providers from "@/app/providers";

export const metadata = {
  title: "Profile Card Test",
  description: "Design playground for zcash.me profile card",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
