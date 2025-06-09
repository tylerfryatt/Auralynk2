
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
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import PatchReaders from "../components/PatchReaders";

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ displayName: "", bio: "" });
  const [editing, setEditing] = useState(false);
  const [readers, setReaders] = useState([]);
  const [bookings, setBookings] = useState([]);

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
      fetchBookings(currentUser.uid);
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

  const fetchBookings = async (uid) => {
    const q = query(collection(db, "bookings"), where("clientId", "==", uid));
    const snap = await getDocs(q);
    setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

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
    alert("✅ Session booked!");
    fetchBookings(user.uid);
  };

  const cancelBooking = async (bookingId) => {
    await deleteDoc(doc(db, "bookings", bookingId));
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
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

  const groupSlotsByDay = (slots) => {
    const now = new Date();
    return slots
      .filter((s) => new Date(s) > now)
      .sort()
      .reduce((acc, iso) => {
        const day = formatDate(iso);
        acc[day] = acc[day] || [];
        acc[day].push(iso);
        return acc;
      }, {});
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
            const grouped = groupSlotsByDay(reader.availableSlots);
            return (
              <li key={reader.id} className="border p-4 rounded shadow">
                <h3 className="text-md font-semibold">{reader.displayName}</h3>
                <p className="text-sm text-gray-600">{reader.bio}</p>
                <p className="text-sm italic text-gray-500 mt-1">
                  Services: {(reader.services || []).join(", ")}
                </p>

                <div className="mt-4">
                  {Object.entries(grouped).map(([day, slots]) => (
                    <div key={day} className="mb-2">
                      <div className="font-medium text-sm mb-1">{day}</div>
                      <div className="flex flex-row flex-wrap gap-2 items-start w-full slots-container">
                        {slots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => handleBook(reader.id, slot)}
                            className="bg-indigo-600 text-white text-xs px-3 py-1 rounded hover:bg-indigo-700 whitespace-nowrap flex-shrink-0"
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
          {bookings.map((b) => (
            <li key={b.id} className="border-b pb-1 text-sm flex justify-between items-center">
              <span>
                {new Date(b.selectedTime).toLocaleString()} — Reader: {b.readerId}
              </span>
              <button onClick={() => cancelBooking(b.id)} className="text-red-600 text-xs underline">
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Dev Patch */}
      <PatchReaders />
    </div>
  );
};

export default ClientDashboard;