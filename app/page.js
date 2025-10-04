"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut, updateProfile } from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";

// 管理者UID
const ADMIN_UIDS = ["pvJLH8T8kfhbMx5t6V9CBZBohsI2"];

export default function Home() {
  const [user, setUser] = useState(auth.currentUser);
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserUid, setSelectedUserUid] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const router = useRouter();

  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  // ログアウト
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    router.push("/login");
  };

  // 自分のユーザーネーム変更
  const updateUserNameSelf = async (name) => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: name });

      // Firestoreの自分のイベント更新
      const q = query(collection(db, "events"), where("owner", "==", user.uid));
      const snapshot = await getDocs(q);
      await Promise.all(
        snapshot.docs.map((docSnap) =>
          updateDoc(doc(db, "events", docSnap.id), { ownerName: name })
        )
      );

      setUser({ ...user, displayName: name });
      alert("ユーザーネームを変更し、既存イベントも更新しました！");
    } catch (e) {
      console.error("ユーザーネーム変更エラー:", e);
    }
  };

  // 管理者が全ユーザーの名前変更
  const updateUserNameAdmin = async (uid, name) => {
    if (!isAdmin || !uid) return;
    try {
      // FirestoreのeventsのownerName更新
      const q = query(collection(db, "events"), where("owner", "==", uid));
      const snapshot = await getDocs(q);
      await Promise.all(
        snapshot.docs.map((docSnap) =>
          updateDoc(doc(db, "events", docSnap.id), { ownerName: name })
        )
      );
      // usersコレクションにも保存（authのdisplayName更新は管理者では不可のため）
      await updateDoc(doc(db, "users", uid), { displayName: name });
      alert("ユーザー名を変更しました（既存イベントも更新済み）");
    } catch (e) {
      console.error("管理者ユーザーネーム変更エラー:", e);
    }
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

  // イベント削除（管理者は全てOK）
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
      await addDoc(collection(db, "templates"), { title, createdAt: new Date() });
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

  // 認証状態・イベント・テンプレート・全ユーザー取得
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      if (u) setUser(u);
      else router.push("/login");
    });

    if (!user) return;

    // events取得
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

    // templates取得
    const qTemplates = collection(db, "templates");
    const unsubscribeSnapTemplates = onSnapshot(qTemplates, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(0),
      }));
      fetched.sort((a, b) => a.createdAt - b.createdAt);
      setTemplates(fetched);
    });

    // 全ユーザー取得（管理者用）
    let unsubscribeUsers = () => {};
    if (isAdmin) {
      const qUsers = collection(db, "users");
      unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
        const fetched = snapshot.docs.map((doc) => ({
          uid: doc.id,
          displayName: doc.data().displayName,
        }));
        setAllUsers(fetched);
      });
    }

    return () => {
      unsubscribeAuth();
      unsubscribeSnapEvents();
      unsubscribeSnapTemplates();
      unsubscribeUsers();
    };
  }, [user, isAdmin, router]);

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

      {/* ユーザーネーム変更 */}
      {!isAdmin && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="新しいユーザーネーム"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="border p-1 mr-1"
          />
          <button
            onClick={() => {
              if (!newUsername) return alert("名前を入力してください");
              updateUserNameSelf(newUsername);
              setNewUsername("");
            }}
            className="bg-yellow-500 text-white px-2 py-1 rounded"
          >
            名前変更
          </button>
        </div>
      )}

      {/* 管理者用：全ユーザー名前変更 */}
      {isAdmin && (
        <div className="mb-4">
          <select
            value={selectedUserUid}
            onChange={(e) => {
              setSelectedUserUid(e.target.value);
              const u = allUsers.find((u) => u.uid === e.target.value);
              setSelectedUserName(u?.displayName || "");
            }}
            className="border p-2 mr-2"
          >
            <option value="">ユーザー選択</option>
            {allUsers.map((u) => (
              <option key={u.uid} value={u.uid}>{u.displayName}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="新しいユーザーネーム"
            value={selectedUserName}
            onChange={(e) => setSelectedUserName(e.target.value)}
            className="border p-2 mr-2"
          />
          <button
            onClick={() => {
              if (!selectedUserUid || !selectedUserName) return alert("ユーザーと名前を入力してください");
              updateUserNameAdmin(selectedUserUid, selectedUserName);
            }}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            名前変更
          </button>
        </div>
      )}

      {/* イベント追加フォーム */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-1 mr-1"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-1 mr-1"
        />
        <button
          onClick={() => {
            if (!title || !date) return alert("タイトルと日付を入力してください");
            addEvent(title, date);
            setTitle("");
            setDate("");
          }}
          className="bg-green-500 text-white px-2 py-1 rounded"
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
        dayMaxEventRows={3}
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
