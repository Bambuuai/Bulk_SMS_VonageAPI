  import { configureStore } from "@reduxjs/toolkit";
  import rootReducer from "./rootReducer";

  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => {
      return getDefaultMiddleware({
        serializableCheck: false,
      });
    },
  });

  export default store;

// TODO:  1. Will make sure any phone_number format is accepted
// TODO:  2. Will work on reporting
// TODO:  3. Will work on CSV columns update.
// TODO:  4. Will work on descriptive errors