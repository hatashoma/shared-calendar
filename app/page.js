"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
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
import { useRouter } from "next/navigation";

// 管理者UIDをここに登録
const ADMIN_UIDS = ["pvJLH8T8kfhbMx5t6V9CBZBohsI2"];

export default function Home() {
  const [user, setUser] = useState(auth.currentUser);
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState("");
  const router = useRouter();

  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  // ログアウト
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    router.push("/login");
  };

  // イベント追加
  const addEvent = async (eventTitle, eventDate) => {
    if (!user) return;
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

  // イベント削除（管理者は全てOK、一般は自分だけ）
  const deleteEvent = async (id, owner) => {
    if (!isAdmin && user.uid !== owner) {
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

  // テンプレート追加（管理者のみ）
  const addTemplate = async (title) => {
    try {
      await addDoc(collection(db, "templates"), {
        title,
        createdAt: new Date(), // 追加順でソートするためのフィールド
      });
    } catch (e) {
      console.error("Error adding template: ", e);
    }
  };

  // テンプレート削除（管理者のみ）
  const deleteTemplate = async (id) => {
    try {
      await deleteDoc(doc(db, "templates", id));
    } catch (e) {
      console.error("Error deleting template: ", e);
    }
  };

  // 認証状態・イベント・テンプレート取得
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      if (u) setUser(u);
      else router.push("/login");
    });

    if (!user) return;

    // イベント取得
    const qEvents = collection(db, "events");
    const unsubscribeSnapEvents = onSnapshot(qEvents, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: `${doc.data().title} (${doc.data().ownerName})`,
        date: doc.data().date,
        owner: doc.data().owner,
      }));
      setEvents(fetched);
    });

    // テンプレート取得
    const qTemplates = collection(db, "templates");
    const unsubscribeSnapTemplates = onSnapshot(qTemplates, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(0),
      }));
      fetched.sort((a, b) => a.createdAt - b.createdAt); // 追加順に並べる
      setTemplates(fetched);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapEvents();
      unsubscribeSnapTemplates();
    };
  }, [user, router]);

  if (!user) return null;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">くら寿司-シフト共有-</h1>

      <p className="mb-2">ログイン中: {user.displayName}</p>
      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded mb-4"
      >
        ログアウト
      </button>

      {/* イベント追加フォーム */}
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

      {/* テンプレート管理（管理者のみ） */}
      {isAdmin && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-2">テンプレート管理（管理者のみ）</h2>
          <input
            type="text"
            placeholder="テンプレート名（例: 出勤）"
            value={newTemplate}
            onChange={(e) => setNewTemplate(e.target.value)}
            className="border p-2 mr-2"
          />
          <button
            onClick={() => {
              if (!newTemplate) return;
              addTemplate(newTemplate);
              setNewTemplate("");
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            追加
          </button>
          <ul className="mt-2">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center">
                {t.title}
                <button
                  className="ml-2 text-red-500"
                  onClick={() => deleteTemplate(t.id)}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* カレンダー */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={(info) => setSelectedDate(info.dateStr)}
        eventClick={(info) => {
          const event = events.find((e) => e.id === info.event.id);
          if (event) deleteEvent(event.id, event.owner);
        }}
      />

      {/* 選択日の予定一覧 */}
      {selectedDate && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h2 className="text-lg font-bold mb-2">{selectedDate} の予定</h2>
          <ul>
            {events
              .filter((event) => event.date === selectedDate)
              .map((event) => (
                <li key={event.id} className="mb-1">
                  {event.title}
                  {(event.owner === user.uid || isAdmin) && (
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

          {/* テンプレートから追加 */}
          <div className="mt-4">
            <p className="font-semibold mb-2">テンプレートから追加:</p>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => addEvent(t.title, selectedDate)}
                className="bg-green-500 text-white px-3 py-1 rounded mr-2 mb-2"
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
