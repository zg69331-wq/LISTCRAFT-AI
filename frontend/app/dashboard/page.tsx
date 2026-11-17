"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      <p className="mt-2">Login kamyab! Yahan baad mein modules aayenge.</p>
      <button onClick={logout} className="mt-4 rounded bg-red-600 px-4 py-2 text-white">
        Logout
      </button>
    </main>
  );
}