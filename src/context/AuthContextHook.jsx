import { useContext } from "react";
import { AuthContext } from "./Authcontext";

export const useAuth = () => useContext(AuthContext);


