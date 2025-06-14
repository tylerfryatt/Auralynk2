import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import VideoCall from "../components/VideoCall";

const SessionPage = () => {
  const { token } = useParams();
  const [roomUrl, setRoomUrl] = useState(null);
  const [dailyToken, setDailyToken] = useState(null);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
        return;
      }

      const bookingSnap = await getDoc(doc(db, "bookings", tokenData.bookingId));
      if (bookingSnap.exists()) {
        const data = bookingSnap.data();
        setRoomUrl(data.roomUrl);

        try {
          const urlObj = new URL(data.roomUrl);
          const roomName = urlObj.pathname.replace(/^\//, "");
          const response = await fetch("http://localhost:4000/fresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomName }),
          });
          const tData = await response.json();
          setDailyToken(tData.token);
        } catch (err) {
          console.error("Failed to fetch token:", err);
        }
      }
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) return <div className="p-6">Loading session...</div>;
  if (!roomUrl || !dailyToken)
    return <div className="p-6">❌ Invalid or expired token.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🔗 Live Session</h1>
      <VideoCall roomUrl={roomUrl} token={dailyToken} />
    </div>
  );
};

export default SessionPage;
