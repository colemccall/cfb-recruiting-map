import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PortalFlow from "../cfb-portal-map.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PortalFlow />
  </StrictMode>
);
