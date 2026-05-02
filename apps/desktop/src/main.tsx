import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

const queryClient = new QueryClient();

const theme = createTheme({
  primaryColor: "teal",
  fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  defaultRadius: "md"
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications position="bottom-left" />
        <App />
      </MantineProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
