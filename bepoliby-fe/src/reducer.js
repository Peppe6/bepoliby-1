
export const initialState = {
  user: null,
  token: null,
};

export const actionTypes = {
  SET_USER: "SET_USER",
  LOGOUT: "LOGOUT",
};

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_USER:
      // Salva in sessionStorage
      sessionStorage.setItem("user", JSON.stringify(action.user));
      sessionStorage.setItem("token", action.token);

      return {
        ...state,
        user: action.user,
        token: action.token,
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

