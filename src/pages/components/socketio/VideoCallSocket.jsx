import { io } from "socket.io-client";

let socket = null;

const getSocket = () => {
    if (!socket) {
        const socketUrl = import.meta.env.VITE_API_SOCKET_URL;
        console.log("Connecting to socket:", socketUrl);
        
        socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });
    }
    return socket;
}

const setSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('Socket disconnected and cleared');
    }
}

export default {
    getSocket, 
    setSocket
};