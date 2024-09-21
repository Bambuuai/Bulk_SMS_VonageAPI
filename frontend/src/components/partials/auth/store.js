import { createSlice } from "@reduxjs/toolkit";
import notify from "@/app/notify";

const initialIsAuth = () => {
  if (typeof window !== "undefined") {
    const localAuth = window?.localStorage.getItem("auth")
    if (localAuth) {
      return localAuth
    }
  }
  return false;
};

const initialAuthData = {
  isAdmin: null,
  username: "",
  firstName: "",
  lastName: "",
  email: "",
  phoneNum: "",
  numbers: []
}

export const authSlice = createSlice({
  name: "auth",
  initialState: {
    auth: initialIsAuth(),
    ...initialAuthData
  },
  reducers: {
    handleAuth: (state, action) => {
      const payload = action.payload
      if (payload.access_token) {
        state.auth = payload.access_token
      }
      state.email = payload.email
      state.username = payload.username
      state.firstName = payload.first_name
      state.lastName = payload.last_name
      state.isAdmin = payload.is_admin
      state.numbers = payload.numbers

      if (typeof window !== "undefined") {
        console.log("Auth is being run")
        window?.localStorage.setItem("auth", state.auth);
      }
      // toast.success("User logged in successfully", {
      //   position: "top-right",
      //   autoClose: 1500,
      //   hideProgressBar: false,
      //   closeOnClick: true,
      //   pauseOnHover: true,
      //   draggable: true,
      //   progress: undefined,
      //   theme: "light",
      // });
    },
    handleLogout: (state, action) => {
      state = {
        ...state,
        auth: action.payload,
        ...initialAuthData
      }
      // remove access_token from local storage
      if (typeof window !== "undefined") {
        window?.localStorage.removeItem("auth");
      }
      notify.success("User logged out successfully", {
        position: "top-right",
      });
    },
  },
});

export const { handleAuth, handleLogout } = authSlice.actions;
export default authSlice.reducer;
