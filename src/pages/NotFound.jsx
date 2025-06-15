import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="p-6 text-center">
    <h1 className="text-2xl font-bold mb-4">404 - Page Not Found</h1>
    <p className="mb-4">Sorry, the page you're looking for does not exist.</p>
    <Link to="/" className="text-indigo-600 hover:underline">
      Go Home
    </Link>
  </div>
);

export default NotFound;
