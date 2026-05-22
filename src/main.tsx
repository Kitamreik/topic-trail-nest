import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installHapticToast } from "./lib/haptic-toast";

installHapticToast();

createRoot(document.getElementById("root")!).render(<App />);
