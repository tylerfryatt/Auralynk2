import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const BookingPage = () => {
  const [bookings, setBookings] = useState([]);
  const [user, setUser] = useState(null);
  const [pendingAccept, setPendingAccept] = useState(null);
  const navigate = useNavigate();

  const fetchBookings = (uid) => {
    if (!uid) return () => {};
    const q = query(
      collection(db, "bookings"),
      where("readerId", "==", uid)
    );
    const unsub = onSnapshot(q, async (snapshot) => {
      const allBookings = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() };
          const clientDoc = await getDoc(doc(db, "profiles", data.clientId));
          const readerDoc = await getDoc(doc(db, "profiles", data.readerId));
          return {
            ...data,
            clientName: clientDoc.exists()
              ? clientDoc.data().displayName
              : data.clientId,
            readerName: readerDoc.exists()
              ? readerDoc.data().displayName
              : data.readerId,
          };
        })
      );
      const pending = allBookings.filter((b) => b.status === "pending");
      setBookings(pending);
    });
    return unsub;
  };

  const updateStatus = async (bookingId, status) => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      if (status === "accepted") {
        const res = await fetch("http://localhost:4000/create-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        await updateDoc(bookingRef, { status, roomUrl: data.roomUrl });
      } else {
        await updateDoc(bookingRef, { status });
      }

      if (status !== "pending") {
        // immediately remove from UI so it disappears without a page reload
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      }
    } catch (err) {
      console.error("Failed to update booking", err);
    }
  };

  const deleteBooking = async (bookingId) => {
    try {
    await deleteDoc(doc(db, "bookings", bookingId));
  } catch (err) {
    console.error("Failed to delete booking", err);
  }
};

  useEffect(() => {
    let unsubBookings = () => {};
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        navigate("/login");
      } else {
        setUser(u);
        unsubBookings = fetchBookings(u.uid);
      }
    });

    return () => {
      unsubAuth();
      unsubBookings();
    };
  }, [navigate]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📋 All Bookings</h1>
        <button
          onClick={() => navigate("/reader")}
          className="text-sm text-blue-600 hover:underline"
        >
          ⬅ Back to Dashboard
        </button>
      </div>

      {bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <ul className="space-y-4">
          {bookings.map((booking) => (
            <li key={booking.id} className="border p-3 rounded shadow">
              <div>📅 {new Date(booking.selectedTime).toLocaleString()}</div>
              <div>Client: {booking.clientName}</div>
              <div>Reader: {booking.readerName}</div>
              <div>Status: {booking.status}</div>

              <div className="mt-2 space-x-2">
                <button
                  onClick={() => setPendingAccept(booking)}
                  className="bg-green-500 text-white px-2 py-1 rounded text-sm"
                >
                  Accept
                </button>
                <button
                  onClick={() => updateStatus(booking.id, "rejected")}
                  className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                >
                  Reject
                </button>
                <button
                  onClick={() => deleteBooking(booking.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendingAccept && (
        <div className="modal-overlay">
          <div className="modal">
            <p>
              Are you sure you want to book this appointment with client{' '}
              {pendingAccept.clientName} at{' '}
              {new Date(pendingAccept.selectedTime).toLocaleString()}?
            </p>
            <div className="flex gap-4 justify-end">
              <button
                className="btn-secondary"
                onClick={() => {
                  updateStatus(pendingAccept.id, 'accepted');
                  setPendingAccept(null);
                }}
              >
                Yes
              </button>
              <button
                className="btn-primary"
                onClick={() => setPendingAccept(null)}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;
