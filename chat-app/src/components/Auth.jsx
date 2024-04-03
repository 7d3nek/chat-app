import { auth, provider, db } from "../config/firebase-config";
import { signInWithPopup } from "firebase/auth";

import { addDoc, collection, query, getDocs } from "firebase/firestore";

import Cookies from "universal-cookie";
const cookies = new Cookies();

const Auth = (props) => {

    const { setIsAuth } = props;
    const usersRef = collection(db, "users");

    const userExists = async (userId) => {
        const queryUsers = query(usersRef);
        let userExists = false;
        const snapshot = await getDocs(queryUsers);
        snapshot.forEach((doc) => {
            if (doc.data().id === userId) {
                userExists = true;
                return;
            }
        });
        return userExists;
    }

    const createUser = async (id, name, photoUrl) => {
        const newUser = { id, displayName: name, photoURL: photoUrl, createdRooms: 0 };
        await addDoc(usersRef, newUser);
    }

    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            cookies.set("auth-token", result.user.refreshToken);
            const exists = await userExists(result.user.uid);
            if (!exists){
                await createUser(result.user.uid, result.user.displayName, result.user.photoURL);
            }  
            setIsAuth(true);
        } catch (e) {
            console.log(e);
        }
    }

    return (
        <div className="auth">
            <h1>Welcome to Chat Rooms!</h1>
            <p>Sign In With Google To Continue</p>
            <button onClick={signInWithGoogle}>Sign In</button>
        </div>
    );
}


export default Auth;