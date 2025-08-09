# Phone.WeCanUseAI.com

A WebRTC-based voice calling system that allows secure peer-to-peer calls through web browsers.

## Features

- 🌍 **Global Calling**: Make calls anywhere in the world through the internet
- 🔒 **Secure**: Peer-to-peer WebRTC connections with no server storing audio
- 📱 **Channel-based**: Use random numbers to create private calling channels
- 👥 **Multi-user**: Multiple people can use different channels simultaneously
- 🎤 **Mute Control**: Toggle microphone on/off during calls
- 📞 **Simple Interface**: Easy-to-use web interface

## Setup Instructions

### 1. Firebase Setup (Required for signaling)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Realtime Database
4. Set database rules to allow read/write (for demo purposes):
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
5. Get your Firebase config from Project Settings
6. Replace the config in `app.js`:
   ```javascript
   const firebaseConfig = {
       apiKey: "your-actual-api-key",
       authDomain: "your-project.firebaseapp.com",
       databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
       projectId: "your-project-id"
   };
   ```

### 2. Deployment

Since this is a static site, you can deploy it to:
- **GitHub Pages**
- **Netlify**
- **Vercel**
- **Firebase Hosting**
- Any static hosting service

### 3. HTTPS Requirement

WebRTC requires HTTPS to access microphone. Make sure your hosting provides SSL certificates.

## How to Use

1. **Create/Join Channel**: Enter a channel number (both parties need the same number)
2. **Share Channel**: Give the channel number to the person you want to call
3. **Wait for Connection**: The system will automatically connect when both parties join
4. **Start Talking**: Voice is transmitted peer-to-peer securely

## Technical Details

- **WebRTC**: Handles peer-to-peer audio streaming
- **Firebase**: Used only for signaling (connection setup)
- **STUN Servers**: Google's public STUN servers for NAT traversal
- **No Audio Storage**: All audio is transmitted directly between browsers

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Security Notes

- Audio is transmitted peer-to-peer (not through servers)
- Channel numbers should be shared securely
- Consider using longer, random channel numbers for better security
- Firebase is only used for initial connection setup, not audio transmission

## Limitations

- Requires internet connection
- Both parties need modern browsers
- May not work behind strict corporate firewalls
- Audio quality depends on internet connection

## Future Enhancements

- Video calling support
- Screen sharing
- Chat messaging
- Better NAT traversal (TURN servers)
- User authentication
- Call recording (with consent)