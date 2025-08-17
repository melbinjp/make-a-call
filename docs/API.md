# 🔧 API Reference

## PhoneCall Class

### Core Methods

#### `joinChannel()`

Joins a voice call room with validation and setup.

- Validates room number input
- Checks Firebase connection
- Requests microphone access
- Sets up signaling and peer connections

#### `connectToPeer(peerId, peerHash)`

Establishes WebRTC connection to specific participant.

- Creates RTCPeerConnection
- Determines initiator via device hash comparison
- Sends WebRTC offer if should initiate

#### `playTestTone()`

Generates 800Hz test tone for connection verification.

- Creates Web Audio API oscillator
- Temporarily replaces microphone track
- Broadcasts to all connected peers

### Device Optimization

#### `setupDeviceOptimizations()`

Configures UI and behavior based on device capabilities.

- **Smartwatch**: Minimal UI, removes non-essential elements
- **Mobile**: Touch optimizations, haptic feedback
- **Desktop**: Keyboard shortcuts, hover effects

### Connection Management

#### `handleSignal(data)`

Processes WebRTC signaling messages.

- **offer**: Creates answer and sets remote description
- **answer**: Sets remote description on initiator
- **ice-candidate**: Adds ICE candidates for NAT traversal

#### `updateConnectionStatus()`

Updates UI based on connected peer count.

- Shows participant count
- Updates status indicators
- Device-specific status messages

## Firebase Structure

```
channels/
  {channelId}/
    participants/
      {userName}: {
        icon: "🐱",
        joined: timestamp,
        deviceHash: "abc123..."
      }
    signals/
      {signalId}: {
        type: "offer|answer|ice-candidate",
        payload: {...},
        sender: "userName",
        timestamp: timestamp
      }
```

## Events

### WebRTC Events

- `onicecandidate`: ICE candidate discovery
- `ontrack`: Remote audio stream received
- `onconnectionstatechange`: Connection state updates

### Firebase Events

- `child_added`: New signaling message
- `value`: Participant list changes
- `disconnect`: Automatic cleanup

## Device Classes

### CSS Classes

- `.smartwatch-mode`: Ultra-minimal UI
- `.landscape-compact`: Landscape orientation optimizations
- `.low-performance`: Reduced animations for low-end devices

### JavaScript Detection

- `window.innerWidth <= 300`: Smartwatch detection
- `navigator.hardwareConcurrency <= 2`: Low-end device
- `window.matchMedia('(pointer: fine)')`: Desktop detection
