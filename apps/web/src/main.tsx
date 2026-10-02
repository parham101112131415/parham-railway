/**
 * Parham - Xray-core VPN management panel
 * Copyright (c) 2025 Parham. All rights reserved.
 * Official repository: https://github.com/parham101112131415/parham-railway
 *
 * Licensed under the Parham Proprietary License (see LICENSE).
 * Unauthorized selling, white-labeling, or removal of attribution,
 * branding, or the embedded authorship identifiers is prohibited.
 * Watermark: sr-parham-2025
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { I18nProvider } from "./lib/i18n";
import { ToastProvider } from "./components/ui/toast";
import ParhamFx from "./components/parham-fx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <ParhamFx />
              <App />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
