
import React, { createContext, useContext, useReducer } from "react";

// Crea il contesto globale
export const StateContext = createContext();

// Componente provider che avvolge l’app e fornisce stato globale
export const StateProvider = ({ reducer, initialState, children }) => (
  <StateContext.Provider value={useReducer(reducer, initialState)}>
    {children}
  </StateContext.Provider>
);

// Hook personalizzato per usare lo stato globale con facilità
export const useStateValue = () => useContext(StateContext);

