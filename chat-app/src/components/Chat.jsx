import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp, onSnapshot, query, where, orderBy, doc, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase-config";
import "../styles/Chat.css"

const Chat = (props) => {
    const { room, setRoom, roomInfo, setRoomInfo } = props;
    const [newMessage, setNewMessage] = useState("");
    const messagesRef = collection(db, "messages");
    const roomsRef = collection(db, "rooms");
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const queryMessages = query(messagesRef, where("room", "==", room), orderBy("createdAt"));
        const unsubscribe = onSnapshot(queryMessages, (snapshot) => {
            let messages = [];
            snapshot.forEach((doc) => {
                messages.push({ ...doc.data(), id: doc.id });
            });
            setMessages(messages);
        });

        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newMessage === "") return;
        await addDoc(messagesRef, {
            text: newMessage,
            createdAt: serverTimestamp(),
            user: auth.currentUser.displayName,
            room,
            userPhoto: auth.currentUser.photoURL
        });
        setNewMessage("");
    }

    const handleBanAndUnban = async (userName, action) => {
        try {
            const roomQuery = query(roomsRef, where("name", "==", room));
            const roomSnapshot = await getDocs(roomQuery);
            if (!roomSnapshot.empty) {
                const roomDoc = roomSnapshot.docs[0];
                let newBannedUsers = roomDoc.data().bannedUsers;
                const roomDocRef = doc(db, "rooms", roomDoc.id);
                if (action === "unban") {
                    newBannedUsers = newBannedUsers.filter((user, _) => user !== userName);
                } else {
                    newBannedUsers = [...newBannedUsers, userName];
                }
                await updateDoc(roomDocRef, {
                    bannedUsers: newBannedUsers
                });
                setRoomInfo({
                    members: roomDoc.data().members,
                    bannedUsers: newBannedUsers,
                    author: roomDoc.data().createdBy
                });
                console.log(`User was successfully ${action}ned!`);
            } else {
                console.log("Room document not found");
            }
        } catch (error) {
            console.error("Error: ", error);
        }
    }

    return (
        <>
            <div className="container">
                <div className="row">
                    <div className="col">
                        <div className="container-fluid message-container">
                            <h3>
                                Current Room: {room} &nbsp;
                                <button className="btn btn-danger" onClick={() => setRoom(null)}>Leave room</button>
                            </h3>
                            <div className="overflow-auto bg-body-tertiary p-3 rounded-2 message-box">
                                {messages.map((message) => (
                                    <div className="message" key={message.id}>
                                        <h6>
                                            <img src={message.userPhoto} className="float-start" alt="User's Profile Picture" />
                                            &nbsp;{message.user}
                                        </h6>
                                        <p>{message.text}</p>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="input-group mb-3">
                                    <input className="form-control" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} type="text" placeholder="Enter your message..." />
                                    <button type="submit" className="btn btn-outline-secondary"><i className="bi bi-send"></i></button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="col-md-auto">
                        <div className="room-members">
                            <h3>Room Members</h3>
                            <ul className="list-group">
                                {
                                    roomInfo.members.map((member, id) => (
                                        <li key={id} className="list-group-item d-flex justify-content-beween align-items-center">
                                            {member}
                                            {roomInfo.author === member ? " (Author)" : roomInfo.bannedUsers.includes(member) ? " (Banned)" : " (Member)"}&nbsp;
                                            {roomInfo.author === auth.currentUser.displayName && roomInfo.author !== member ? roomInfo.bannedUsers.includes(member) ? <button className="btn btn-success" onClick={() => handleBanAndUnban(member, "unban")}><i className="bi bi-unlock-fill"></i>
                                            </button> : <button className="btn btn-danger" onClick={() => handleBanAndUnban(member, "ban")}><i className="bi bi-lock-fill"></i></button> : null}
                                        </li>
                                    ))
                                }
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </>);
}

export default Chat;