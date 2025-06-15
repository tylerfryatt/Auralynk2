import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  arrayRemove,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const ReaderProfile = () => {
  const { readerId } = useParams();
  const [profile, setProfile] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "users", readerId));
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          const future = (data.availableSlots || []).filter(
            (s) => new Date(s) > new Date()
          );
          setSlots(future);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
      setLoading(false);
    };
    load();
  }, [readerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!slot) return alert("Please select a time");
    try {
      const res = await fetch("http://localhost:4000/create-room", {
        method: "POST",
      });
      const { roomUrl } = await res.json();

      await addDoc(collection(db, "bookings"), {
        clientName: name,
        clientEmail: email,
        readerId,
        selectedTime: slot,
        roomUrl,
        status: "pending",
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "users", readerId), {
        availableSlots: arrayRemove(slot),
      });

      setMessage("Booking request sent!");
      setName("");
      setEmail("");
      setSlot("");
    } catch (err) {
      console.error("Booking failed:", err);
      alert("Booking failed");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!profile) return <div className="p-6">Reader not found.</div>;

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">{profile.displayName}</h1>
        <p className="text-gray-700 whitespace-pre-line">{profile.bio}</p>
      </div>
      {slots.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border px-2 py-1 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-2 py-1 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Select Time</label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full border px-2 py-1 rounded"
              required
            >
              <option value="">Choose a slot</option>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {new Date(s).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Book Session
          </button>
        </form>
      ) : (
        <p className="text-gray-500">No available slots.</p>
      )}
      {message && <div className="text-green-600">{message}</div>}
    </div>
  );
};

export default ReaderProfile;

