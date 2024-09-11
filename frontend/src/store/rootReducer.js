import layout from "./layoutReducer";
import auth from "@/components/partials/auth/store";
import chat from "@/components/partials/replies/store"

const rootReducer = {
  layout,
  auth,
  chat
};
export default rootReducer;
