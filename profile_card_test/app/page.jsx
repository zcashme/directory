import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Profile Card Test</h1>
      <p className="text-gray-500">Visit a profile to see the card:</p>
      <div className="flex gap-3">
        <Link href="/aisha" className="text-blue-600 hover:underline">/aisha</Link>
        <Link href="/blazeyoru" className="text-blue-600 hover:underline">/blazeyoru</Link>
      </div>
    </main>
  );
}
