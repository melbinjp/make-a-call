# 🏗️ System Architecture

## Overview

Phone.WeCanUseAI.com uses a **mesh network topology** where each participant connects directly to all other participants via WebRTC peer-to-peer connections.

## Core Components

### 1. **Mesh Network Manager**

- **Multiple Peer Connections**: `Map<peerId, RTCPeerConnection>`
- **Dynamic Discovery**: Auto-connects to new participants
- **Conflict Resolution**: Device hash determines connection initiator

### 2. **Firebase Signaling**

- **Participant Registry**: Real-time participant list
- **Signal Exchange**: WebRTC offer/answer/ICE candidates
- **Auto Cleanup**: Signals removed after 30 seconds

### 3. **Audio System**

- **Multiple Streams**: Separate audio element per participant
- **Test Tone Generator**: Web Audio API synthetic audio
- **Device Optimization**: Different handling for mobile/desktop

### 4. **Device Adaptation**

- **Responsive UI**: Desktop/mobile/smartwatch layouts
- **Performance Scaling**: Reduced animations on low-end devices
- **Touch Optimization**: 44px minimum touch targets

## Data Flow

```
User A joins → Firebase participant registry
User B joins → Discovers A → WebRTC connection established
User C joins → Discovers A & B → Connects to both
Audio flows: A ↔ B, A ↔ C, B ↔ C (full mesh)
```

## Key Design Decisions

1. **Mesh vs Star**: Chose mesh for unlimited participants and no central server
2. **Device Hash**: Deterministic connection initiation prevents conflicts
3. **Firebase Minimal**: Only for signaling, not audio transmission
4. **Progressive Enhancement**: Works on all devices from smartwatch to desktop

## Scalability

- **Participants**: Unlimited (limited by device capabilities)
- **Bandwidth**: O(n) per participant (each connects to all others)
- **Firebase Usage**: ~50-100KB per call (optimized cleanup)
- **Memory**: Efficient peer connection management with cleanup
