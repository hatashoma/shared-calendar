"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();

  const handleSignUp = async () => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      router.push("/"); // ホームにリダイレクト
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto space-y-3">
      <h1 className="text-2xl font-bold mb-4">新規登録</h1>

      <input
        type="text"
        placeholder="名前"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="border p-2 w-full"
      />
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
        onClick={handleSignUp}
        className="bg-green-500 text-white px-4 py-2 rounded w-full"
      >
        登録
      </button>

      <p className="mt-2 text-sm">
        ログインは <a href="/login" className="text-blue-500">こちら</a>
      </p>
    </div>
  );
}
