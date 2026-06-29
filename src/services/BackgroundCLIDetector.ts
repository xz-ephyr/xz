// No polling, no timeouts, no health checks.
// The bridge just tries to open a WebSocket and stays connected.
// When the server appears, the connection succeeds. When it goes away, it reconnects.
// That's it.
