# 📞 call.wecanuseai

WebRTC-based voice calling system for instant peer-to-peer calls worldwide.

## 🚀 Quick Setup

1. **Add GitHub Secrets** (Settings → Secrets and variables → Actions):

   ```
   FIREBASE_API_KEY: your-api-key
   FIREBASE_AUTH_DOMAIN: your-project.firebaseapp.com
   FIREBASE_DATABASE_URL: https://your-project-default-rtdb.firebaseio.com
   FIREBASE_PROJECT_ID: your-project-id
   FIREBASE_STORAGE_BUCKET: your-project.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID: your-sender-id
   FIREBASE_APP_ID: your-app-id
   ```

2. **Push to main branch** - GitHub Actions will auto-deploy to GitHub Pages

## 📱 Features

- **Global Calling** - Internet-based voice calls
- **Unlimited Participants** - Mesh network supports any number of users
- **Cross-Device** - Works on desktop, mobile, and smartwatch
- **Secure** - Peer-to-peer WebRTC with no server audio storage
- **Test Audio** - MP3 test file with voice activity detection

## 🎯 Usage

- **Quick Call**: Instant random room creation
- **Room Numbers**: Share 6-digit codes to join specific rooms
- **Test Audio**: Use test button to verify connections
- **Keyboard Shortcuts**: Ctrl+M (mute), Ctrl+T (test), Ctrl+H (hangup)

Built with WebRTC, Firebase, and vanilla JavaScript.
