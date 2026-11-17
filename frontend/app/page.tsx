"use client";
import { useState } from "react";

export default function Home() {
  const [msg, setMsg] = useState("Abhi connect nahi hua");

  async function testBackend() {
    try {
      const res = await fetch("http://127.0.0.1:8000/health");
      const data = await res.json();
      setMsg(data.message);
    } catch {
      setMsg("Error: backend nahi mila. Backend chal raha hai?");
    }
  }

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">ListCraft AI</h1>
      <button
        onClick={testBackend}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
      >
        Backend Test Karo
      </button>
      <p className="mt-4 text-lg">{msg}</p>
    </main>
  );
}