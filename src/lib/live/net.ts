import net from "node:net"

// Node's default per-address connect attempt (250 ms) is too short on high-latency links and
// surfaces as ETIMEDOUT for some hosts. Give each attempt 2.5 s.
net.setDefaultAutoSelectFamilyAttemptTimeout(2500)
