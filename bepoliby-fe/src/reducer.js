// reducer.js
import { loadFromLocalStorage, saveToLocalStorage } from "./localStore";

export const initialState = {
  user: loadFromLocalStorage("user") || null,
};

export const actionTypes = {
  SET_USER: "SET_USER",
};

const reducer = (state, action) => {
  console.log("Dispatch action:", action);

  switch (action.type) {
    case actionTypes.SET_USER:
      saveToLocalStorage("user", action.user); // salva su localStorage
      return {
        ...state,
        user: action.user,
      };

    default:
      return state;
  }
};

export default reducer;
