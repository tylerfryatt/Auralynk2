
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ displayName: "", bio: "" });
  const [editing, setEditing] = useState(false);
  const [readers, setReaders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [takenSlots, setTakenSlots] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }
      setUser(currentUser);
      const profileRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(profileRef);
      if (snap.exists()) setProfile(snap.data());
    });

    fetchReaders();
    return () => unsubscribe();
  }, []);

  const fetchReaders = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const data = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (r) =>
          r.role === "reader" &&
          Array.isArray(r.availableSlots) &&
          r.availableSlots.length > 0
      );
    setReaders(data);
  };

  useEffect(() => {
    const q = query(
      collection(db, "bookings"),
      where("status", "==", "accepted")
    );
    const unsub = onSnapshot(q, (snap) => {
      const booked = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.readerId || !data.selectedTime) return;
        if (!booked[data.readerId]) booked[data.readerId] = new Set();
        booked[data.readerId].add(data.selectedTime);
      });
      const obj = {};
      Object.keys(booked).forEach((rid) => {
        obj[rid] = Array.from(booked[rid]);
      });
      setTakenSlots(obj);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "bookings"),
      where("clientId", "==", user.uid),
      where("status", "==", "accepted")
    );
    const unsubscribe = onSnapshot(q, async (snap) => {
      const mapped = await Promise.all(
        snap.docs.map(async (d) => {
          const data = { id: d.id, ...d.data() };
          const readerDoc = await getDoc(doc(db, "profiles", data.readerId));
          return {
            ...data,
            readerName: readerDoc.exists()
              ? readerDoc.data().displayName
              : data.readerId,
          };
        })
      );
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const upcoming = mapped.filter(
        (b) => b.selectedTime && new Date(b.selectedTime) > new Date(oneHourAgo)
      );
      setBookings(upcoming);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const saveProfile = async () => {
    if (!user) return;
    const profileRef = doc(db, "users", user.uid);
    await setDoc(profileRef, profile, { merge: true });
    setEditing(false);
  };

  const handleBook = async (readerId, slot) => {
    if (!user || !readerId || !slot) return;
    const time = new Date(slot);
    if (time <= new Date()) return alert("❌ Can't book a past time.");
    await addDoc(collection(db, "bookings"), {
      clientId: user.uid,
      readerId,
      selectedTime: time.toISOString(),
      status: "pending",
    });
    alert("✅ Appointment request sent!");
  };

  const requestBook = (reader, slot) => {
    setPendingBooking({
      readerId: reader.id,
      readerName: reader.displayName,
      slot,
    });
  };

  const cancelBooking = async (bookingId) => {
    await deleteDoc(doc(db, "bookings", bookingId));
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  const requestCancel = (bookingId) => {
    setConfirmId(bookingId);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const groupSlotsByDay = (slots, booked = []) => {
    const now = new Date();
    const bookedSet = new Set(booked);
    return slots
      .filter((s) => new Date(s) > now && !bookedSet.has(s))
      .sort()
      .reduce((acc, iso) => {
        const day = formatDate(iso);
        acc[day] = acc[day] || [];
        acc[day].push(iso);
        return acc;
      }, {});
  };

  const isSessionJoinable = (selectedTime) => {
    const time = new Date(selectedTime);
    const diff = (time - new Date()) / 1000 / 60;
    return diff <= 10 && diff >= -60;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">💫 Client Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300"
        >
          Log Out
        </button>
      </div>

      {/* Profile */}
      <div className="mb-6">
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) =>
                setProfile({ ...profile, displayName: e.target.value })
              }
              className="w-full border px-3 py-2 rounded"
              placeholder="Display Name"
            />
            <textarea
              value={profile.bio}
              onChange={(e) =>
                setProfile({ ...profile, bio: e.target.value })
              }
              className="w-full border px-3 py-2 rounded"
              placeholder="Bio"
            />
            <div className="flex gap-2">
              <button
                onClick={saveProfile}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="bg-gray-300 px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold">{profile.displayName}</h2>
            <p className="text-sm text-gray-600">{profile.bio}</p>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-blue-600 mt-2 hover:underline"
            >
              ✏️ Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Reader Feed */}
      <h2 className="text-lg font-semibold mb-4">🔮 Available Readers</h2>
      {readers.length === 0 ? (
        <p className="text-gray-600">No readers available.</p>
      ) : (
        <ul className="space-y-6">
          {readers.map((reader) => {
            const grouped = groupSlotsByDay(
              reader.availableSlots,
              takenSlots[reader.id] || []
            );
            return (
              <li key={reader.id} className="reader-card">
                <h3 className="text-md font-semibold text-gray-800">{reader.displayName}</h3>
                <p className="text-sm text-gray-600">{reader.bio}</p>
                <p className="text-sm italic text-gray-500 mt-1">
                  Services: {(reader.services || []).join(", ")}
                </p>

                <div className="mt-4 slots-container flex flex-row flex-wrap gap-4">
                  {Object.entries(grouped).map(([day, slots]) => (
                    <div key={day} className="flex flex-col items-start mb-2">
                      <div className="font-medium text-sm mb-1 text-gray-800">{day}</div>
                      <div className="flex flex-row flex-wrap gap-2 items-start w-full">
                        {slots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => requestBook(reader, slot)}
                            className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 whitespace-nowrap flex-shrink-0"
                          >
                            {formatTime(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="text-lg font-semibold mt-8 mb-2">📘 Your Bookings</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-gray-500">No bookings yet.</p>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => {
            const joinable = b.roomUrl && isSessionJoinable(b.selectedTime);
            return (
              <li key={b.id} className="border-b pb-1 text-sm flex justify-between items-center">
                <span>
                  {new Date(b.selectedTime).toLocaleString()} — Reader: {b.readerName}
                </span>
                <div className="flex items-center gap-3">
                  {joinable ? (
                    <a href={`/session/${b.id}`} className="text-blue-500 hover:underline text-sm">
                      🔗 Join Video Session
                    </a>
                  ) : (
                    <div className="text-xs text-gray-500 italic">
                      {b.roomUrl ? "Not time to join yet" : "No room link yet"}
                    </div>
                  )}
                  <button onClick={() => requestCancel(b.id)} className="text-red-600 text-xs underline">
                    Cancel
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pendingBooking && (
        <div className="modal-overlay">
          <div className="modal">
            <p>
              Are you sure you want to book an appointment with{' '}
              {pendingBooking.readerName}?
            </p>
            <div className="flex gap-4 justify-end">
              <button
                className="btn-primary"
                onClick={() => {
                  handleBook(pendingBooking.readerId, pendingBooking.slot);
                  setPendingBooking(null);
                }}
              >
                Yes
              </button>
              <button
                className="btn-gradient"
                onClick={() => setPendingBooking(null)}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmId && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Are you sure you want to cancel this appointment?</p>
            <div className="flex gap-4 justify-end">
              <button
                className="btn-secondary"
                onClick={() => {
                  cancelBooking(confirmId);
                  setConfirmId(null);
                }}
              >
                Yes
              </button>
              <button className="btn-primary" onClick={() => setConfirmId(null)}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientDashboard;