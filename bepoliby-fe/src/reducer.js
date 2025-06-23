// reducer.js

export const initialState = {
  user: null, // all'inizio non sappiamo chi è l'utente
};

export const actionTypes = {
  SET_USER: "SET_USER",
  LOGOUT: "LOGOUT"
};

const reducer = (state, action) => {
  console.log("Dispatch action:", action);

  switch (action.type) {
    case actionTypes.SET_USER:
      return {
        ...state,
        user: action.user,
      };

    case actionTypes.LOGOUT:
      return {
        ...state,
        user: null,
      };

    default:
      return state;
  }
};

export default reducer;

