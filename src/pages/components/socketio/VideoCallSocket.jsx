// src/components/socketio/VideoCallSocket.js
import { io } from "socket.io-client";

let socket = null;

/**
 * Get or create a Socket.io connection
 * @returns {Socket} Socket.io instance
 */
const getSocket = () => {
    // If socket already exists and is connected, return it
    if (socket && socket.connected) {
        console.log('Reusing existing socket connection:', socket.id);
        return socket;
    }
    
    // If socket exists but disconnected, try to reconnect
    if (socket && !socket.connected) {
        console.log('Reconnecting existing socket...');
        socket.connect();
        return socket;
    }
    
    // Create new socket connection
    const socketUrl = import.meta.env.VITE_API_SOCKET_URL;
    
    if (!socketUrl) {
        console.error('❌ VITE_API_SOCKET_URL is not defined in environment variables');
        throw new Error('Socket URL not configured');
    }
    
    console.log("🔌 Initializing socket connection to:", socketUrl);
    
    socket = io(socketUrl, {
        // Transport configuration
        transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
        
        // Reconnection configuration
        reconnection: true,                   // Enable auto-reconnection
        reconnectionAttempts: 10,             // Try 10 times before giving up
        reconnectionDelay: 1000,              // Wait 1 second before first retry
        reconnectionDelayMax: 5000,           // Max wait time between retries
        
        // Connection configuration
        timeout: 20000,                       // 20 second connection timeout
        autoConnect: true,                    // Connect automatically
        withCredentials: true,                // Send cookies with requests
        
        // Additional options
        forceNew: false,                      // Reuse existing connection if available
        multiplex: true,                      // Use same connection for multiple namespaces
    });

    // ===== Event Listeners =====
    
    // On successful connection
    socket.on('connect', () => {
        console.log('✅ Socket connected successfully!');
        console.log('   Socket ID:', socket.id);
        console.log('   Transport:', socket.io.engine.transport.name);
    });

    // On connection error
    socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        console.error('   Error type:', error.type);
        console.error('   Error description:', error.description);
        
        // Provide helpful error messages
        if (error.message.includes('CORS')) {
            console.error('   💡 Hint: Check CORS configuration on backend');
        } else if (error.message.includes('timeout')) {
            console.error('   💡 Hint: Server might be down or unreachable');
        }
    });

    // On disconnection
    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected');
        console.log('   Reason:', reason);
        
        // Handle different disconnect reasons
        switch (reason) {
            case 'io server disconnect':
                // Server forcefully disconnected, need to manually reconnect
                console.log('   💡 Server disconnected the socket, reconnecting...');
                socket.connect();
                break;
                
            case 'io client disconnect':
                // Client manually disconnected, don't reconnect
                console.log('   💡 You disconnected manually');
                break;
                
            case 'ping timeout':
                // Connection lost, will auto-reconnect
                console.log('   💡 Connection lost (ping timeout), will auto-reconnect');
                break;
                
            case 'transport close':
                // Connection closed, will auto-reconnect
                console.log('   💡 Connection closed, will auto-reconnect');
                break;
                
            case 'transport error':
                // Transport error, will auto-reconnect
                console.log('   💡 Transport error, will auto-reconnect');
                break;
                
            default:
                console.log('   💡 Unknown disconnect reason');
        }
    });

    // On reconnection attempt
    socket.io.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnection attempt #${attemptNumber}`);
    });

    // On successful reconnection
    socket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Socket reconnected successfully after ${attemptNumber} attempts!`);
        console.log('   New Socket ID:', socket.id);
    });

    // On reconnection error
    socket.io.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error.message);
    });

    // On reconnection failed (after all attempts)
    socket.io.on('reconnect_failed', () => {
        console.error('❌ Failed to reconnect after all attempts');
        console.error('   💡 Please refresh the page or check your internet connection');
    });

    // On error event
    socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
    });

    // Transport upgrade (WebSocket -> Polling or vice versa)
    socket.io.engine.on('upgrade', (transport) => {
        console.log('🔄 Transport upgraded to:', transport.name);
    });

    // Ping event (for debugging)
    socket.on('ping', () => {
        console.log('🏓 Ping sent to server');
    });

    // Pong event (for debugging)
    socket.on('pong', (latency) => {
        console.log(`🏓 Pong received from server (latency: ${latency}ms)`);
    });

    return socket;
}

/**
 * Disconnect and cleanup socket connection
 */
const setSocket = () => {
    if (socket) {
        console.log('🔌 Disconnecting socket...');
        
        // Remove all event listeners to prevent memory leaks
        socket.removeAllListeners();
        
        // Disconnect the socket
        socket.disconnect();
        
        // Clear the socket reference
        socket = null;
        
        console.log('✅ Socket disconnected and cleared successfully');
    } else {
        console.log('ℹ️ No socket to disconnect');
    }
}

/**
 * Check if socket is connected
 * @returns {boolean} Connection status
 */
const isConnected = () => {
    return socket && socket.connected;
}

/**
 * Get current socket ID
 * @returns {string|null} Socket ID or null if not connected
 */
const getSocketId = () => {
    return socket?.id || null;
}

/**
 * Manually reconnect socket
 */
const reconnect = () => {
    if (socket) {
        console.log('🔄 Manually reconnecting socket...');
        socket.connect();
    } else {
        console.log('ℹ️ No socket to reconnect, creating new connection...');
        getSocket();
    }
}

// Export functions
export default {
    getSocket,
    setSocket,
    isConnected,
    getSocketId,
    reconnect
};