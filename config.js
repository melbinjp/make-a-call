// Centralized ICE server configuration
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlfXMGejp35bsiU74h9IaoHt5HgLZz08E",
  authDomain: "phone-wecanuseai.firebaseapp.com",
  databaseURL: "https://phone-wecanuseai-default-rtdb.firebaseio.com",
  projectId: "phone-wecanuseai",
  storageBucket: "phone-wecanuseai.firebasestorage.app",
  messagingSenderId: "1003049877741",
  appId: "1:1003049877741:web:0044e7bb1ebf366f918ce4"
};