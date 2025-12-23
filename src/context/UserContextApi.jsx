import { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔵 UserProvider initializing...");
    const storedUser = localStorage.getItem("userData");
    console.log("🔵 StoredUser from localStorage:", storedUser ? "EXISTS" : "NULL");

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        console.log("🔵 Parsed user:", parsed);
        setUser(parsed);
      } catch (err) {
        console.error("❌ Invalid userData in localStorage:", err);
        localStorage.removeItem("userData");
        setUser(null);
      }
    }

    setLoading(false);
    console.log("🔵 UserProvider loading complete");
  }, []);

  const updateUser = (userData) => {
    setUser(userData);

    if (userData) {
      localStorage.setItem("userData", JSON.stringify(userData));
    } else {
      localStorage.removeItem("userData");
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
