# Firebase Setup Guide

## Step-by-Step Firebase Configuration

### 1. Create Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `phone-wecanuseai` (or your preferred name)
4. Disable Google Analytics (not needed for this project)
5. Click "Create project"

### 2. Enable Realtime Database

1. In your Firebase project, go to "Realtime Database"
2. Click "Create Database"
3. Choose "Start in test mode" (we'll configure rules later)
4. Select your preferred location (closest to your users)

### 3. Configure Database Rules

1. Go to "Realtime Database" → "Rules" tab
2. Replace the rules with:

```json
{
  "rules": {
    "channels": {
      "$channelId": {
        ".read": true,
        ".write": true,
        "signals": {
          ".indexOn": "timestamp"
        },
        "participants": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

3. Click "Publish"

### 4. Get Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon (</>) to add a web app
4. Register app with name: "Phone App"
5. Copy the configuration object

### 5. Update app.js

Replace the firebaseConfig in `app.js` with your actual config:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC...", // Your actual API key
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### 6. Security Considerations

For production, consider these enhanced rules:

```json
{
  "rules": {
    "channels": {
      "$channelId": {
        ".read": "auth != null",
        ".write": "auth != null",
        ".validate": "$channelId.matches(/^[0-9]{4,10}$/)",
        "signals": {
          "$signalId": {
            ".validate": "newData.hasChildren(['type', 'sender', 'timestamp'])"
          }
        },
        "participants": {
          "$participantId": {
            ".validate": "newData.hasChild('joinedAt')"
          }
        }
      }
    }
  }
}
```

### 7. Optional: Enable Authentication

If you want user authentication:

1. Go to "Authentication" → "Sign-in method"
2. Enable "Anonymous" for simple setup
3. Or enable "Email/Password" for user accounts

### 8. Testing

1. Deploy your site to a hosting service with HTTPS
2. Open in two different browsers/devices
3. Use the same channel number
4. Test the calling functionality

## Troubleshooting

**Database Permission Denied:**
- Check your database rules
- Ensure the rules are published
- Verify the database URL in your config

**Connection Issues:**
- Ensure you're using HTTPS
- Check browser console for errors
- Verify Firebase config is correct

**Audio Not Working:**
- Grant microphone permissions
- Use HTTPS (required for WebRTC)
- Test in supported browsers only