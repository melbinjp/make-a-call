Excellent question. Yes, besides the peers themselves, the system uses three types of servers to make the calls work reliably, but each has a very different role. The main goal is always to have the actual call (audio and messages) go directly peer-to-peer.

Here’s a breakdown of the servers involved:

1.  **Signaling Server (Firebase Realtime Database):**
    - **What it does:** This is the "switchboard" or "address book" for the app. When you create a group, it tells this server. When someone joins, they ask this server for the group's details. It's also used to pass the initial "hello, want to connect?" messages (offers, answers, and ICE candidates) between peers.
    - **What it does NOT do:** It does **not** handle any of the actual audio or message data from your call. It only helps with the setup.

2.  **STUN Servers (e.g., `stun.l.google.com`):**
    - **What it does:** Most devices are behind a Wi-Fi router and don't have a direct public IP address. A STUN server is a simple utility on the internet that a peer can ask, "What's my public IP address?" The peer then shares this public address with the other peer (using the Signaling Server) to try and establish a direct connection.
    - **Data Usage:** This is a very lightweight process that uses almost no data.

3.  **TURN Server (The one I just fixed, e.g., `openrelay.metered.ca`):**
    - **What it does:** This is the crucial **fallback server**. If a direct peer-to-peer connection is impossible (usually due to a restrictive firewall), the TURN server acts as a relay. Each peer sends their encrypted call data to the TURN server, which then forwards it to the other peer.
    - **When it's used:** This is the only server that might handle the actual call data, but **only as a last resort**. The app will always try for a direct P2P connection first because it's faster and more private.

### Summary:

Yes, the app uses helper servers. Firebase is for setup, STUN is for IP discovery, and TURN is a backup relay for difficult networks. The primary goal and the most common case is that your data goes directly from peer to peer.
