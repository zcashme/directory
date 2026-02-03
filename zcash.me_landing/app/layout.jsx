import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Zcash.me",
  description: "Zcash.me directory and profiles.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
