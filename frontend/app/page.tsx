import Link from "next/link";

export default function Home() {
  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">ListCraft AI</h1>
      <p className="mt-2">Ek photo se poori marketplace listing.</p>
      <div className="mt-6 flex gap-4">
        <Link href="/signup" className="rounded bg-blue-600 px-4 py-2 text-white">Signup</Link>
        <Link href="/login" className="rounded border px-4 py-2">Login</Link>
      </div>
    </main>
  );
}