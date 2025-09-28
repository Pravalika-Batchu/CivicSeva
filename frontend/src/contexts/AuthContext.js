// contexts/AuthContext.js
import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // Set user data after login

    // Example: Set user after login
    const login = async (username, password) => {
        // Call login API and set user
        setUser({ username, role: "CITIZEN" }); // Replace with actual user data
    };

    return (
        <AuthContext.Provider value={{ user, login }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);