"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  if (!ready) return null;

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2">Login kamyab! Yahan se modules chalao.</p>

      <Link
        href="/generate"
        className="mt-4 mr-3 inline-block rounded bg-blue-600 px-4 py-2 text-white"
      >
        Listing Generator
      </Link>

      <button
        onClick={logout}
        className="mt-4 rounded bg-red-600 px-4 py-2 text-white"
      >
        Logout
      </button>
    </main>
  );
}
