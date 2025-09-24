"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // メールログイン
  const handleEmailLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/"); // ホームにリダイレクト
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  // Googleログイン
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto space-y-3">
      <h1 className="text-2xl font-bold mb-4">ログイン</h1>

      <button
        onClick={handleGoogleLogin}
        className="bg-blue-500 text-white px-4 py-2 rounded w-full"
      >
        Googleでログイン
      </button>

      <div className="border-t my-2"></div>

      <input
        type="email"
        placeholder="メール"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 w-full"
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 w-full"
      />
      <button
        onClick={handleEmailLogin}
        className="bg-gray-500 text-white px-4 py-2 rounded w-full"
      >
        ログイン
      </button>

      <p className="mt-2 text-sm">
        新規登録は <a href="/signup" className="text-blue-500">こちら</a>
      </p>
    </div>
  );
}
