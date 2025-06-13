
import React from 'react';
import "./Login.css";
import { auth, provider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { useStateValue } from '../StateProvider';
import { actionTypes } from '../reducer';
import { saveToLocalStorage } from '../localStore';

const Login = () => {
  const [{ user }, dispatch] = useStateValue();

  const login = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        // Estrai solo i dati utili dell'utente
        const userData = {
          uid: result.user.uid,
          displayName: result.user.displayName || "Utente",
          email: result.user.email,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(result.user.displayName || "Utente")}&background=random&color=fff`,
 
        };

        // Salva nel context globale
        dispatch({
          type: actionTypes.SET_USER,
          user: userData,
        });

        // Salva nel localStorage per persistenza
        saveToLocalStorage("user", userData);
      })
      .catch((error) => alert(error.message));
  };

  return (
    <div className="login">
      <div className="login_container">
        <img
          src="https://img.freepik.com/vettori-gratuito/sfondi-neri-sfumati-con-cornici-dorate_23-2149197767.jpg?semt=ais_items_boosted&w=740"
          alt="background"
        />
        <div className="login_text">
          <h1>LOGIN</h1>
          {user && <p>Benvenuto, {user.displayName}</p>}
        </div>
        <button type="button" onClick={login}>Login con Google</button>
      </div>
    </div>
  );
};

export default Login;


