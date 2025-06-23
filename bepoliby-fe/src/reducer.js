

export const initialState = {
  user: JSON.parse(sessionStorage.getItem("user")) || null,
  token: sessionStorage.getItem("token") || null,   // aggiunto token
};

export const actionTypes = {
  SET_USER: "SET_USER",
  SET_TOKEN: "SET_TOKEN",  // opzionale, vedi sotto
  LOGOUT: "LOGOUT",
};

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_USER:
      sessionStorage.setItem("user", JSON.stringify(action.user));
      // se arriva anche token, lo salvo
      if (action.token) {
        sessionStorage.setItem("token", action.token);
      }
      return {
        ...state,
        user: action.user,
        token: action.token || state.token,
      };

    case actionTypes.LOGOUT:
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
      return {
        user: null,
        token: null,
      };

    default:
      return state;
  }
};

export default reducer;

