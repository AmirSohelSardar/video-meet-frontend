import React, { useEffect, useRef, useState, useCallback } from 'react';
import socketInstance from '../components/socketio/VideoCallSocket';
import { 
  FaBars, FaTimes, FaPhoneAlt, FaMicrophone, FaVideo, FaVideoSlash, 
  FaMicrophoneSlash, FaDesktop, FaComments, FaYoutube, FaMusic,
  FaPaperPlane, FaPlay, FaPause, FaVolumeUp, FaVolumeMute 
} from "react-icons/fa";
import { FaPhoneSlash } from "react-icons/fa6";
import { RiLogoutBoxLine } from "react-icons/ri";
import Lottie from "lottie-react";
import { Howl } from "howler";
import wavingAnimation from "../../assets/waving.json";
import apiClient from "../../apiClient";
import { useUser } from '../../context/UserContextApi';
import { useNavigate } from 'react-router-dom';
import Peer from 'simple-peer';

const Dashboard = () => {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();

     useEffect(() => {
    console.log("=== DASHBOARD MOUNTED ===");
    console.log("User from context:", user);
    console.log("LocalStorage raw:", localStorage.getItem("userData"));
    try {
      console.log("LocalStorage parsed:", JSON.parse(localStorage.getItem("userData")));
    } catch (e) {
      console.log("LocalStorage parse error:", e);
    }
    console.log("========================");
  }, []);
  // ============================================
  // 📱 RESPONSIVE & UI STATES
  // ============================================
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  
  // ============================================
  // 👥 USER MANAGEMENT STATES
  // ============================================
  const [users, setUsers] = useState([]);
  const [userOnline, setUserOnline] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================================
  // 📞 CALL MANAGEMENT STATES
  // ============================================
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");
  const [reciveCall, setReciveCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callerWating, setCallerWating] = useState(false);
  const [isCaller, setIsCaller] = useState(false);

  // ============================================
  // 🎥 MEDIA CONTROL STATES
  // ============================================
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);

  // ============================================
  // ⚠️ ERROR & NOTIFICATION STATES
  // ============================================
  const [callRejectedPopUp, setCallRejectedPopUp] = useState(false);
  const [rejectorData, setCallrejectorData] = useState(null);

  // ============================================
  // 💬 CHAT STATES
  // ============================================
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ============================================
  // 🎬 YOUTUBE STATES
  // ============================================
  const [isYouTubeOpen, setIsYouTubeOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [currentYoutubeId, setCurrentYoutubeId] = useState('');
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // ============================================
  // 🎵 MUSIC STATES
  // ============================================
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ============================================
  // 📌 REFS
  // ============================================
  const myVideo = useRef(null);
  const reciverVideo = useRef(null);
  const connectionRef = useRef(null);
  const hasJoined = useRef(false);
  const screenVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  const audioRef = useRef(null);
  const youtubeIframeRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const ringtoneRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // ✅ NEW: Store current call target to prevent race conditions
  const currentCallTargetRef = useRef(null);

  // ============================================
  // 🔔 RINGTONE SETUP
  // ============================================
  useEffect(() => {
    ringtoneRef.current = new Howl({
      src: ["/ringtone.mp3"],
      loop: true,
      volume: 1.0,
      onloaderror: (id, error) => {
        console.error("Ringtone load error:", error);
      },
      onplayerror: (id, error) => {
        console.error("Ringtone play error:", error);
      }
    });

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.unload();
      }
    };
  }, []);

  // ✅ FIXED CODE:
const socketRef = useRef(null);

// Get socket instance
const getSocketInstance = useCallback(() => {
  if (!socketRef.current) {
    socketRef.current = socketInstance.getSocket();
  }
  return socketRef.current;
}, []);

  // ============================================
  // 📱 RESPONSIVE HANDLER
  // ============================================
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================
  // 🎵 AUDIO SETUP
  // ============================================
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume / 100;
    }
  }, [audioVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsAudioPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // ============================================
  // 💬 AUTO-SCROLL CHAT
  // ============================================
  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // ============================================
  // 🎬 YOUTUBE HEARTBEAT SYNC (IMPROVED)
  // ============================================
 useEffect(() => {
  if (isCaller && currentYoutubeId && callAccepted && isYouTubeOpen) {
    const socket = getSocketInstance();
    let lastVideoTime = 0;
    let lastPlayerState = -1;
    
    const handleYouTubeMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === 'infoDelivery' && data.info) {
          const { currentTime: videoTime, playerState } = data.info;
          
          if (videoTime !== undefined) lastVideoTime = videoTime;
          if (playerState !== undefined) lastPlayerState = playerState;
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    window.addEventListener('message', handleYouTubeMessage);
    
    // ✅ Use ref instead of state
    syncIntervalRef.current = setInterval(() => {
      const iframe = youtubeIframeRef.current;
      if (!iframe?.contentWindow) return;

      iframe.contentWindow.postMessage(
        '{"event":"listening","channel":"widget"}',  // ✅ Enable listening first
        '*'
      );

      iframe.contentWindow.postMessage(
        '{"event":"command","func":"getCurrentTime","args":""}',
        '*'
      );
      iframe.contentWindow.postMessage(
        '{"event":"command","func":"getPlayerState","args":""}',
        '*'
      );
      
      // ✅ Use ref instead of state
      const targetUser = currentCallTargetRef.current || caller?.from;
      
      if (lastVideoTime >= 0 && targetUser) {  // ✅ Allow 0 time
        socket.emit("youtube-sync", {
          to: targetUser,  // ✅ Use ref, not state
          videoId: currentYoutubeId,
          currentTime: lastVideoTime,
          isPlaying: lastPlayerState === 1
        });
      }
    }, 2000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      window.removeEventListener('message', handleYouTubeMessage);
    };
  }
}, [isCaller, currentYoutubeId, callAccepted, isYouTubeOpen, getSocketInstance, caller]);

  // ============================================
  // 🎥 WEBRTC CONFIGURATION (✅ FIXED WITH VALID TURN SERVERS)
  // ============================================
 const getWebRTCConfig = useCallback(() => {
    return {
      iceServers: [
        // Google STUN servers
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        
        // ✅ Multiple FREE TURN servers for better reliability
        
        // Metered.ca TURN (Most reliable)
        {
          urls: 'turn:a.relay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: 'turn:a.relay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: 'turns:a.relay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        
        // Backup TURN servers
        {
          urls: 'turn:numb.viagenie.ca',
          username: 'webrtc@live.com',
          credential: 'muazkh'
        },
        {
          urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
          username: 'webrtc',
          credential: 'webrtc'
        }
      ],
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
  }, []);

  // ============================================
  // 🧹 CLEANUP FUNCTION (IMPROVED)
  // ============================================
  const endCallCleanup = useCallback(() => {
    console.log("🔴 Cleaning up call resources...");
    
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log("🛑 Stopped track:", track.kind);
      });
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    
    if (reciverVideo.current) {
      reciverVideo.current.srcObject = null;
    }
    
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    
    // ✅ Clear call target ref
    currentCallTargetRef.current = null;
    
    setCallerWating(false);
    setStream(null);
    setScreenStream(null);
    setRemoteScreenStream(null);
    setIsScreenSharing(false);
    setReciveCall(false);
    setCallAccepted(false);
    setSelectedUser(null);
    setIsCaller(false);
    setMessages([]);
    setCurrentYoutubeId('');
    setIsYouTubeOpen(false);
    setIsMusicOpen(false);
    setIsChatOpen(false);
    setCaller(null);
    setCallerSignal(null);
    
    console.log("✅ Cleanup complete");
  }, [stream, screenStream]);

  // ============================================
  // 🎮 SOCKET EVENT HANDLERS (✅ FIXED)
  // ============================================
useEffect(() => {
  const socket = getSocketInstance();
  
  if (!socket || !user) return;

 if (!hasJoined.current) {
    console.log("🔌 Joining socket room...");
    
    // ✅ FIX: Wait for socket to be fully connected before joining
    if (socket.connected) {
      socket.emit("join", { id: user._id, name: user.username });
      hasJoined.current = true;
    } else {
      socket.once('connect', () => {
        socket.emit("join", { id: user._id, name: user.username });
        hasJoined.current = true;
      });
    }
  }
    
    // ============================================
    // 📡 BASIC SOCKET EVENTS
    // ============================================
    const handleMe = (id) => {
      console.log("✅ My socket ID:", id);
      setMe(id);
    };

    const handleOnlineUsers = (onlineUsers) => {
      console.log("👥 Online users updated:", onlineUsers.length);
      setUserOnline(onlineUsers);
    };

    // ============================================
    // 📞 INCOMING CALL HANDLER (✅ FIXED)
    // ============================================
    const handleIncomingCall = (data) => {
      console.log("📞 Incoming call from:", data.name);
      
      setReciveCall(true);
      setCaller(data);
      setCallerName(data.name);
      setCallerSignal(data.signal);
      
      if (ringtoneRef.current && !ringtoneRef.current.playing()) {
        ringtoneRef.current.play();
      }
      
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      
      callTimeoutRef.current = setTimeout(() => {
        if (ringtoneRef.current) {
          ringtoneRef.current.stop();
        }
        setReciveCall(false);
        console.log("⏰ Call timeout - auto-rejected");
      }, 30000);
    };

    // ============================================
    // ❌ CALL REJECTED HANDLER
    // ============================================
    const handleCallRejected = (data) => {
      console.log("❌ Call rejected by:", data.name);
      
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
      }
      
      setCallRejectedPopUp(true);
      setCallrejectorData(data);
      setCallerWating(false);
    };

    // ============================================
    // 📵 CALL ENDED HANDLER
    // ============================================
    const handleCallEnded = (data) => {
      console.log("📵 Call ended by:", data.name);
      
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
      }
      
      endCallCleanup();
    };

    // ============================================
    // ⚠️ USER UNAVAILABLE/BUSY HANDLERS
    // ============================================
    const handleUserUnavailable = (data) => {
      alert(data.message || "User is not available.");
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
      }
      setCallerWating(false);
    };

    const handleUserBusy = (data) => {
      alert(data.message || "User is currently in another call.");
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
      }
      setCallerWating(false);
    };

    // ============================================
    // 🖥️ SCREEN SHARE HANDLERS
    // ============================================
    const handleScreenShareStarted = (data) => {
      console.log("🖥️ Remote user started screen sharing");
    };

    const handleScreenShareStopped = () => {
      console.log("🖥️ Remote user stopped screen sharing");
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      setRemoteScreenStream(null);
    };

    // ============================================
    // 💬 CHAT HANDLER
    // ============================================
    const handleReceiveMessage = (data) => {
      const message = {
        id: Date.now() + Math.random(),
        text: data.message,
        sender: data.sender,
        timestamp: data.timestamp,
        isOwn: false
      };
      setMessages(prev => [...prev, message]);
    };

    // ============================================
    // 🎬 YOUTUBE HANDLERS
    // ============================================
    const handleYoutubeLoad = (data) => {
      console.log("🎬 Loading YouTube video:", data.videoId);
      setCurrentYoutubeId(data.videoId);
      setIsYouTubeOpen(true);
      setIsYoutubePlaying(false);
      setIsSyncing(false);
    };

    const handleYoutubeSync = (data) => {
      if (!isCaller && youtubeIframeRef.current) {
        setIsSyncing(true);
        const iframe = youtubeIframeRef.current;
        
        setIsYoutubePlaying(data.isPlaying);
        
        const playPauseCommand = data.isPlaying 
          ? '{"event":"command","func":"playVideo","args":""}' 
          : '{"event":"command","func":"pauseVideo","args":""}';
        iframe.contentWindow.postMessage(playPauseCommand, '*');
        
        setTimeout(() => {
          const seekCommand = `{"event":"command","func":"seekTo","args":[${data.currentTime}, true]}`;
          iframe.contentWindow.postMessage(seekCommand, '*');
          setIsSyncing(false);
        }, 100);
      }
    };

    // ============================================
    // 🎵 MUSIC HANDLERS
    // ============================================
    const handleMusicLoad = (data) => {
      console.log("🎵 Loading music:", data.audioUrl);
      setAudioUrl(data.audioUrl);
      if (audioRef.current) {
        audioRef.current.src = data.audioUrl;
        audioRef.current.load();
      }
      setIsMusicOpen(true);
      setIsAudioPlaying(false);
    };

    const handleMusicPlay = (data) => {
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime;
        if (data.isPlaying) {
          audioRef.current.play().catch(e => console.log("Audio play error:", e));
        } else {
          audioRef.current.pause();
        }
      }
      setIsAudioPlaying(data.isPlaying);
    };

    const handleMusicSeek = (data) => {
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime;
      }
      setCurrentTime(data.currentTime);
    };

    const handleMusicVolume = (data) => {
      setAudioVolume(data.volume);
      if (audioRef.current) {
        audioRef.current.volume = data.volume / 100;
      }
    };

    const handlePeerDisconnected = () => {
      console.log("🔌 Peer disconnected");
      endCallCleanup();
    };

    // ============================================
    // 📌 REGISTER ALL SOCKET LISTENERS
    // ============================================
    socket.on("me", handleMe);
    socket.on("callToUser", handleIncomingCall);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);
    socket.on("userUnavailable", handleUserUnavailable);
    socket.on("userBusy", handleUserBusy);
    socket.on("online-users", handleOnlineUsers);
    socket.on("screenShareStarted", handleScreenShareStarted);
    socket.on("screenShareStopped", handleScreenShareStopped);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("youtube-load", handleYoutubeLoad);
    socket.on("youtube-sync", handleYoutubeSync);
    socket.on("music-load", handleMusicLoad);
    socket.on("music-play", handleMusicPlay);
    socket.on("music-seek", handleMusicSeek);
    socket.on("music-volume", handleMusicVolume);
    socket.on("peer-disconnected", handlePeerDisconnected);

    // ============================================
    // 🧹 CLEANUP ALL LISTENERS
    // ============================================
     return () => {
    socket.off("me", handleMe);
    socket.off("callToUser", handleIncomingCall);
    socket.off("callRejected", handleCallRejected);
    socket.off("callEnded", handleCallEnded);
    socket.off("userUnavailable", handleUserUnavailable);
    socket.off("userBusy", handleUserBusy);
    socket.off("online-users", handleOnlineUsers);
    socket.off("screenShareStarted", handleScreenShareStarted);
    socket.off("screenShareStopped", handleScreenShareStopped);
    socket.off("receive-message", handleReceiveMessage);
    socket.off("youtube-load", handleYoutubeLoad);
    socket.off("youtube-sync", handleYoutubeSync);
    socket.off("music-load", handleMusicLoad);
    socket.off("music-play", handleMusicPlay);
    socket.off("music-seek", handleMusicSeek);
    socket.off("music-volume", handleMusicVolume);
    socket.off("peer-disconnected", handlePeerDisconnected);
  };
}, [user, getSocketInstance, endCallCleanup]);

  // ============================================
  // 🎬 START CALL FUNCTION (✅ MAJOR FIX - RACE CONDITION RESOLVED)
  // ============================================
  const startCall = useCallback(async (userToCall) => {
    try {
      console.log("🎬 Starting call to:", userToCall.username);
      
      // ✅ CRITICAL FIX: Set target user IMMEDIATELY in ref
      currentCallTargetRef.current = userToCall._id;
      
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      console.log("📹 Got media stream");
      setStream(currentStream);
      
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
        myVideo.current.muted = true;
        myVideo.current.volume = 0;
      }
      
      // ✅ Update UI state
      setCallRejectedPopUp(false);
      setIsSidebarOpen(false);
      setCallerWating(true);
      setSelectedUser(userToCall._id);
      setIsCaller(true);
      
      // ✅ Create peer connection
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream,
        config: getWebRTCConfig()
      });
      
      console.log("🔗 Peer connection created");
      
      // ============================================
      // 📡 PEER EVENT HANDLERS
      // ============================================
      
      // ✅ CRITICAL FIX: Use ref instead of state to avoid stale closure
      peer.on("signal", (data) => {
        console.log("📡 Sending call signal to:", currentCallTargetRef.current);
        
        if (!currentCallTargetRef.current) {
          console.error("❌ No target user ID available!");
          return;
        }
        
        getSocketInstance().emit("callToUser", {
          callToUserId: currentCallTargetRef.current, // ✅ Use ref, not state
          signalData: data,
          from: me,
          name: user.username,
          email: user.email,
          profilepic: user.profilepic,
        });
      });
      
      peer.on("stream", (remoteStream) => {
        console.log("📹 Received remote stream");
        
        const videoTrack = remoteStream.getVideoTracks()[0];
        
        if (videoTrack && videoTrack.label.includes('screen')) {
          console.log("🖥️ Remote screen share detected");
          setRemoteScreenStream(remoteStream);
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = remoteStream;
          }
        } else {
          console.log("📹 Remote camera stream detected");
          if (reciverVideo.current) {
            reciverVideo.current.srcObject = remoteStream;
            reciverVideo.current.muted = false;
            reciverVideo.current.volume = 1.0;
          }
        }
      });

      peer.on("error", (err) => {
        console.error("❌ Peer connection error:", err);
        
        let errorMessage = "Connection error occurred.";
        
        if (err.message.includes("Failed to set remote answer sdp")) {
          errorMessage = "Connection failed. The other user may have poor internet.";
        } else if (err.message.includes("negotiation")) {
          errorMessage = "Connection negotiation failed. Try again.";
        } else if (err.message.includes("ice")) {
          errorMessage = "Network connection failed. Check your internet.";
        }
        
        alert(errorMessage);
        endCallCleanup();
      });

      peer.on("close", () => {
        console.log("🔌 Peer connection closed");
        endCallCleanup();
      });
      
      // ✅ Listen for call acceptance (use once to prevent duplicates)
 getSocketInstance().once("callAccepted", (data) => {
  console.log("✅ Call accepted, establishing connection...");
  
  if (ringtoneRef.current) {
    ringtoneRef.current.stop();
  }
  
  setCallRejectedPopUp(false);
  setCallAccepted(true);
  setCallerWating(false);
  setCaller(data.from);
  
  peer.signal(data.signal);
});
      
      connectionRef.current = peer;
      setShowUserDetailModal(false);
      
    } catch (error) {
      console.error("❌ Error starting call:", error);
      
      if (error.name === 'NotAllowedError') {
        alert("Camera/microphone permission denied. Please allow access and try again.");
      } else if (error.name === 'NotFoundError') {
        alert("No camera or microphone found. Please check your device.");
      } else if (error.name === 'NotReadableError') {
        alert("Camera/microphone is already in use by another application.");
      } else {
        alert("Cannot access camera/microphone: " + error.message);
      }
      
      setCallerWating(false);
      currentCallTargetRef.current = null;
    }
  }, [me, user, getWebRTCConfig, endCallCleanup, getSocketInstance]);

  // ============================================
  // ✅ ACCEPT CALL FUNCTION (✅ FIXED)
  // ============================================
  const handelacceptCall = useCallback(async () => {
    try {
      console.log("📞 Accepting call...");
      
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
      }
      
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });

      console.log("📹 Got media stream");
      setStream(currentStream);

      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
        myVideo.current.muted = true;
        myVideo.current.volume = 0;
      }

      setCallAccepted(true);
      setReciveCall(false);
      setCallerWating(false);
      setIsSidebarOpen(false);
      setSelectedUser(caller.from);
      setIsCaller(false);

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream,
        config: getWebRTCConfig()
      });

      console.log("🔗 Peer connection created");

      peer.on("signal", (data) => {
        console.log("📡 Sending answer signal");
        getSocketInstance().emit("answeredCall", {
          signal: data,
          from: me,
          to: caller.from,
        });
      });

      peer.on("stream", (remoteStream) => {
        console.log("📹 Received remote stream");
        
        const videoTrack = remoteStream.getVideoTracks()[0];
        
        if (videoTrack && videoTrack.label.includes('screen')) {
          console.log("🖥️ Remote screen share detected");
          setRemoteScreenStream(remoteStream);
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = remoteStream;
          }
        } else {
          console.log("📹 Remote camera stream detected");
          if (reciverVideo.current) {
            reciverVideo.current.srcObject = remoteStream;
            reciverVideo.current.muted = false;
            reciverVideo.current.volume = 1.0;
          }
        }
      });

      peer.on("error", (err) => {
        console.error("❌ Peer connection error:", err);
        
        let errorMessage = "Connection error occurred.";
        
        if (err.message.includes("Failed to set remote answer sdp")) {
          errorMessage = "Connection failed. The caller may have poor internet.";
        } else if (err.message.includes("negotiation")) {
          errorMessage = "Connection negotiation failed. Try again.";
        } else if (err.message.includes("ice")) {
          errorMessage = "Network connection failed. Check your internet.";
        }
        
        alert(errorMessage);
        endCallCleanup();
      });

      peer.on("close", () => {
        console.log("🔌 Peer connection closed");
        endCallCleanup();
      });

      if (callerSignal) {
        console.log("📡 Processing incoming signal");
        peer.signal(callerSignal);
      }

      connectionRef.current = peer;
      
    } catch (error) {
      console.error("❌ Error accepting call:", error);
      
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
      }
      
      if (error.name === 'NotAllowedError') {
        alert("Camera/microphone permission denied. Please allow access and try again.");
      } else if (error.name === 'NotFoundError') {
        alert("No camera or microphone found. Please check your device.");
      } else if (error.name === 'NotReadableError') {
        alert("Camera/microphone is already in use by another application.");
      } else {
        alert("Cannot access camera/microphone: " + error.message);
      }
      
      getSocketInstance().emit("reject-call", {
        to: caller?.from,
        name: user.username,
        profilepic: user.profilepic
      });
      
      setReciveCall(false);
      setCallAccepted(false);
    }
  }, [me, user, caller, callerSignal, getWebRTCConfig, endCallCleanup, getSocketInstance]);

  // ============================================
  // ❌ REJECT CALL FUNCTION
  // ============================================
  const handelrejectCall = useCallback(() => {
    console.log("❌ Rejecting call");
    
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    
    getSocketInstance().emit("reject-call", {
      to: caller?.from,
      name: user.username,
      profilepic: user.profilepic
    });
    
    setCallerWating(false);
    setReciveCall(false);
    setCallAccepted(false);
    setCaller(null);
    setCallerSignal(null);
  }, [user, caller, getSocketInstance]);
  // ============================================
  // 📵 END CALL FUNCTION
  // ============================================
  const handelendCall = useCallback(() => {
    console.log("🔴 Ending call...");
    
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    
    getSocketInstance().emit("call-ended", {
      to: caller?.from || selectedUser,
      name: user.username
    });

    endCallCleanup();
  }, [user, caller, selectedUser, endCallCleanup, getSocketInstance]);

  // ============================================
  // 🎤 TOGGLE MICROPHONE
  // ============================================
  const toggleMic = useCallback(() => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      
      if (audioTracks.length > 0) {
        const newMicState = !isMicOn;
        audioTracks.forEach(track => {
          track.enabled = newMicState;
        });
        setIsMicOn(newMicState);
        console.log(`🎤 Microphone ${newMicState ? 'enabled' : 'disabled'}`);
      }
    }
  }, [stream, isMicOn]);

  // ============================================
  // 📹 TOGGLE CAMERA
  // ============================================
  const toggleCam = useCallback(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      
      if (videoTracks.length > 0) {
        const newCamState = !isCamOn;
        videoTracks.forEach(track => {
          track.enabled = newCamState;
        });
        setIsCamOn(newCamState);
        console.log(`📹 Camera ${newCamState ? 'enabled' : 'disabled'}`);
      }
    }
  }, [stream, isCamOn]);


  // ============================================
  // 🖥️ SCREEN SHARE FUNCTIONS (IMPROVED)
  // ============================================
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        console.log("🖥️ Starting screen share...");
        
        const screenMediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            displaySurface: "monitor",
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            frameRate: { ideal: 30, max: 60 }
          },
          audio: false
        });

        setScreenStream(screenMediaStream);
        setIsScreenSharing(true);

        const screenTrack = screenMediaStream.getVideoTracks()[0];
        
        if (connectionRef.current && connectionRef.current._pc) {
          const senders = connectionRef.current._pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          
          if (videoSender) {
            await videoSender.replaceTrack(screenTrack);
            console.log("✅ Screen track replaced in peer connection");
          }
        }

        getSocketInstance().emit("screenShareStarted", {
          to: caller?.from || selectedUser
        });

        screenTrack.onended = () => {
          console.log("🖥️ Screen share stopped by user");
          stopScreenShare();
        };

      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error("❌ Error sharing screen:", error);
      
      if (error.name === 'NotAllowedError') {
        alert("Screen sharing permission denied.");
      } else if (error.name === 'NotFoundError') {
        alert("No screen available to share.");
      } else {
        alert("Could not share screen. Please try again.");
      }
    }
  }, [isScreenSharing, caller, selectedUser, getSocketInstance]);

  const stopScreenShare = useCallback(async () => {
    console.log("🛑 Stopping screen share...");
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    if (stream && connectionRef.current && connectionRef.current._pc) {
      const videoTrack = stream.getVideoTracks()[0];
      const senders = connectionRef.current._pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');

      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack);
        console.log("✅ Camera track restored in peer connection");
      }
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    getSocketInstance().emit("screenShareStopped", {
      to: caller?.from || selectedUser
    });
  }, [screenStream, stream, caller, selectedUser, getSocketInstance]);

  // ============================================
  // 💬 CHAT FUNCTIONS
  // ============================================
  const sendMessage = useCallback((e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const message = {
      id: Date.now() + Math.random(),
      text: newMessage,
      sender: user.username,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true
    };

    setMessages(prev => [...prev, message]);
    
    getSocketInstance().emit("send-message", {
      to: selectedUser,
      message: newMessage,
      sender: user.username,
      timestamp: message.timestamp
    });

    setNewMessage('');
  }, [newMessage, selectedUser, user, getSocketInstance]);
  // ============================================
  // 🎬 YOUTUBE FUNCTIONS
  // ============================================
  const extractYoutubeId = useCallback((url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }, []);

  const loadYoutubeVideo = useCallback(() => {
    if (!isCaller) {
      alert("Only the caller can control YouTube!");
      return;
    }

    const videoId = extractYoutubeId(youtubeUrl);
    if (videoId) {
      console.log("🎬 Loading YouTube video:", videoId);
      
      setCurrentYoutubeId(videoId);
      setIsYoutubePlaying(false);
      
      getSocketInstance().emit("youtube-load", {
        to: selectedUser,
        videoId: videoId
      });
      
      setYoutubeUrl('');
    } else {
      alert('Invalid YouTube URL. Please use a valid YouTube link.');
    }
  }, [isCaller, youtubeUrl, extractYoutubeId, selectedUser, getSocketInstance]);

  const toggleYoutubePlay = useCallback(() => {
    if (!isCaller) {
      alert("Only the caller can control YouTube!");
      return;
    }

    if (!youtubeIframeRef.current) return;

    const newPlayingState = !isYoutubePlaying;
    setIsYoutubePlaying(newPlayingState);
    
    const iframe = youtubeIframeRef.current;
    const command = newPlayingState 
      ? '{"event":"command","func":"playVideo","args":""}' 
      : '{"event":"command","func":"pauseVideo","args":""}';
    
    iframe.contentWindow.postMessage(command, '*');
    
    console.log(`🎬 YouTube ${newPlayingState ? 'playing' : 'paused'}`);
  }, [isCaller, isYoutubePlaying]);

  // ============================================
  // 🎵 MUSIC FUNCTIONS
  // ============================================
  const loadAudio = useCallback(() => {
    if (!isCaller) {
      alert("Only the caller can control music!");
      return;
    }

    if (audioUrl.trim()) {
      console.log("🎵 Loading music:", audioUrl);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
      
      getSocketInstance().emit("music-load", {
        to: selectedUser,
        audioUrl: audioUrl
      });
      
      setAudioUrl('');
      setIsAudioPlaying(false);
    } else {
      alert('Please enter a valid MP3 URL');
    }
  }, [isCaller, audioUrl, selectedUser, getSocketInstance]);
  const toggleAudioPlay = useCallback(() => {
    if (!isCaller) {
      alert("Only the caller can control music!");
      return;
    }

    const audio = audioRef.current;
    if (!audio || !audio.src) {
      alert("No audio loaded!");
      return;
    }

    const newPlayingState = !isAudioPlaying;
    const currentTime = audio.currentTime;

    if (newPlayingState) {
      audio.play().catch(e => {
        console.error("Audio play error:", e);
        alert("Could not play audio. Try again.");
      });
    } else {
      audio.pause();
    }
    
    setIsAudioPlaying(newPlayingState);

    getSocketInstance().emit("music-play", {
      to: selectedUser,
      isPlaying: newPlayingState,
      currentTime: currentTime
    });
    
    console.log(`🎵 Music ${newPlayingState ? 'playing' : 'paused'}`);
  }, [isCaller, isAudioPlaying, selectedUser, getSocketInstance]);

  const seekAudio = useCallback((e) => {
    if (!isCaller) return;

    const audio = audioRef.current;
    if (!audio) return;
    
    const seekTime = (e.target.value / 100) * duration;
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);

    getSocketInstance().emit("music-seek", {
      to: selectedUser,
      currentTime: seekTime
    });
  }, [isCaller, duration, selectedUser, getSocketInstance]);

  const changeVolume = useCallback((newVolume) => {
    if (!isCaller) return;

    setAudioVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }

    getSocketInstance().emit("music-volume", {
      to: selectedUser,
      volume: newVolume
    });
  }, [isCaller, selectedUser, getSocketInstance]);

  const toggleAudioMute = useCallback(() => {
    if (!isCaller) {
      alert("Only the caller can control music!");
      return;
    }

    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
    }
  }, [isCaller]);

  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // ============================================
  // 👥 USER MANAGEMENT FUNCTIONS
  // ============================================
const allusers = useCallback(async () => {
    try {
      setLoading(true);
      
      // ✅ FIX: Check userData AND token exist
      const userData = localStorage.getItem('userData');
      if (!userData) {
        console.warn('⚠️ No userData found, cannot fetch users');
        setLoading(false);
        return;
      }
      
      const parsed = JSON.parse(userData);
      if (!parsed.token) {
        console.warn('⚠️ No token found, cannot fetch users');
        setLoading(false);
        return;
      }
      
      // ✅ FIX: Add small delay to ensure token is set in headers
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await apiClient.get('/user');
      if (response.data.success !== false) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("❌ Failed to fetch users:", error);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('userData');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    allusers();
  }, [allusers]);

  const isOnlineUser = useCallback((userId) => {
    return userOnline.some((u) => u.userId === userId);
  }, [userOnline]);

  const handelSelectedUser = useCallback((userId) => {
    if (callAccepted || reciveCall) {
      alert("You must end the current call before starting a new one.");
      return;
    }
    const selected = filteredUsers.find(user => user._id === userId);
    setModalUser(selected);
    setShowUserDetailModal(true);
  }, [callAccepted, reciveCall]);

const filteredUsers = users.filter((u) => {
  const username = u?.username?.toLowerCase() || "";
  const email = u?.email?.toLowerCase() || "";
  const query = searchQuery.toLowerCase();

  return username.includes(query) || email.includes(query);
});

const handleLogout = useCallback(async () => {
  if (callAccepted || reciveCall) {
    alert("You must end the call before logging out.");
    return;
  }
  try {
    await apiClient.post('/auth/logout');
    
    const socket = getSocketInstance(); // ✅ Get socket here
    socket.off("disconnect");
    socket.disconnect();
    socketInstance.setSocket();
    
    socketRef.current = null; // ✅ Clear ref
    
    updateUser(null);
    localStorage.removeItem("userData");
    
    navigate('/login');
  } catch (error) {
    console.error("Logout failed", error);
  }
}, [callAccepted, reciveCall, getSocketInstance, updateUser, navigate]);

  // ============================================
  // 🎨 RENDER: MAIN DASHBOARD UI
  // ============================================
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden"
          style={{ zIndex: 9 }}
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* SIDEBAR */}
      <aside
        className={`bg-gradient-to-br from-blue-900 to-purple-800 text-white w-full md:w-64 h-screen p-4 space-y-4 fixed transition-transform duration-300 overflow-y-auto ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        style={{ zIndex: 10 }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Users</h1>
          <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FaTimes />
          </button>
        </div>

        <input
          type="text"
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 mb-2"
        />

        <ul className="space-y-4 overflow-y-auto max-h-[calc(100vh-250px)]">
          {loading ? (
            <div className="text-center text-white">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-white">No users found</div>
          ) : (
            filteredUsers.map((user) => (
              <li
                key={user._id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                  selectedUser === user._id
                    ? "bg-green-600 shadow-lg"
                    : "bg-gradient-to-r from-purple-600 to-blue-400 hover:shadow-md"
                }`}
              >
                <div className="relative">
                  <img
                    src={user.profilepic || "/default-avatar.png"}
                    alt={`${user.username}'s profile`}
                    className="w-10 h-10 rounded-full border-2 border-white object-cover"
                  />
                  {isOnlineUser(user._id) && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full shadow-lg animate-pulse"></span>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-sm truncate">{user.username}</span>
                  <span className="text-xs text-gray-300 truncate">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (callAccepted || reciveCall) {
                      alert("You must end the current call before starting a new one.");
                      return;
                    }
                    setModalUser(user);
                    startCall(user);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition-all flex-shrink-0"
                  title="Call"
                >
                  <FaPhoneAlt size={16} />
                </button>
              </li>
            ))
          )}
        </ul>

        {user && (
          <div
            onClick={handleLogout}
            className="absolute bottom-2 left-4 right-4 flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 cursor-pointer rounded-lg transition-colors"
          >
            <RiLogoutBoxLine />
            <span>Logout</span>
          </div>
        )}
      </aside>

      {/* VIDEO CALL SCREEN OR HOME */}
      {selectedUser || reciveCall || callAccepted ? (
        <div className="relative w-full h-screen bg-black flex items-center justify-center md:ml-64">
          {/* Waiting Screen */}
          {callerWating ? (
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2 text-white">Calling...</p>
              <img
                src={modalUser?.profilepic || "/default-avatar.png"}
                alt="User"
                className="w-20 h-20 rounded-full border-4 border-blue-500 animate-bounce"
              />
              <h3 className="text-lg font-bold mt-3 text-white">{modalUser?.username}</h3>
              <p className="text-sm text-gray-300">{modalUser?.email}</p>
            </div>
          ) : (
            <>
              {/* Remote Video/Screen */}
              {remoteScreenStream ? (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="absolute top-0 left-0 w-full h-full object-contain"
                />
              ) : (
                <video
                  ref={reciverVideo}
                  autoPlay
                  playsInline
                  className="absolute top-0 left-0 w-full h-full object-contain"
                />
              )}
            </>
          )}

          {/* Local Video (PiP) */}
          <div className={`absolute ${isMobile ? 'bottom-20 right-2' : 'bottom-4 right-4'} bg-gray-900 rounded-lg overflow-hidden shadow-2xl ${isMobile ? 'w-24 h-32' : 'w-40 md:w-56 h-32 md:h-52'}`}>
            <video
              ref={myVideo}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-lg"
            />
          </div>

          {/* Top Bar */}
          <div className="absolute top-4 left-4 text-white text-lg font-bold flex gap-2 items-center z-10">
            <button
              type="button"
              className="md:hidden text-2xl text-white cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
            >
              <FaBars />
            </button>
            {callerName || "In Call"}
          </div>

          {/* Controller Badge */}
          {callAccepted && (
            <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm z-10">
              {isCaller ? "👑 Controller" : "👀 Viewer"}
            </div>
          )}

          {/* Sync Indicator */}
          {isSyncing && !isCaller && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse z-10">
              <FaYoutube />
              <span className="text-sm">Syncing...</span>
            </div>
          )}

          {/* Screen Share Indicator */}
          {isScreenSharing && (
            <div className="absolute top-16 right-4 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 z-10">
              <FaDesktop />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Sharing Screen</span>
            </div>
          )}

          {/* Feature Buttons */}
          {callAccepted && (
            <div className={`absolute ${isMobile ? 'top-20 right-2' : 'top-28 right-4'} flex flex-col gap-3 z-10`}>
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`bg-blue-600 hover:bg-blue-700 text-white ${isMobile ? 'p-2' : 'p-3'} rounded-full shadow-lg transition-all`}
                title="Live Chat"
              >
                <FaComments size={isMobile ? 16 : 20} />
              </button>
              <button
                onClick={() => setIsYouTubeOpen(!isYouTubeOpen)}
                className={`bg-red-600 hover:bg-red-700 text-white ${isMobile ? 'p-2' : 'p-3'} rounded-full shadow-lg transition-all`}
                title="Watch YouTube Together"
              >
                <FaYoutube size={isMobile ? 16 : 20} />
              </button>
              <button
                onClick={() => setIsMusicOpen(!isMusicOpen)}
                className={`bg-green-600 hover:bg-green-700 text-white ${isMobile ? 'p-2' : 'p-3'} rounded-full shadow-lg transition-all`}
                title="Listen to Music Together"
              >
                <FaMusic size={isMobile ? 16 : 20} />
              </button>
            </div>
          )}

          {/* Call Controls */}
          <div className={`absolute ${isMobile ? 'bottom-2' : 'bottom-4'} w-full flex justify-center gap-3 md:gap-4 px-4 z-10`}>
            <button
              type="button"
              className={`bg-red-600 ${isMobile ? 'p-3' : 'p-4'} rounded-full text-white shadow-lg cursor-pointer hover:bg-red-700 transition-all`}
              onClick={handelendCall}
            >
              <FaPhoneSlash size={isMobile ? 20 : 24} />
            </button>

            <button
              type="button"
              onClick={toggleMic}
              className={`${isMobile ? 'p-3' : 'p-4'} rounded-full text-white shadow-lg cursor-pointer transition-colors ${
                isMicOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isMicOn ? <FaMicrophone size={isMobile ? 20 : 24} /> : <FaMicrophoneSlash size={isMobile ? 20 : 24} />}
            </button>

            <button
              type="button"
              onClick={toggleCam}
              className={`${isMobile ? 'p-3' : 'p-4'} rounded-full text-white shadow-lg cursor-pointer transition-colors ${
                isCamOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isCamOn ? <FaVideo size={isMobile ? 20 : 24} /> : <FaVideoSlash size={isMobile ? 20 : 24} />}
            </button>

            <button
              type="button"
              onClick={toggleScreenShare}
              className={`${isMobile ? 'p-3' : 'p-4'} rounded-full text-white shadow-lg cursor-pointer transition-colors ${
                isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
              }`}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              <FaDesktop size={isMobile ? 20 : 24} />
            </button>
          </div>
        </div>
      ) : (
        // HOME SCREEN
        <div className="flex-1 p-4 md:p-6 md:ml-64 text-white">
          <button
            type="button"
            className="md:hidden text-2xl text-black mb-4"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars />
          </button>

          <div className="flex flex-col md:flex-row items-center gap-5 mb-6 bg-gray-800 p-5 rounded-xl shadow-md">
            <div className="w-16 h-16 md:w-20 md:h-20">
              <Lottie animationData={wavingAnimation} loop autoplay />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                Hey {user?.username || "Guest"}! 👋
              </h1>
              <p className="text-sm md:text-lg text-gray-300 mt-2">
                Ready to <strong>connect with friends instantly?</strong>
                Just <strong>select a user</strong> and start your video call! 🎥✨
              </p>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-sm">
            <h2 className="text-lg font-semibold mb-2">💡 How to Use?</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-400">
              <li>📌 Open the sidebar to see online users.</li>
              <li>🔍 Use the search bar to find a specific person.</li>
              <li>🎥 Click on a user to start a video call instantly!</li>
              <li>👑 The caller controls YouTube & Music for both users!</li>
              <li>💬 Both users can chat in real-time!</li>
              <li>🖥️ Share your screen during the call!</li>
            </ul>
          </div>
        </div>
      )}

      {/* CHAT PANEL */}
      {isChatOpen && callAccepted && (
        <div className={`fixed ${isMobile ? 'top-0 left-0 right-0 bottom-0' : 'top-4 left-4'} ${isMobile ? 'w-full h-full' : 'w-80 md:w-96'} bg-white rounded-xl shadow-2xl z-50 flex flex-col`}>
          <div className="bg-blue-600 text-white p-3 flex justify-between items-center rounded-t-xl">
            <div className="flex items-center gap-2">
              <FaComments />
              <h3 className="font-bold">Live Chat</h3>
            </div>
            <button onClick={() => setIsChatOpen(false)}>
              <FaTimes />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">
                <FaComments size={40} className="mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start chatting!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-2 ${msg.isOwn ? 'text-right' : 'text-left'}`}
                >
                  <div
                    className={`inline-block max-w-xs px-3 py-2 rounded-lg break-words ${
                      msg.isOwn
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-800'
                    }`}
                  >
                    <p className="text-xs font-semibold mb-1">{msg.sender}</p>
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2 rounded-b-xl">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
            >
              <FaPaperPlane size={16} />
            </button>
          </form>
        </div>
      )}

      {/* YOUTUBE PANEL */}
      {isYouTubeOpen && callAccepted && (
        <div className={`fixed ${isMobile ? 'top-0 left-0 right-0 bottom-0' : 'top-4 left-1/2 transform -translate-x-1/2'} ${isMobile ? 'w-full h-full' : 'w-[90%] md:w-[600px]'} bg-white rounded-xl shadow-2xl z-50 flex flex-col`}>
          <div className="bg-red-600 text-white p-3 flex justify-between items-center rounded-t-xl">
            <div className="flex items-center gap-2">
              <FaYoutube size={20} />
              <h3 className="font-bold text-sm md:text-base">Watch Together</h3>
              {!isCaller && <span className="text-xs bg-red-800 px-2 py-1 rounded">View Only</span>}
              {isCaller && <span className="text-xs bg-red-800 px-2 py-1 rounded">You Control</span>}
            </div>
            <button onClick={() => setIsYouTubeOpen(false)}>
              <FaTimes />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isCaller && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadYoutubeVideo()}
                  placeholder="Paste YouTube URL..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={loadYoutubeVideo}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
                >
                  Load
                </button>
              </div>
            )}

            {!isCaller && !currentYoutubeId && (
              <div className="text-center py-10 text-gray-500">
                <FaYoutube size={50} className="mx-auto mb-3 opacity-30" />
                <p>Waiting for host to load a video...</p>
              </div>
            )}

            {currentYoutubeId && (
              <>
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%', height: 0 }}>
                  <iframe
  ref={youtubeIframeRef}
  className="absolute top-0 left-0 w-full h-full"
  src={`https://www.youtube.com/embed/${currentYoutubeId}?enablejsapi=1&origin=${window.location.origin}&autoplay=0&controls=1`}
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
/>
                </div>

                {isCaller && (
                  <div className="mt-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg p-3 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-xs font-bold">🎮 CONTROLLER</span>
                      <span className="text-white text-xs bg-red-700 px-2 py-1 rounded">LIVE</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleYoutubePlay}
                        className="bg-white text-red-600 p-2 rounded-full hover:bg-gray-100 transition-all"
                      >
                        {isYoutubePlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
                      </button>
                      
                      <div className="flex-1">
                        <div className="text-white text-xs mb-1">
                          {isYoutubePlaying ? '▶️ Playing' : '⏸️ Paused'}
                        </div>
                        <div className="text-white text-xs opacity-75">
                          Auto-syncing every 2 seconds
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isCaller && (
                  <div className="mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700">
                      <div className="animate-pulse">🔄</div>
                      <span className="text-xs font-medium">Auto-syncing with host</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* MUSIC PANEL */}
      {isMusicOpen && callAccepted && (
        <div className={`fixed ${isMobile ? 'bottom-0 left-0 right-0' : 'bottom-4 left-1/2 transform -translate-x-1/2'} ${isMobile ? 'w-full' : 'w-[90%] md:w-[500px]'} bg-white rounded-t-xl md:rounded-xl shadow-2xl z-50`}>
          <div className="bg-green-600 text-white p-3 flex justify-between items-center rounded-t-xl">
            <div className="flex items-center gap-2">
              <FaMusic />
              <h3 className="font-bold text-sm md:text-base">Listen Together</h3>
              {!isCaller && <span className="text-xs bg-green-800 px-2 py-1 rounded">Listen Only</span>}
            </div>
            <button onClick={() => setIsMusicOpen(false)}>
              <FaTimes />
            </button>
          </div>

          <div className="p-4">
            {isCaller && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadAudio()}
                  placeholder="Paste MP3 URL..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={loadAudio}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 whitespace-nowrap"
                >
                  Load
                </button>
              </div>
            )}

            {!isCaller && !audioRef.current?.src && (
              <div className="text-center py-10 text-gray-500">
                <FaMusic size={50} className="mx-auto mb-3 opacity-30" />
                <p>Waiting for host to load music...</p>
              </div>
            )}

            {(isCaller || audioRef.current?.src) && (
              <>
                <div className="text-center text-sm text-gray-600 mb-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(currentTime / duration) * 100 || 0}
                  onChange={seekAudio}
                  disabled={!isCaller}
                  className={`w-full mb-4 ${!isCaller ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`
                  }}
                />

                <div className="flex items-center justify-center gap-3 mb-3">
                  <button
                    onClick={toggleAudioPlay}
                    disabled={!isCaller}
                    className={`bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition-all ${!isCaller ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isAudioPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
                  </button>
                  <button
                    onClick={toggleAudioMute}
                    disabled={!isCaller}
                    className={`bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 transition-all ${!isCaller ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {audioRef.current?.muted ? <FaVolumeMute size={20} /> : <FaVolumeUp size={20} />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <FaVolumeUp className="text-gray-600" size={14} />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={audioVolume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    disabled={!isCaller}
                    className={`flex-1 ${!isCaller ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{
                      background: `linear-gradient(to right, #10b981 0%, #10b981 ${audioVolume}%, #e5e7eb ${audioVolume}%, #e5e7eb 100%)`
                    }}
                  />
                  <span className="text-sm text-gray-600 w-12 text-center">{audioVolume}%</span>
                </div>

                <audio ref={audioRef} />
              </>
            )}
          </div>
        </div>
      )}

      {/* USER DETAIL MODAL */}
      {showUserDetailModal && modalUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 animate-scale-in">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-4">User Details</p>
              <img
                src={modalUser.profilepic || "/default-avatar.png"}
                alt="User"
                className="w-24 h-24 rounded-full border-4 border-blue-500 object-cover"
              />
              <h3 className="text-lg font-bold mt-3">{modalUser.username}</h3>
              <p className="text-sm text-gray-500">{modalUser.email}</p>

              <div className="flex gap-4 mt-5 w-full">
                <button
                  onClick={() => {
                    if (modalUser) {
                      startCall(modalUser);
                      setShowUserDetailModal(false);
                    }
                  }}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 justify-center hover:bg-green-700 transition-all"
                >
                  <FaPhoneAlt />
                  Call
                </button>
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CALL REJECTED MODAL */}
      {callRejectedPopUp && rejectorData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 animate-shake">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-4 text-red-600">Call Rejected</p>
              <img
                src={rejectorData.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-24 h-24 rounded-full border-4 border-red-500 object-cover"
              />
              <h3 className="text-lg font-bold mt-3">{rejectorData.name}</h3>
              <p className="text-sm text-gray-500 mt-1">declined your call</p>

              <div className="flex gap-4 mt-5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    if (modalUser) {
                      startCall(modalUser);
                    }
                  }}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg flex gap-2 justify-center items-center hover:bg-green-600 transition-all"
                >
                  <FaPhoneAlt />
                  Call Again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    endCallCleanup();
                    setCallRejectedPopUp(false);
                    setShowUserDetailModal(false);
                  }}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg flex gap-2 justify-center items-center hover:bg-red-600 transition-all"
                >
                  <FaPhoneSlash />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INCOMING CALL MODAL */}
      {reciveCall && !callAccepted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 animate-bounce-slow">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-4 text-green-600">Incoming Call...</p>
              <img
                src={caller?.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-24 h-24 rounded-full border-4 border-green-500 animate-pulse object-cover"
              />
              <h3 className="text-lg font-bold mt-3">{callerName}</h3>
              <p className="text-sm text-gray-500">{caller?.email}</p>

              <div className="flex gap-4 mt-5 w-full">
                <button
                  type="button"
                  onClick={handelacceptCall}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg flex gap-2 justify-center items-center hover:bg-green-600 transition-all animate-pulse"
                >
                  <FaPhoneAlt />
                  Accept
                </button>
                <button
                  type="button"
                  onClick={handelrejectCall}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg flex gap-2 justify-center items-center hover:bg-red-600 transition-all"
                >
                  <FaPhoneSlash />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

                    