// src/dashboards/ReaderBookings.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  getDoc,
  updateDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { format } from "date-fns";

const ReaderBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [readerId, setReaderId] = useState(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) setReaderId(user.uid);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!readerId) return;
    const q = query(
      collection(db, "bookings"),
      where("readerId", "==", readerId)
    );
    const unsub = onSnapshot(q, async (snapshot) => {
      const bookingData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() };
          const clientDoc = await getDoc(doc(db, "profiles", data.clientId));
          return {
            ...data,
            clientName: clientDoc.exists()
              ? clientDoc.data().displayName
              : data.clientId,
          };
        })
      );
      const pending = bookingData.filter((b) => b.status === "pending");
      setBookings(pending);
    });
    return () => unsub();
  }, [readerId]);

  const updateStatus = async (bookingId, status) => {
    await updateDoc(doc(db, "bookings", bookingId), { status });
    if (status !== "pending") {
      // remove locally so pending list updates instantly
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📥 Incoming Bookings</h1>
      {bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="p-4 border rounded shadow flex flex-col sm:flex-row justify-between items-start sm:items-center"
            >
              <div>
                <p><strong>Client:</strong> {b.clientName}</p>
                <p><strong>Selected Time:</strong> {b.selectedTime || "Not chosen"}</p>
                <p><strong>Requested:</strong> {b.timestamp?.seconds
                  ? format(new Date(b.timestamp.seconds * 1000), "PPpp")
                  : "N/A"}</p>
                <p><strong>Status:</strong> {b.status}</p>
              </div>
              {b.status === "pending" && (
                <div className="mt-4 sm:mt-0 flex gap-2">
                  <button
                    onClick={async () => {
                      await updateStatus(b.id, "confirmed");
                    }}
                    className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={async () => {
                      await updateStatus(b.id, "rejected");
                    }}
                    className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReaderBookings;
