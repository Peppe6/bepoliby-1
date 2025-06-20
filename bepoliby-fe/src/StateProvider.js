// StateProvider.js
import React, { createContext, useContext, useReducer } from "react";

// Creo il contesto
export const StateContext = createContext();

// Componente provider che incapsula lo state e dispatch
export const StateProvider = ({ reducer, initialState, children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StateContext.Provider value={[state, dispatch]}>
      {children}
    </StateContext.Provider>
  );
};

// Hook custom per usare il context
export const useStateValue = () => useContext(StateContext);

