import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AvailabilityEditor from "../components/AvailabilityEditor";

const ReaderDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ displayName: "", bio: "" });
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    let unsubAccepted = () => {};
    let unsubPending = () => {};
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        console.log("👤 Not logged in, redirecting...");
        navigate("/login");
        return;
      }

      console.log("✅ Logged in as:", currentUser.uid);
      setUser(currentUser);

      try {
        const profileRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(profileRef);

        if (snap.exists()) {
          const data = snap.data();
          console.log("✅ Profile data loaded:", data);
          setProfile(data);
          setFormData({
            displayName: data.displayName || "",
            bio: data.bio || "",
          });
        } else {
          console.warn("⚠️ No document found, creating fallback profile...");
          const fallback = {
            displayName: "New Reader",
            bio: "This is your default profile. Edit it now!",
          };
          await setDoc(profileRef, fallback);
          setProfile(fallback);
          setFormData(fallback);
        }
      } catch (err) {
        console.error("❌ Error fetching profile:", err);
      }

      try {
        const acceptedQuery = query(
          collection(db, "bookings"),
          where("readerId", "==", currentUser.uid)
        );
        unsubAccepted = onSnapshot(acceptedQuery, async (snapshot) => {
          const acceptedDocs = snapshot.docs.filter(
            (d) => d.data().status === "accepted"
          );
          const mapped = await Promise.all(
            acceptedDocs.map(async (docSnap) => {
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
          const upcoming = mapped.filter(
            (b) => b.selectedTime && new Date(b.selectedTime) > new Date()
          );
          setBookings(upcoming);
        });

        const pendingQuery = query(
          collection(db, "bookings"),
          where("readerId", "==", currentUser.uid)
        );
        unsubPending = onSnapshot(pendingQuery, (snap) => {
          const pending = snap.docs.filter((d) => d.data().status === "pending");
          setPendingCount(pending.length);
        });
      } catch (err) {
        console.error("❌ Error fetching bookings:", err);
      }
    });

    return () => {
      unsubscribe();
      unsubAccepted();
      unsubPending();
    };
  }, [navigate]);

  const isSessionJoinable = (selectedTime) => {
    const time = new Date(selectedTime);
    const now = new Date();
    const diff = (time - now) / 1000 / 60;
    return diff <= 15 && diff >= -60;
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      navigate("/");
    } catch (err) {
      console.error("❌ Logout failed:", err);
    }
  };

  const handleEditToggle = () => setEditing(!editing);

  const handleInputChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const saveProfile = async () => {
    if (!user) return;
    const profileRef = doc(db, "users", user.uid);
    await setDoc(profileRef, formData, { merge: true });
    setProfile(formData);
    setEditing(false);
  };

  const cancelBooking = async (bookingId) => {
    await deleteDoc(doc(db, "bookings", bookingId));
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  const requestCancel = (bookingId) => {
    setConfirmId(bookingId);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🌙 Reader Dashboard</h1>
        <div className="flex items-center gap-4">
          <Link to="/book" className="text-sm text-blue-600 hover:underline">
            📋 Manage Bookings{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </Link>
          <button
            onClick={handleLogout}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 text-sm"
          >
            Log Out
          </button>
        </div>
      </div>

      {profile ? (
        <div className="mb-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  placeholder="Your display name"
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  About / Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell clients about yourself..."
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveProfile}
                  className="bg-green-500 text-white px-4 py-2 rounded text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleEditToggle}
                  className="bg-gray-300 px-4 py-2 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold">{profile.displayName}</h2>
              <p className="text-sm text-gray-600">
                {profile.bio || "No bio yet."}
              </p>
              <button
                onClick={handleEditToggle}
                className="text-sm text-blue-600 mt-2 hover:underline"
              >
                ✏️ Edit Profile
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 text-gray-500 italic">
          No profile found. Please create one.
        </div>
      )}

      <AvailabilityEditor />

      <h2 className="text-lg font-semibold mt-8 mb-2">📆 Upcoming Bookings</h2>

      {bookings.length === 0 ? (
        <p className="text-gray-600">No upcoming sessions yet.</p>
      ) : (
        <ul className="space-y-4">
          {bookings.map((b, i) => {
            const validDate = b.selectedTime ? new Date(b.selectedTime) : null;
            if (!validDate || isNaN(validDate)) return null;
            const joinable = b.roomUrl && isSessionJoinable(b.selectedTime);

              return (
                <li key={i} className="border-b pb-2 text-sm flex justify-between items-center">
                  <span>
                    📅 {validDate.toLocaleString()} — Client: {b.clientName}
                  </span>
                  <div className="flex items-center gap-3">
                    {joinable ? (
                      <a
                        href={`/session/${b.id}`}
                        className="text-blue-500 hover:underline text-sm"
                      >
                        🔗 Join Video Session
                      </a>
                    ) : (
                      <div className="text-xs text-gray-500 italic">
                        {b.roomUrl ? "Not time to join yet" : "No room link yet"}
                      </div>
                    )}
                    <button
                      onClick={() => requestCancel(b.id)}
                      className="text-red-600 text-xs underline"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              );
          })}
          </ul>
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

export default ReaderDashboard;
