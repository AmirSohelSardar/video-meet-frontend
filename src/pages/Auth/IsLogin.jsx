import React from 'react'
import { useUser } from '../../context/UserContextApi';
import { Navigate, Outlet } from 'react-router-dom';

const IsLogin = () => {
  const { user, loading } = useUser();

  console.log("🟢 IsLogin check - User:", user ? "EXISTS" : "NULL", "Loading:", loading);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log("❌ No user - redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log("✅ User authenticated - rendering dashboard");
  return <Outlet />;
};


export default IsLogin;