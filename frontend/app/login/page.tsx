"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="mx-auto mt-20 max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Login</h1>
      <input
        className="mb-3 w-full rounded border p-2 text-black"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="mb-3 w-full rounded border p-2 text-black"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        className="w-full rounded bg-blue-600 p-2 text-white"
      >
        Login
      </button>
      {error && <p className="mt-3 text-red-500">{error}</p>}
      <p className="mt-4 text-sm">
        Account nahi hai? <Link href="/signup" className="text-blue-500">Signup</Link>
      </p>
    </main>
  );
}