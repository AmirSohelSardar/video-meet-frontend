import React from 'react'
import { useUser } from '../../context/UserContextApi';
import { Navigate, Outlet } from 'react-router-dom';

const IsLogin = () => {
  const { user, loading } = useUser();

  if (loading) return <div>Loading...</div>; // 🔥 WAIT

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};


export default IsLogin;