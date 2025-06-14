import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const ConfirmPage = () => {
  const { token } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const load = async () => {
      const tokenRef = doc(db, "bookingTokens", token);
      const tokenSnap = await getDoc(tokenRef);
      if (!tokenSnap.exists()) {
        setLoading(false);
        return;
      }
      const tokenData = tokenSnap.data();
      if (tokenData.expiresAt && tokenData.expiresAt.toDate() < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }
      const bookingSnap = await getDoc(doc(db, "bookings", tokenData.bookingId));
      if (bookingSnap.exists()) {
        setBooking({ id: tokenData.bookingId, ...bookingSnap.data() });
        try {
          await updateDoc(doc(db, "bookings", tokenData.bookingId), {
            status: "confirmed",
          });
        } catch (err) {
          console.error("Failed to update booking status", err);
        }
      }
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!booking || expired)
    return <div className="p-6">❌ Invalid or expired token.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">✅ Session Confirmed</h1>
      <p className="mb-4">
        Your session is scheduled for {" "}
        {new Date(booking.selectedTime).toLocaleString()}.
      </p>
      <Link className="text-indigo-600 underline" to={`/session/${token}`}>Go to session</Link>
    </div>
  );
};

export default ConfirmPage;
