import { createRoot } from "react-dom/client";

import App from "./App";
import "./global.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Không tìm thấy phần tử có id="root".');
}

createRoot(rootElement).render(<App />);