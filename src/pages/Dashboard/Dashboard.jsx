import React, { useEffect, useRef, useState } from 'react';
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
  
  // Existing states
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOnline, setUserOnline] = useState([]);
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const [reciveCall, setReciveCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callerWating, setCallerWating] = useState(false);
  const [callRejectedPopUp, setCallRejectedPopUp] = useState(false);
  const [rejectorData, setCallrejectorData] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);

  // Track who is the caller (controller)
  const [isCaller, setIsCaller] = useState(false);

  // ENHANCED FEATURE STATES
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isYouTubeOpen, setIsYouTubeOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [currentYoutubeId, setCurrentYoutubeId] = useState('');
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs
  const myVideo = useRef(null);
  const reciverVideo = useRef(null);
  const connectionRef = useRef(null);
  const hasJoined = useRef(false);
  const screenVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  const audioRef = useRef(null);
  const youtubeIframeRef = useRef(null);
  const syncIntervalRef = useRef(null);

  const ringtone = new Howl({
    src: ["/ringtone.mp3"],
    loop: false,
    volume: 1.0,
  });

  const socket = socketInstance.getSocket();

  // Initialize audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume / 100;
    }
  }, [audioVolume]);

  // Update audio time
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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // YouTube Heartbeat Sync - Caller sends state every 2 seconds
  useEffect(() => {
    if (isCaller && currentYoutubeId && callAccepted) {
      syncIntervalRef.current = setInterval(() => {
        const iframe = youtubeIframeRef.current;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            '{"event":"command","func":"getPlayerState","args":""}',
            '*'
          );
        }
      }, 2000);

      const handleYouTubeMessage = (event) => {
        if (event.origin !== 'https://www.youtube.com') return;
        
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'infoDelivery' && data.info) {
            const { currentTime, playerState } = data.info;
            
            socket.emit("youtube-sync", {
              to: selectedUser,
              videoId: currentYoutubeId,
              currentTime: currentTime || 0,
              isPlaying: playerState === 1
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      };

      window.addEventListener('message', handleYouTubeMessage);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
        window.removeEventListener('message', handleYouTubeMessage);
      };
    }
  }, [isCaller, currentYoutubeId, callAccepted, selectedUser, socket]);

  // Socket setup with UPDATED LISTENERS
  useEffect(() => {
    if (user && socket && !hasJoined.current) {
      socket.emit("join", { id: user._id, name: user.username });
      hasJoined.current = true;
    }
    
    socket.on("me", (id) => setMe(id));
    socket.on("callToUser", (data) => {
      console.log("📞 Incoming call from:", data.name);
      setReciveCall(true);
      setCaller(data);
      setCallerName(data.name);
      setCallerSignal(data.signal);
      ringtone.play();
    });
    socket.on("callRejected", (data) => {
      setCallRejectedPopUp(true);
      setCallrejectorData(data);
      ringtone.stop();
    });
    socket.on("callEnded", (data) => {
      console.log("Call ended by", data.name);
      ringtone.stop();
      endCallCleanup();
    });
    socket.on("screenShareStarted", (data) => {
      console.log("Remote user started screen sharing");
    });
    socket.on("screenShareStopped", () => {
      console.log("Remote user stopped screen sharing");
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      setRemoteScreenStream(null);
    });
    socket.on("userUnavailable", (data) => {
      alert(data.message || "User is not available.");
    });
    socket.on("userBusy", (data) => {
      alert(data.message || "User is currently in another call.");
    });
    socket.on("online-users", (onlineUsers) => {
      setUserOnline(onlineUsers);
    });

    // CHAT - Works both ways
    socket.on("receive-message", (data) => {
      const message = {
        id: Date.now(),
        text: data.message,
        sender: data.sender,
        timestamp: data.timestamp,
        isOwn: false
      };
      setMessages(prev => [...prev, message]);
    });

    // YOUTUBE - NEW SYNC SYSTEM
    socket.on("youtube-load", (data) => {
      setCurrentYoutubeId(data.videoId);
      setIsYouTubeOpen(true);
      setIsYoutubePlaying(false);
      setIsSyncing(false);
    });

    // Receiver listens for continuous sync updates
    socket.on("youtube-sync", (data) => {
      if (!isCaller && youtubeIframeRef.current) {
        setIsSyncing(true);
        const iframe = youtubeIframeRef.current;
        
        iframe.contentWindow.postMessage('{"event":"command","func":"getCurrentTime","args":""}', '*');
        
        setIsYoutubePlaying(data.isPlaying);
        
        const playPauseCommand = data.isPlaying 
          ? '{"event":"command","func":"playVideo","args":""}' 
          : '{"event":"command","func":"pauseVideo","args":""}';
        iframe.contentWindow.postMessage(playPauseCommand, '*');
        
        const seekCommand = `{"event":"command","func":"seekTo","args":[${data.currentTime}, true]}`;
        iframe.contentWindow.postMessage(seekCommand, '*');
        
        setTimeout(() => setIsSyncing(false), 1000);
      }
    });

    // MUSIC - Only receiver listens
    socket.on("music-load", (data) => {
      setAudioUrl(data.audioUrl);
      if (audioRef.current) {
        audioRef.current.src = data.audioUrl;
        audioRef.current.load();
      }
      setIsMusicOpen(true);
      setIsAudioPlaying(false);
    });

    socket.on("music-play", (data) => {
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime;
        if (data.isPlaying) {
          audioRef.current.play().catch(e => console.log("Audio play error:", e));
        } else {
          audioRef.current.pause();
        }
      }
      setIsAudioPlaying(data.isPlaying);
    });

    socket.on("music-seek", (data) => {
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime;
      }
      setCurrentTime(data.currentTime);
    });

    socket.on("music-volume", (data) => {
      setAudioVolume(data.volume);
      if (audioRef.current) {
        audioRef.current.volume = data.volume / 100;
      }
    });

    socket.on("peer-disconnected", () => {
      endCallCleanup();
    });
    
    return () => {
      socket.off("me");
      socket.off("callToUser");
      socket.off("callRejected");
      socket.off("callEnded");
      socket.off("userUnavailable");
      socket.off("userBusy");
      socket.off("online-users");
      socket.off("screenShareStarted");
      socket.off("screenShareStopped");
      socket.off("receive-message");
      socket.off("youtube-load");
      socket.off("youtube-sync");
      socket.off("music-load");
      socket.off("music-play");
      socket.off("music-seek");
      socket.off("music-volume");
      socket.off("peer-disconnected");
    };
  }, [user, socket, isCaller]);



// CHAT FUNCTIONS - Works for both caller and receiver
  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const message = {
      id: Date.now(),
      text: newMessage,
      sender: user.username,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true
    };

    setMessages(prev => [...prev, message]);
    
    socket.emit("send-message", {
      to: selectedUser,
      message: newMessage,
      sender: user.username,
      timestamp: message.timestamp
    });

    setNewMessage('');
  };

  // YOUTUBE FUNCTIONS - SIMPLIFIED
  const extractYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const loadYoutubeVideo = () => {
    if (!isCaller) {
      alert("Only the caller can control YouTube!");
      return;
    }

    const videoId = extractYoutubeId(youtubeUrl);
    if (videoId) {
      setCurrentYoutubeId(videoId);
      setIsYoutubePlaying(false);
      
      socket.emit("youtube-load", {
        to: selectedUser,
        videoId: videoId
      });
      
      setYoutubeUrl('');
    } else {
      alert('Invalid YouTube URL. Please use a valid YouTube link.');
    }
  };

  const toggleYoutubePlay = () => {
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
  };

  // MUSIC FUNCTIONS - Only caller can control
  const loadAudio = () => {
    if (!isCaller) {
      alert("Only the caller can control music!");
      return;
    }

    if (audioUrl.trim()) {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
      
      socket.emit("music-load", {
        to: selectedUser,
        audioUrl: audioUrl
      });
      
      setAudioUrl('');
      setIsAudioPlaying(false);
    } else {
      alert('Please enter a valid MP3 URL');
    }
  };

  const toggleAudioPlay = () => {
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

    socket.emit("music-play", {
      to: selectedUser,
      isPlaying: newPlayingState,
      currentTime: currentTime
    });
  };

  const seekAudio = (e) => {
    if (!isCaller) {
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    
    const seekTime = (e.target.value / 100) * duration;
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);

    socket.emit("music-seek", {
      to: selectedUser,
      currentTime: seekTime
    });
  };

  const changeVolume = (newVolume) => {
    if (!isCaller) {
      return;
    }

    setAudioVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }

    socket.emit("music-volume", {
      to: selectedUser,
      volume: newVolume
    });
  };

  const toggleAudioMute = () => {
    if (!isCaller) {
      alert("Only the caller can control music!");
      return;
    }

    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 🚀 FIXED: startCall with STUN servers
  const startCall = async () => {
    try {
      console.log("🎬 Starting call...");
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      console.log("📹 Got media stream");
      setStream(currentStream);
      
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
        myVideo.current.muted = true;
        myVideo.current.volume = 0;
      }
      
      currentStream.getAudioTracks().forEach(track => (track.enabled = true));
      
      setCallRejectedPopUp(false);
      setIsSidebarOpen(false);
      setCallerWating(true);
      setSelectedUser(modalUser._id);
      setIsCaller(true);
      
      // 🚀 FIXED: Added STUN servers configuration
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ]
        }
      });
      
      console.log("🔗 Peer connection created with STUN servers");
      
      peer.on("signal", (data) => {
        console.log("📡 Sending call signal");
        socket.emit("callToUser", {
          callToUserId: modalUser._id,
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
          setRemoteScreenStream(remoteStream);
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = remoteStream;
          }
        } else {
          if (reciverVideo.current) {
            reciverVideo.current.srcObject = remoteStream;
            reciverVideo.current.muted = false;
            reciverVideo.current.volume = 1.0;
          }
        }
      });

      peer.on("error", (err) => {
        console.error("❌ Peer connection error:", err);
        alert("Connection error: " + err.message);
        endCallCleanup();
      });

      peer.on("close", () => {
        console.log("🔌 Peer connection closed");
        endCallCleanup();
      });
      
      socket.once("callAccepted", (data) => {
        console.log("✅ Call accepted, signaling...");
        setCallRejectedPopUp(false);
        setCallAccepted(true);
        setCallerWating(false);
        setCaller(data.from);
        peer.signal(data.signal);
      });
      
      connectionRef.current = peer;
      setShowUserDetailModal(false);
    } catch (error) {
      console.error("❌ Error accessing media devices:", error);
      alert("Cannot access camera/microphone: " + error.message);
    }
  };

  // 🚀 FIXED: handelacceptCall with STUN servers
  const handelacceptCall = async () => {
    ringtone.stop();
    try {
      console.log("📞 Accepting call...");
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      console.log("📹 Got media stream");
      setStream(currentStream);

      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }

      currentStream.getAudioTracks().forEach(track => (track.enabled = true));

      setCallAccepted(true);
      setReciveCall(true);
      setCallerWating(false);
      setIsSidebarOpen(false);
      setSelectedUser(caller.from);
      setIsCaller(false);

      // 🚀 FIXED: Added STUN servers configuration
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ]
        }
      });

      console.log("🔗 Peer connection created with STUN servers");

      peer.on("signal", (data) => {
        console.log("📡 Sending answer signal");
        socket.emit("answeredCall", {
          signal: data,
          from: me,
          to: caller.from,
        });
      });

      peer.on("stream", (remoteStream) => {
        console.log("📹 Received remote stream");
        const videoTrack = remoteStream.getVideoTracks()[0];
        if (videoTrack && videoTrack.label.includes('screen')) {
          setRemoteScreenStream(remoteStream);
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = remoteStream;
          }
        } else {
          if (reciverVideo.current) {
            reciverVideo.current.srcObject = remoteStream;
            reciverVideo.current.muted = false;
            reciverVideo.current.volume = 1.0;
          }
        }
      });

      peer.on("error", (err) => {
        console.error("❌ Peer connection error:", err);
        alert("Connection error: " + err.message);
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
      console.error("❌ Error accessing media devices:", error);
      alert("Cannot access camera/microphone: " + error.message);
    }
  };

  const handelrejectCall = () => {
    ringtone.stop();
    setCallerWating(false);
    setReciveCall(false);
    setCallAccepted(false);

    socket.emit("reject-call", {
      to: caller.from,
      name: user.username,
      profilepic: user.profilepic
    });
  };

  const handelendCall = () => {
    console.log("🔴 Sending call-ended event...");
    ringtone.stop();
    
    socket.emit("call-ended", {
      to: caller?.from || selectedUser,
      name: user.username
    });

    endCallCleanup();
  };

  const endCallCleanup = () => {
    console.log("🔴 Stopping all media streams and resetting call...");
    
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }
    
    if (reciverVideo.current) {
      console.log("🔴 Clearing receiver video");
      reciverVideo.current.srcObject = null;
    }
    
    if (myVideo.current) {
      console.log("🔴 Clearing my video");
      myVideo.current.srcObject = null;
    }

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    
    connectionRef.current?.destroy();
    
    ringtone.stop();
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
    
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCamOn;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenMediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            displaySurface: "monitor"
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
          }
        }

        socket.emit("screenShareStarted", {
          to: caller?.from || selectedUser
        });

        screenTrack.onended = () => {
          stopScreenShare();
        };

      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error("Error sharing screen:", error);
      if (error.name === 'NotAllowedError') {
        alert("Screen sharing permission denied.");
      } else {
        alert("Could not share screen. Please try again.");
      }
    }
  };

  const stopScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    if (stream && connectionRef.current && connectionRef.current._pc) {
      const videoTrack = stream.getVideoTracks()[0];
      const senders = connectionRef.current._pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');

      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack);
      }
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    socket.emit("screenShareStopped", {
      to: caller?.from || selectedUser
    });
  };

  const allusers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/user');
      if (response.data.success !== false) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    allusers();
  }, []);

  const isOnlineUser = (userId) => userOnline.some((u) => u.userId === userId);

  const handelSelectedUser = (userId) => {
    if (callAccepted || reciveCall) {
      alert("You must end the current call before starting a new one.");
      return;
    }
    const selected = filteredUsers.find(user => user._id === userId);
    setModalUser(selected);
    setShowUserDetailModal(true);
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    if (callAccepted || reciveCall) {
      alert("You must end the call before logging out.");
      return;
    }
    try {
      await apiClient.post('/auth/logout');
      socket.off("disconnect");
      socket.disconnect();
      socketInstance.setSocket();
      updateUser(null);
      localStorage.removeItem("userData");
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (


    <div className="flex min-h-screen bg-gray-100">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <aside
        className={`bg-gradient-to-br from-blue-900 to-purple-800 text-white w-64 h-full p-4 space-y-4 fixed z-20 transition-transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
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

        <ul className="space-y-4 overflow-y-auto">
          {filteredUsers.map((user) => (
            <li
              key={user._id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedUser === user._id
                ? "bg-green-600"
                : "bg-gradient-to-r from-purple-600 to-blue-400"
                }`}
              onClick={() => handelSelectedUser(user._id)}
            >
              <div className="relative">
                <img
                  src={user.profilepic || "/default-avatar.png"}
                  alt={`${user.username}'s profile`}
                  className="w-10 h-10 rounded-full border border-white"
                />
                {isOnlineUser(user._id) && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full shadow-lg animate-bounce"></span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{user.username}</span>
                <span className="text-xs text-gray-400 truncate w-32">
                  {user.email}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {user && <div
          onClick={handleLogout}
          className="absolute bottom-2 left-4 right-4 flex items-center gap-2 bg-red-400 px-4 py-1 cursor-pointer rounded-lg"
        >
          <RiLogoutBoxLine />
          Logout
        </div>}
      </aside>

      {selectedUser || reciveCall || callAccepted ? (
        <div className="relative w-full h-screen bg-black flex items-center justify-center">
          {callerWating ? (
            <div>
              <div className="flex flex-col items-center">
                <p className='font-black text-xl mb-2 text-white'>Calling...</p>
                <img
                  src={modalUser.profilepic || "/default-avatar.png"}
                  alt="User"
                  className="w-20 h-20 rounded-full border-4 border-blue-500 animate-bounce"
                />
                <h3 className="text-lg font-bold mt-3 text-white">{modalUser.username}</h3>
                <p className="text-sm text-gray-300">{modalUser.email}</p>
              </div>
            </div>
          ) : (
            <>
              {remoteScreenStream ? (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
                />
              ) : (
                <video
                  ref={reciverVideo}
                  autoPlay
                  className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
                />
              )}
            </>
          )}

          <div className="absolute bottom-[75px] md:bottom-0 right-1 bg-gray-900 rounded-lg overflow-hidden shadow-lg">
            <video
              ref={myVideo}
              autoPlay
              playsInline
              muted
              className="w-32 h-40 md:w-56 md:h-52 object-cover rounded-lg"
            />
          </div>

          <div className="absolute top-4 left-4 text-white text-lg font-bold flex gap-2 items-center">
            <button
              type="button"
              className="md:hidden text-2xl text-white cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
            >
              <FaBars />
            </button>
            {callerName || "In Call"}
          </div>

          {callAccepted && (
            <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm">
              {isCaller ? "👑 Controller" : "👀 Viewer"}
            </div>
          )}

          {isSyncing && !isCaller && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
              <FaYoutube />
              <span>Syncing with host...</span>
            </div>
          )}

          {isScreenSharing && (
            <div className="absolute top-16 right-4 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <FaDesktop />
              <span>Sharing Screen</span>
            </div>
          )}

          {callAccepted && (
            <div className="absolute top-28 right-4 flex flex-col gap-3">
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all"
                title="Live Chat"
              >
                <FaComments size={20} />
              </button>
              <button
                onClick={() => setIsYouTubeOpen(!isYouTubeOpen)}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-all"
                title="Watch YouTube Together"
              >
                <FaYoutube size={20} />
              </button>
              <button
                onClick={() => setIsMusicOpen(!isMusicOpen)}
                className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-all"
                title="Listen to Music Together"
              >
                <FaMusic size={20} />
              </button>
            </div>
          )}

          <div className="absolute bottom-4 w-full flex justify-center gap-4">
            <button
              type="button"
              className="bg-red-600 p-4 rounded-full text-white shadow-lg cursor-pointer hover:bg-red-700"
              onClick={handelendCall}
            >
              <FaPhoneSlash size={24} />
            </button>

            <button
              type="button"
              onClick={toggleMic}
              className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${isMicOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
            >
              {isMicOn ? <FaMicrophone size={24} /> : <FaMicrophoneSlash size={24} />}
            </button>

            <button
              type="button"
              onClick={toggleCam}
              className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${isCamOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
            >
              {isCamOn ? <FaVideo size={24} /> : <FaVideoSlash size={24} />}
            </button>

            <button
              type="button"
              onClick={toggleScreenShare}
              className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
                }`}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              <FaDesktop size={24} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6 md:ml-72 text-white">
          <button
            type="button"
            className="md:hidden text-2xl text-black mb-4"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars />
          </button>

          <div className="flex items-center gap-5 mb-6 bg-gray-800 p-5 rounded-xl shadow-md">
            <div className="w-20 h-20">
              <Lottie animationData={wavingAnimation} loop autoplay />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                Hey {user?.username || "Guest"}! 👋
              </h1>
              <p className="text-lg text-gray-300 mt-2">
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

      {/* Chat Panel */}
      {isChatOpen && callAccepted && (
        <div className="fixed top-4 left-4 w-96 bg-white rounded-xl shadow-2xl z-50">
          <div className="bg-blue-600 text-white p-3 flex justify-between items-center rounded-t-xl">
            <div className="flex items-center gap-2">
              <FaComments />
              <h3 className="font-bold">Live Chat</h3>
            </div>
            <button onClick={() => setIsChatOpen(false)}>
              <FaTimes />
            </button>
          </div>
          
          <div className="h-80 overflow-y-auto p-3 bg-gray-50">
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
                    className={`inline-block max-w-xs px-3 py-2 rounded-lg ${
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

          <div className="p-3 bg-white border-t flex gap-2 rounded-b-xl">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
            >
              <FaPaperPlane size={16} />
            </button>
          </div>
        </div>
      )}

      {/* YouTube Panel */}
      {isYouTubeOpen && callAccepted && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[600px] bg-white rounded-xl shadow-2xl z-50">
          <div className="bg-red-600 text-white p-3 flex justify-between items-center rounded-t-xl">
            <div className="flex items-center gap-2">
              <FaYoutube size={20} />
              <h3 className="font-bold">Watch Together</h3>
              {!isCaller && <span className="text-xs bg-red-800 px-2 py-1 rounded">View Only</span>}
              {isCaller && <span className="text-xs bg-red-800 px-2 py-1 rounded">You Control</span>}
            </div>
            <button onClick={() => setIsYouTubeOpen(false)}>
              <FaTimes />
            </button>
          </div>

          <div className="p-3">
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
                      <span className="text-white text-xs font-bold">🎮 CONTROLLER (Auto-syncs every 2 sec)</span>
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
                          All changes sync automatically
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isCaller && (
                  <div className="mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700">
                      <div className="animate-pulse">🔄</div>
                      <span className="text-xs font-medium">Auto-syncing with host every 2 seconds</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Music Panel */}
      {isMusicOpen && callAccepted && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[500px] bg-white rounded-xl shadow-2xl z-50">
          <div className="bg-green-600 text-white p-3 flex justify-between items-center rounded-t-xl">
            <div className="flex items-center gap-2">
              <FaMusic />
              <h3 className="font-bold">Listen Together</h3>
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
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
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
                />

                <div className="flex items-center justify-center gap-3 mb-3">
                  <button
                    onClick={toggleAudioPlay}
                    disabled={!isCaller}
                    className={`bg-green-600 text-white p-3 rounded-full hover:bg-green-700 ${!isCaller ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isAudioPlaying ? <FaPause /> : <FaPlay />}
                  </button>
                  <button
                    onClick={toggleAudioMute}
                    disabled={!isCaller}
                    className={`bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 ${!isCaller ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {audioRef.current?.muted ? <FaVolumeMute /> : <FaVolumeUp />}
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
                  />
                  <span className="text-sm text-gray-600 w-12">{audioVolume}%</span>
                </div>

                <audio ref={audioRef} />
              </>
            )}
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserDetailModal && modalUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className='font-black text-xl mb-2'>User Details</p>
              <img
                src={modalUser.profilepic || "/default-avatar.png"}
                alt="User"
                className="w-20 h-20 rounded-full border-4 border-blue-500"
              />
              <h3 className="text-lg font-bold mt-3">{modalUser.username}</h3>
              <p className="text-sm text-gray-500">{modalUser.email}</p>

              <div className="flex gap-4 mt-5">
                <button
                  onClick={() => {
                    setSelectedUser(modalUser._id);
                    startCall();
                    setShowUserDetailModal(false);
                  }}
                  className="bg-green-600 text-white px-4 py-1 rounded-lg w-28 flex items-center gap-2 justify-center hover:bg-green-700"
                >
                  Call <FaPhoneAlt />
                </button>
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="bg-gray-400 text-white px-4 py-1 rounded-lg w-28 hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Rejected Modal */}
      {callRejectedPopUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call Rejected From...</p>
              <img
                src={rejectorData.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-red-500"
              />
              <h3 className="text-lg font-bold mt-3">{rejectorData.name}</h3>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    startCall();
                  }}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center hover:bg-green-600"
                >
                  Call Again <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    endCallCleanup();
                    setCallRejectedPopUp(false);
                    setShowUserDetailModal(false);
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center hover:bg-red-600"
                >
                  Back <FaPhoneSlash />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {reciveCall && !callAccepted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Incoming Call...</p>
              <img
                src={caller?.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500 animate-pulse"
              />
              <h3 className="text-lg font-bold mt-3">{callerName}</h3>
              <p className="text-sm text-gray-500">{caller?.email}</p>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={handelacceptCall}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center hover:bg-green-600"
                >
                  Accept <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={handelrejectCall}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center hover:bg-red-600"
                >
                  Reject <FaPhoneSlash />
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