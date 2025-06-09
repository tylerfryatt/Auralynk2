import React from "react";
import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="p-6 text-center space-y-6">
      <h1 className="text-4xl font-display font-bold">🔮 Welcome to Auralynk</h1>
      <p className="text-gray-600">Choose your role to continue:</p>
      <div className="flex justify-center gap-4">
        <Link to="/client" className="btn-primary">
          Client Dashboard
        </Link>
        <Link to="/reader" className="btn-gradient">
          Reader Dashboard
        </Link>
      </div>
      <Link to="/login" className="underline text-sm text-blue-600">
        🔐 Login
      </Link>
    </div>
  );
};

export default HomePage;
