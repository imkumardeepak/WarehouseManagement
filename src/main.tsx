import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { WmsProvider } from "@/store/WmsContext";
import { ThemeProvider } from "@/store/ThemeContext";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <WmsProvider>
        <ToastProvider>
          <TooltipProvider delayDuration={200}>
            <App />
          </TooltipProvider>
        </ToastProvider>
      </WmsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
