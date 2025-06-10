import React, { useState } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [isNewUser, setIsNewUser] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("client");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let userCredential;

      if (isNewUser) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, "users", userCredential.user.uid), {
          email,
          role,
          createdAt: new Date()
        });

        alert("Account created successfully!");
        navigate(`/${role}`);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);

        const userDocRef = doc(db, "users", result.user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();


        if (userData?.role) {
          alert("Login successful!");
          navigate(`/${userData.role}`);
        } else {
          alert("User role not found. Please contact support.");
        }
      }
    } catch (err) {
      console.error("🔥 Auth error:", err.message);
      alert(err.message);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 text-gray-800">
      <h1 className="text-2xl font-display font-bold">
        {isNewUser ? "Sign Up" : "Log In"}
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 border rounded"
          required
        />
        {isNewUser && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="client">Client</option>
            <option value="reader">Reader</option>
          </select>
        )}
        <button type="submit" className="btn-primary">
          {isNewUser ? "Create Account" : "Log In"}
        </button>
        <button
          type="button"
          onClick={() => setIsNewUser(!isNewUser)}
          className="text-sm underline text-blue-600"
        >
          {isNewUser ? "Already have an account?" : "Need to create an account?"}
        </button>
      </form>
    </div>
  );
}
