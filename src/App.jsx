import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReaderDashboard from "./dashboards/ReaderDashboard";
import BookingPage from "./pages/BookingPage";
import SessionPage from "./pages/SessionPage";
import ConfirmPage from "./pages/ConfirmPage";
import ReaderProfile from "./pages/ReaderProfile";
import AuthPage from "./AuthPage"; // ✅ this is your original login
import HomePage from "./pages/HomePage"; // optional homepage

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />           {/* Optional homepage */}
        <Route path="/login" element={<AuthPage />} />      {/* 🔐 Your login page */}
        <Route path="/reader" element={<ReaderDashboard />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/readers/:readerId" element={<ReaderProfile />} />
        <Route path="/confirm/:token" element={<ConfirmPage />} />
        <Route path="/session/:token" element={<SessionPage />} />
      </Routes>
    </Router>
  );
};

export default App;
