import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Experience } from "./witcher/Experience";
import "./styles.css";

const mount = document.getElementById("root");
if (!mount) throw new Error("Missing #root mount point");

createRoot(mount).render(
  <StrictMode>
    <Experience />
  </StrictMode>,
);
