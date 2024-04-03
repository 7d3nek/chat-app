import { useState, useRef, useEffect } from "react"
import Auth from "./components/Auth"

import Cookies from "universal-cookie";
import Chat from "./components/Chat";
const cookies = new Cookies();

import { addDoc, collection, onSnapshot, query, getDocs, doc, deleteDoc, where, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "./config/firebase-config";

function App() {

  const [isAuth, setIsAuth] = useState(cookies.get("auth-token"));
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomInput, setRoomInput] = useState("");
  const [roomInfo, setRoomInfo] = useState({});
  const roomsRef = collection(db, "rooms");
  const usersRef = collection(db, "users");
  const messagesRef = collection(db, "messages");

  const roomInputRef = useRef(null);

  const signUserOut = async () => {
    await signOut(auth);
    cookies.remove("auth-token");
    setIsAuth(false);
    setRoom(null);
  }

  const containsRoom = async (roomToFind) => {
    const queryRooms = query(roomsRef);
    let roomExists = false;
    const snapshot = await getDocs(queryRooms);
    snapshot.forEach((doc) => {
      if (doc.data().name === roomToFind) {
        roomExists = true;
        return;
      }
    });
    return roomExists;
  }

  useEffect(() => {
    const queryRooms = query(roomsRef);
    const unsubscribe = onSnapshot(queryRooms, (snapshot) => {
      let roomsArr = [];
      snapshot.forEach((doc) => {
        if (!roomsArr.some(r => r.name === doc.data().name)) {
          roomsArr.push({ id: doc.id, createdBy: doc.data().createdBy, name: doc.data().name });
        }
      });
      setRooms(roomsArr);
    });

    return () => unsubscribe();
  }, []);

  const changeRoomsCreated = async (roomsToAdd) => {
    try {
      const userQuery = query(usersRef, where("id", "==", auth.currentUser.uid));
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const roomsCreated = userDoc.data().createdRooms;
        const newRoomsCreated = roomsCreated + roomsToAdd;
        if (newRoomsCreated > 5) {
          console.log("User cannot add any more rooms!");
          return false;
        }
        const userDocRef = doc(db, "users", userDoc.id);
        await updateDoc(userDocRef, {
          createdRooms: newRoomsCreated
        });
        console.log("Document successfully updated with new roomsCreated value:", newRoomsCreated);
        return true;
      } else {
        console.log("User document not found");
      }
    } catch (error) {
      console.error("Error updating document: ", error);
    }
    return false;
  }

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (roomInputRef.current.value === "") return;
    const roomExists = await containsRoom(roomInputRef.current.value);
    if (roomExists) {
      console.log("Room already exists!");
      return;
    }

    const canCreateNewRoom = await changeRoomsCreated(1);
    if (canCreateNewRoom) {
      await addDoc(roomsRef, {
        name: roomInputRef.current.value,
        createdBy: auth.currentUser.displayName,
        members: [auth.currentUser.displayName],
        bannedUsers: []
      });
      console.log("New room was successfully created.")
    }
    setRoomInput("");
  }

  const handleDeleteRoom = async (roomId, roomName) => {
    await deleteDoc(doc(db, "rooms", roomId)).then(async () => {
      await changeRoomsCreated(-1);
      await deleteMessages(roomName);
      console.log("Document successfully deleted!");
    }).catch((error) => {
      console.error("Error removing document: ", error);
    });
  }

  const deleteMessages = async (roomName) => {
    const queryMessages = query(messagesRef, where("room", "==", roomName));
    try {
      const querySnapshot = await getDocs(queryMessages);
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
      console.log("All messages deleted successfully.");
    } catch (error) {
      console.error("Error deleting messages:", error);
    }
  }

  const handleJoinRoom = async (roomName) => {
    try {
      const roomQuery = query(roomsRef, where("name", "==", roomName));
      const roomSnapshot = await getDocs(roomQuery);
      if (!roomSnapshot.empty) {
        const roomDoc = roomSnapshot.docs[0];
        let joinedUsers = roomDoc.data().members;
        const banned = roomDoc.data().bannedUsers;
        if (banned.includes(auth.currentUser.displayName)) {
          console.log("You cannot join this room!");
          return;
        }
        if (joinedUsers.includes(auth.currentUser.displayName)) {
          console.log(`${auth.currentUser.displayName} is already a member of this room!`);
        } else {
          const roomDocRef = doc(db, "rooms", roomDoc.id);
          joinedUsers = [...joinedUsers, auth.currentUser.displayName];
          await updateDoc(roomDocRef, {
            members: joinedUsers
          });
          console.log("New user successfully joined the room!");
        }
        setRoomInfo({
          members: joinedUsers,
          bannedUsers: roomDoc.data().bannedUsers,
          author: roomDoc.data().createdBy
        });
        setRoom(roomName);
      } else {
        console.log("Room document not found");
      }
    } catch (error) {
      console.error("Error: ", error);
    }
  }

  if (!isAuth) {
    return (
      <div>
        <Auth setIsAuth={setIsAuth} />
      </div>
    );
  }

  return (
    auth.currentUser ? <>
      <nav className="navbar navbar-dark bg-dark fixed-top user-info">
        <div className="container-fluid">
          <div className="navbar-brand" href="#">Chat Rooms</div>
          <div className="navbar-brand" href="#">
            <img src={auth.currentUser.photoURL} alt="Your Profile Picture" />&nbsp;
            <span className="userName">{auth.currentUser.displayName}</span>
            <i className="bi bi-box-arrow-right" onClick={signUserOut} style={{ cursor: "pointer" }}></i>
          </div>
        </div>
      </nav>
      {
        room
          ? <div><Chat room={room} setRoom={setRoom} roomInfo={roomInfo} setRoomInfo={setRoomInfo} /></div>
          : <div className='room-container'>
            <form className="d-flex mt-3" id="new-room" name="new-room">
              <input ref={roomInputRef} value={roomInput} onChange={(e) => setRoomInput(e.target.value)} className="form-control me-2" placeholder="Create new room..." />
              <button onClick={handleCreateRoom} className="btn btn-success" type="submit">Create</button>
            </form>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Room Name</th>
                  <th scope="col">Creator</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, i) => (
                  <tr key={i}>
                    <td>{i}</td>
                    <td>{room.name}</td>
                    <td>{room.createdBy}</td>
                    <td>
                      <a className="btn btn-primary" onClick={() => handleJoinRoom(room.name)}>Join</a>
                      {auth.currentUser.displayName === room.createdBy && <a className="btn btn-danger" onClick={() => handleDeleteRoom(room.id, room.name)}>Delete</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </>
      : <h1>Loading...</h1>
  );

}

export default App;
