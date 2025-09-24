"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function Home() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [selectedDate, setSelectedDate] = useState(null); // 🔹 クリックした日付

  // 🔹 ログイン
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error) {
      console.error(error);
    }
  };

  // 🔹 ログアウト
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // 🔹 Firestoreに追加
  const addEvent = async (eventTitle, eventDate) => {
    try {
      await addDoc(collection(db, "events"), {
        title: eventTitle,
        date: eventDate,
        owner: user.uid,
        ownerName: user.displayName,
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  // 🔹 Firestoreから削除（自分の予定だけ）
  const deleteEvent = async (id, owner) => {
    if (user.uid !== owner) {
      alert("自分が追加した予定だけ削除できます。");
      return;
    }
    if (confirm("この予定を削除しますか？")) {
      try {
        await deleteDoc(doc(db, "events", id));
      } catch (e) {
        console.error("Error deleting event: ", e);
      }
    }
  };

  // 🔹 リアルタイムで予定取得
  useEffect(() => {
    if (!user) return;
    const q = collection(db, "events");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: `${doc.data().title} (${doc.data().ownerName})`,
        date: doc.data().date,
        owner: doc.data().owner,
      }));
      setEvents(fetched);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">📅 共有カレンダー</h1>

      {!user ? (
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={handleLogin}
        >
          Googleでログイン
        </button>
      ) : (
        <div>
          <p className="mb-2">ログイン中: {user.displayName}</p>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded mb-4"
            onClick={handleLogout}
          >
            ログアウト
          </button>

          {/* 🔹 イベント追加フォーム */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border p-2 mr-2"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border p-2 mr-2"
            />
            <button
              onClick={() => {
                if (!title || !date) return alert("タイトルと日付を入力してください");
                addEvent(title, date);
                setTitle("");
                setDate("");
              }}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              追加
            </button>
          </div>

          {/* 🔹 カレンダー表示 */}
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            dateClick={(info) => {
              setSelectedDate(info.dateStr); // 🔹 日付を選択
            }}
            eventClick={(info) => {
              const event = events.find((e) => e.id === info.event.id);
              if (event) deleteEvent(event.id, event.owner);
            }}
          />

          {/* 🔹 選択した日の予定一覧表示 */}
          {selectedDate && (
            <div className="mt-6 p-4 border rounded bg-gray-50">
              <h2 className="text-lg font-bold mb-2">{selectedDate} の予定</h2>
              <ul>
                {events
                  .filter((event) => event.date === selectedDate)
                  .map((event) => (
                    <li key={event.id} className="mb-1">
                      {event.title}
                      {event.owner === user.uid && (
                        <button
                          className="ml-2 text-red-500"
                          onClick={() => deleteEvent(event.id, event.owner)}
                        >
                          削除
                        </button>
                      )}
                    </li>
                  ))}
                {events.filter((event) => event.date === selectedDate).length === 0 && (
                  <li>予定はありません</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
