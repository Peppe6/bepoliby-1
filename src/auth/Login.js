import React from 'react';
import "./Login.css";
import { auth, provider } from "../firebase";
import { signInWithPopup } from "firebase/auth"; // ✅ Import corretto
import { useStateValue } from '../StateProvider';
import { actionTypes } from '../reducer';
import { saveToLocalStorage } from '../localStore';
const Login = () => {
  const [{ user }, dispatch] = useStateValue();

  const login = () => {
    signInWithPopup(auth, provider) // ✅ Sintassi corretta
      .then((result) => {
        console.log(result);
        dispatch({
          type: actionTypes.SET_USER,
          user: result.user,
        });
        saveToLocalStorage("user",result.user)
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


