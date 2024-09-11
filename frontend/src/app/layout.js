"use client";
import "react-toastify/dist/ReactToastify.css";
import "simplebar-react/dist/simplebar.min.css";
import "flatpickr/dist/themes/light.css";
import "react-svg-map/lib/index.css";
import "leaflet/dist/leaflet.css";
import "./scss/app.scss";

import { Provider } from "react-redux";
import store from "../store";
import { Inter } from "next/font/google";
import RouteValidator from "./RouteValidator"
import useRtl from "@/hooks/useRtl";
import { ToastContainer } from "react-toastify";

export const inter = Inter({ subsets: ["latin"] });

// if (process.env.APP_ENVIRONMENT !== 'development') {
  // console.log = function() {};
// }

export default function RootLayout({ children }) {
  return (
    <>
      <html lang="en" dir="ltr">
        <body className={`custom-tippy bulkage-app ${inter.className}`}>
          <Provider store={store}>
            <RouteValidator>
              <ToastContainer />
              {children}
            </RouteValidator>
          </Provider>
        </body>
      </html>
    </>
  );
}
