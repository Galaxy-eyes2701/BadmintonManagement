import { createContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const defaultState = {
  isAuthenticated: false,
  role: null,
  user: null,
  token: null,
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    try {
      const stored = localStorage.getItem("authState");
      return stored ? JSON.parse(stored) : defaultState;
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("authState", JSON.stringify(authState));
    } catch {
      // ignore persistence errors
    }
  }, [authState]);

  // Đăng nhập kiểu cũ (demo admin)
  const login = (username, role) => {
    setAuthState({
      isAuthenticated: true,
      role,
      user: { username },
      token: null,
    });
  };

  // Đăng nhập từ API backend (có token + user)
  const loginWithToken = (token, user) => {
    const role = user?.role || user?.Role || null;

    setAuthState({
      isAuthenticated: true,
      role,
      user,
      token,
    });

    try {
      localStorage.setItem("authToken", token);
    } catch {
      // ignore persistence errors
    }
  };

  const logout = () => {
    setAuthState(defaultState);

    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("adminLoggedIn");
      localStorage.removeItem("authState");
    } catch {
      // ignore persistence errors
    }
  };

  return (
    <AuthContext.Provider
      value={{ ...authState, login, loginWithToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
