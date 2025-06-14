import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import VideoCall from "../components/VideoCall";

const SessionPage = () => {
  const { bookingId } = useParams();
  const [roomUrl, setRoomUrl] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      const docRef = doc(db, "bookings", bookingId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setRoomUrl(data.roomUrl);

        try {
          const urlObj = new URL(data.roomUrl);
          const roomName = urlObj.pathname.replace(/^\//, "");
          const response = await fetch("http://localhost:4000/fresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomName }),
          });
          const tokenData = await response.json();
          setToken(tokenData.token);
        } catch (err) {
          console.error("Failed to fetch token:", err);
        }
      }
      setLoading(false);
    };
    fetchBooking();
  }, [bookingId]);

  if (loading) return <div className="p-6">Loading session...</div>;
  if (!roomUrl) return <div className="p-6">❌ No room URL found for this session.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🔗 Live Session</h1>
      <VideoCall roomUrl={roomUrl} token={token} />
    </div>
  );
};

export default SessionPage;
