/* ==========================================================================
   NetAdmin OS - Interactive Application Logic
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. STATE & STORAGE MANAGEMENT
// --------------------------------------------------------------------------
const STORAGE_KEY_PROGRESS = 'netadmin_progress_topics';
const STORAGE_KEY_THEME = 'netadmin_theme';
const STORAGE_KEY_NOTES = 'netadmin_study_notes';

let masteredTopics = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS) || '[]'));

function saveProgress() {
  localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify([...masteredTopics]));
  updateProgressUI();
}

function updateProgressUI() {
  const totalTopics = document.querySelectorAll('[data-topic-id]').length;
  const masteredCount = masteredTopics.size;
  const percent = totalTopics > 0 ? Math.round((masteredCount / totalTopics) * 100) : 0;

  const bar = document.getElementById('global-progress-bar');
  const text = document.getElementById('global-progress-text');
  const countText = document.getElementById('global-progress-count');

  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}%`;
  if (countText) countText.textContent = `${masteredCount} / ${totalTopics} Topics`;

  // Update button states
  document.querySelectorAll('[data-topic-id]').forEach(el => {
    const topicId = el.getAttribute('data-topic-id');
    const btn = el.querySelector('.topic-check-btn');
    if (btn) {
      if (masteredTopics.has(topicId)) {
        btn.classList.add('checked');
        btn.innerHTML = '<i data-lucide="check-circle-2" class="w-4 h-4 inline-block mr-1"></i> Mastered';
      } else {
        btn.classList.remove('checked');
        btn.innerHTML = '<i data-lucide="circle" class="w-4 h-4 inline-block mr-1"></i> Mark as Mastered';
      }
    }
  });

  if (window.lucide) lucide.createIcons();
}

function toggleTopicMastery(topicId) {
  if (masteredTopics.has(topicId)) {
    masteredTopics.delete(topicId);
  } else {
    masteredTopics.add(topicId);
  }
  saveProgress();
}

// --------------------------------------------------------------------------
// 2. THEME CONTROLLER
// --------------------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.setAttribute('data-lucide', savedTheme === 'dark' ? 'sun' : 'moon');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_KEY_THEME, next);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.setAttribute('data-lucide', next === 'dark' ? 'sun' : 'moon');
  }
  if (window.lucide) lucide.createIcons();
}

// --------------------------------------------------------------------------
// 3. SUBNET CALCULATOR ENGINE
// --------------------------------------------------------------------------
function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function longToIp(long) {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

function toBinaryString(long) {
  return [
    ((long >>> 24) & 255).toString(2).padStart(8, '0'),
    ((long >>> 16) & 255).toString(2).padStart(8, '0'),
    ((long >>> 8) & 255).toString(2).padStart(8, '0'),
    (long & 255).toString(2).padStart(8, '0')
  ].join('.');
}

function getIpClassAndScope(firstOctet, ipStr) {
  let ipClass = 'Unknown';
  if (firstOctet >= 1 && firstOctet <= 126) ipClass = 'Class A';
  else if (firstOctet === 127) ipClass = 'Loopback (127.0.0.0/8)';
  else if (firstOctet >= 128 && firstOctet <= 191) ipClass = 'Class B';
  else if (firstOctet >= 192 && firstOctet <= 223) ipClass = 'Class C';
  else if (firstOctet >= 224 && firstOctet <= 239) ipClass = 'Class D (Multicast)';
  else if (firstOctet >= 240 && firstOctet <= 255) ipClass = 'Class E (Experimental)';

  let scope = 'Public Internet';
  if (ipStr.startsWith('10.')) scope = 'RFC 1918 Private';
  else if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ipStr)) scope = 'RFC 1918 Private';
  else if (ipStr.startsWith('192.168.')) scope = 'RFC 1918 Private';
  else if (ipStr.startsWith('127.')) scope = 'Localhost / Loopback';
  else if (ipStr.startsWith('169.254.')) scope = 'APIPA (Link-Local Automatic)';
  else if (firstOctet >= 224 && firstOctet <= 239) scope = 'Multicast (224.0.0.0/4)';

  return { ipClass, scope };
}

function calculateSubnet(cidrInput) {
  const parts = cidrInput.trim().split('/');
  const ip = parts[0];
  const cidr = parts.length > 1 ? parseInt(parts[1], 10) : 24;

  const ipRegex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  if (!ipRegex.test(ip) || isNaN(cidr) || cidr < 0 || cidr > 32) {
    return { error: 'Invalid IPv4 address or CIDR prefix (0-32).' };
  }

  const ipLong = ipToLong(ip);
  const maskLong = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const wildcardLong = (~maskLong) >>> 0;
  const networkLong = (ipLong & maskLong) >>> 0;
  const broadcastLong = (networkLong | wildcardLong) >>> 0;

  const totalHosts = Math.pow(2, 32 - cidr);
  let usableHosts = 0;
  let firstHostLong = 0;
  let lastHostLong = 0;

  if (cidr === 32) {
    usableHosts = 1;
    firstHostLong = networkLong;
    lastHostLong = networkLong;
  } else if (cidr === 31) {
    usableHosts = 2; // RFC 3021 Point-to-Point
    firstHostLong = networkLong;
    lastHostLong = broadcastLong;
  } else {
    usableHosts = totalHosts - 2;
    firstHostLong = networkLong + 1;
    lastHostLong = broadcastLong - 1;
  }

  const firstOctet = parseInt(ip.split('.')[0], 10);
  const { ipClass, scope } = getIpClassAndScope(firstOctet, ip);

  return {
    ip,
    cidr,
    mask: longToIp(maskLong),
    wildcard: longToIp(wildcardLong),
    network: longToIp(networkLong),
    broadcast: cidr >= 31 ? 'N/A (Point-to-Point / Host)' : longToIp(broadcastLong),
    firstHost: longToIp(firstHostLong),
    lastHost: longToIp(lastHostLong),
    totalHosts: totalHosts.toLocaleString(),
    usableHosts: usableHosts.toLocaleString(),
    binaryIp: toBinaryString(ipLong),
    binaryMask: toBinaryString(maskLong),
    ipClass,
    scope
  };
}

function runSubnetCalculator() {
  const inputEl = document.getElementById('calc-input');
  if (!inputEl) return;
  const res = calculateSubnet(inputEl.value);

  const resultContainer = document.getElementById('calc-results');
  const errorContainer = document.getElementById('calc-error');

  if (res.error) {
    errorContainer.textContent = res.error;
    errorContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    return;
  }

  errorContainer.classList.add('hidden');
  resultContainer.classList.remove('hidden');

  document.getElementById('res-net-id').textContent = `${res.network}/${res.cidr}`;
  document.getElementById('res-mask').textContent = res.mask;
  document.getElementById('res-wildcard').textContent = res.wildcard;
  document.getElementById('res-broadcast').textContent = res.broadcast;
  document.getElementById('res-range').textContent = `${res.firstHost} — ${res.lastHost}`;
  document.getElementById('res-usable').textContent = res.usableHosts;
  document.getElementById('res-total').textContent = res.totalHosts;
  document.getElementById('res-class').textContent = `${res.ipClass} (${res.scope})`;

  // Render bit breakdown
  const binaryBreakdown = document.getElementById('res-binary-visual');
  if (binaryBreakdown) {
    const netBits = res.cidr;
    const hostBits = 32 - res.cidr;
    const cleanBin = res.binaryIp.replace(/\./g, '');
    
    let html = '<div class="flex flex-wrap gap-1 font-mono text-xs">';
    for (let i = 0; i < 32; i++) {
      if (i > 0 && i % 8 === 0) {
        html += '<span class="text-gray-500 font-bold px-1 self-center">.</span>';
      }
      const isNet = i < netBits;
      const bit = cleanBin[i];
      html += `<span class="inline-flex flex-col items-center px-1.5 py-1 rounded ${
        isNet 
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
      }">
        <span class="font-bold">${bit}</span>
      </span>`;
    }
    html += '</div>';
    html += `<div class="mt-2 text-xs flex gap-4 text-gray-400">
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-cyan-500/40 inline-block border border-cyan-500"></span> ${netBits} Network Bits</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-amber-500/40 inline-block border border-amber-500"></span> ${hostBits} Host Bits</span>
    </div>`;
    binaryBreakdown.innerHTML = html;
  }
}

// --------------------------------------------------------------------------
// 4. PACKET FLOW SIMULATOR
// --------------------------------------------------------------------------
const SIMULATION_SCENARIOS = {
  crossSubnet: {
    title: 'Cross-Subnet Web Request (Client -> Switch -> Gateway -> Firewall/NAT -> Web Server)',
    nodes: ['pc1', 'switch1', 'router1', 'firewall', 'server'],
    steps: [
      {
        node: 'pc1',
        title: 'Step 1: Application & Transport Layer Encapsulation',
        desc: 'Browser requests https://198.51.100.25:443. PC1 creates an HTTP GET payload, encapsulates it in a TCP Segment (Src Port: 52140, Dst Port: 443, SYN flag set). Next, PC1 inspects destination IP: 198.51.100.25 is NOT on the local subnet (192.168.1.0/24), so PC1 MUST send the frame to its Default Gateway (192.168.1.1).',
        headers: {
          L2: 'Src MAC: 00:1A:2B:3C:4D:01 (PC1) | Dst MAC: AA:BB:CC:11:22:33 (Gateway R1)',
          L3: 'Src IP: 192.168.1.50 | Dst IP: 198.51.100.25 | TTL: 64',
          L4: 'TCP [SYN] Seq=0 Win=64240 Len=0 MSS=1460'
        }
      },
      {
        node: 'switch1',
        title: 'Step 2: Layer 2 Switch Forwarding',
        desc: 'Switch SW1 receives the frame on Port Fa0/1. SW1 inspects the Source MAC (00:1A:2B:3C:4D:01) and updates its MAC address table (CAM Table). It then looks up the Destination MAC (AA:BB:CC:11:22:33) in the CAM table and forwards the frame out Gigabit0/1 directly to Router R1 without modifying any headers.',
        headers: {
          L2: 'Unchanged: Src MAC: PC1 | Dst MAC: Gateway R1 (Forwarded via CAM match)',
          L3: 'Src IP: 192.168.1.50 | Dst IP: 198.51.100.25 | TTL: 64',
          L4: 'TCP [SYN]'
        }
      },
      {
        node: 'router1',
        title: 'Step 3: Layer 3 Routing & Header Rewrite',
        desc: 'Router R1 receives the frame, checks FCS (no errors), and strips the L2 header. R1 checks its Routing Table: matches Default Route 0.0.0.0/0 via Next-Hop Firewall (203.0.113.2). R1 decrements IP TTL by 1 (64 -> 63) and re-calculates the IP header checksum. R1 encapsulates the packet into a NEW Layer 2 frame with R1’s WAN MAC as source and Firewall MAC as destination.',
        headers: {
          L2: 'REWRITTEN: Src MAC: R1 WAN MAC | Dst MAC: Firewall Inside MAC',
          L3: 'Src IP: 192.168.1.50 | Dst IP: 198.51.100.25 | TTL: 63 (Decremented)',
          L4: 'TCP [SYN]'
        }
      },
      {
        node: 'firewall',
        title: 'Step 4: Stateful Inspection & Port Address Translation (NAT/PAT)',
        desc: 'Firewall inspects the TCP SYN packet. Security policy allows outbound HTTPS. Firewall performs NAT Overload (PAT): it replaces the private IP 192.168.1.50 with its public IP 203.0.113.1 and maps source port 52140 to 41005 in its state table. It forwards the packet to the Internet provider.',
        headers: {
          L2: 'REWRITTEN: Src MAC: Firewall Outside | Dst MAC: ISP Gateway MAC',
          L3: 'NAT TRANSLATED: Src IP: 203.0.113.1 (Public) | Dst IP: 198.51.100.25 | TTL: 62',
          L4: 'TCP [SYN] Src Port: 41005 (PAT Mapped) | Dst Port: 443'
        }
      },
      {
        node: 'server',
        title: 'Step 5: Server Ingestion & SYN-ACK Response',
        desc: 'Web Server receives the frame at 198.51.100.25. The OS checks the TCP handshake, allocates a transmission control block (TCB), and prepares the response: TCP [SYN, ACK] back to 203.0.113.1:41005. The 3-way handshake is now underway!',
        headers: {
          L2: 'Server -> Default Gateway',
          L3: 'Src IP: 198.51.100.25 | Dst IP: 203.0.113.1',
          L4: 'TCP [SYN, ACK] Seq=0 Ack=1'
        }
      }
    ]
  },
  sameSubnet: {
    title: 'Local Subnet ARP & ICMP Ping (PC1 -> Switch -> PC2)',
    nodes: ['pc1', 'switch1', 'pc2'],
    steps: [
      {
        node: 'pc1',
        title: 'Step 1: ARP Cache Miss & Broadcast Request',
        desc: 'PC1 (192.168.1.50) wants to ping PC2 (192.168.1.60). Destination is on local subnet, but PC1 does NOT have PC2’s MAC address in its ARP cache. PC1 generates an ARP Request: "Who has 192.168.1.60? Tell 192.168.1.50" with Target MAC: FF:FF:FF:FF:FF:FF (Broadcast).',
        headers: {
          L2: 'Src MAC: 00:1A:2B:3C:4D:01 (PC1) | Dst MAC: FF:FF:FF:FF:FF:FF (Broadcast)',
          L3: 'ARP Opcode: 1 (Request) | Sender: 192.168.1.50 | Target: 192.168.1.60',
          L4: 'None (ARP operates directly on Layer 2)'
        }
      },
      {
        node: 'switch1',
        title: 'Step 2: Switch Floods Broadcast Frame',
        desc: 'Switch SW1 receives the broadcast frame on Fa0/1. It learns PC1’s MAC on Fa0/1. Because the destination is the broadcast MAC (FF:FF:FF:FF:FF:FF), SW1 floods the frame out all ports in the same VLAN except the ingress port (Fa0/1).',
        headers: {
          L2: 'Flooded to all ports in VLAN 10',
          L3: 'ARP Request broadcast',
          L4: 'None'
        }
      },
      {
        node: 'pc2',
        title: 'Step 3: PC2 Unicast ARP Reply & ICMP Echo Begins',
        desc: 'PC2 receives the ARP request, notes that the target IP matches its own, updates its ARP cache with PC1’s MAC, and sends a unicast ARP Reply directly back to PC1: "192.168.1.60 is at 00:1A:2B:99:88:77". Once PC1 receives this, ICMP Echo Requests flow directly unicast.',
        headers: {
          L2: 'Src MAC: 00:1A:2B:99:88:77 (PC2) | Dst MAC: 00:1A:2B:3C:4D:01 (PC1)',
          L3: 'ARP Opcode: 2 (Reply) | "192.168.1.60 is at 00:1A:2B:99:88:77"',
          L4: 'Ready for ICMP Echo Request / Reply'
        }
      }
    ]
  }
};

let currentSimScenarioKey = 'crossSubnet';
let currentSimStep = 0;
let simInterval = null;

function renderSimScenario(scenarioKey) {
  currentSimScenarioKey = scenarioKey;
  currentSimStep = 0;
  clearInterval(simInterval);
  simInterval = null;

  const scenario = SIMULATION_SCENARIOS[scenarioKey];
  document.getElementById('sim-scenario-title').textContent = scenario.title;
  updateSimStepUI();
}

function updateSimStepUI() {
  const scenario = SIMULATION_SCENARIOS[currentSimScenarioKey];
  const step = scenario.steps[currentSimStep];

  // Update step indicators
  document.getElementById('sim-step-indicator').textContent = `Step ${currentSimStep + 1} of ${scenario.steps.length}`;
  document.getElementById('sim-step-title').textContent = step.title;
  document.getElementById('sim-step-desc').textContent = step.desc;

  document.getElementById('sim-hdr-l2').textContent = step.headers.L2;
  document.getElementById('sim-hdr-l3').textContent = step.headers.L3;
  document.getElementById('sim-hdr-l4').textContent = step.headers.L4;

  // Highlight active node in SVG
  document.querySelectorAll('.sim-node-element').forEach(el => {
    el.classList.remove('stroke-cyan-400', 'filter-glow', 'stroke-2', 'stroke-emerald-400');
    el.setAttribute('stroke', '#4b5563');
  });

  const activeElement = document.getElementById(`sim-svg-${step.node}`);
  if (activeElement) {
    activeElement.setAttribute('stroke', '#06b6d4');
    activeElement.setAttribute('stroke-width', '3');
  }

  // Update button states
  document.getElementById('sim-btn-prev').disabled = (currentSimStep === 0);
  document.getElementById('sim-btn-next').disabled = (currentSimStep === scenario.steps.length - 1);
}

function simNextStep() {
  const scenario = SIMULATION_SCENARIOS[currentSimScenarioKey];
  if (currentSimStep < scenario.steps.length - 1) {
    currentSimStep++;
    updateSimStepUI();
  } else {
    clearInterval(simInterval);
  }
}

function simPrevStep() {
  if (currentSimStep > 0) {
    currentSimStep--;
    updateSimStepUI();
  }
}

function simReset() {
  clearInterval(simInterval);
  simInterval = null;
  currentSimStep = 0;
  updateSimStepUI();
}

function simPlayToggle() {
  const playBtn = document.getElementById('sim-btn-play');
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
    playBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4 inline-block mr-1"></i> Auto Play';
  } else {
    playBtn.innerHTML = '<i data-lucide="pause" class="w-4 h-4 inline-block mr-1"></i> Pause';
    simInterval = setInterval(() => {
      const scenario = SIMULATION_SCENARIOS[currentSimScenarioKey];
      if (currentSimStep < scenario.steps.length - 1) {
        simNextStep();
      } else {
        clearInterval(simInterval);
        simInterval = null;
        playBtn.innerHTML = '<i data-lucide="rotate-ccw" class="w-4 h-4 inline-block mr-1"></i> Replay';
      }
    }, 2800);
  }
  if (window.lucide) lucide.createIcons();
}

// --------------------------------------------------------------------------
// 5. INTERACTIVE NETWORK CLI SIMULATOR
// --------------------------------------------------------------------------
const CLI_STATE = {
  hostname: 'Core-SW01#',
  history: [],
  historyIndex: -1
};

const CLI_COMMANDS = {
  help: () => `
Available Diagnostic & Configuration Commands:
  ping <ip/host>            - Send ICMP Echo Request probes
  traceroute <target>       - Trace network hops to destination
  arp -a                    - Display local ARP table mappings
  show ip route             - Display active Layer 3 IP routing table
  show vlan                 - Display configured VLANs & port assignments
  show mac address-table    - Display switch CAM forwarding table
  show interfaces status    - Display physical interface link status & speed
  dig <domain>              - Perform DNS resolution query lookup
  subnet <ip/cidr>          - Run inline subnetting calculation
  clear / cls               - Clear terminal screen
  whoami                    - Display simulated role & privilege level
  date                      - Display system NOC clock
`,
  whoami: () => `netadmin (Privilege Level 15 / Network Operations Center Superuser)`,
  date: () => new Date().toUTCString(),
  'show vlan': () => `
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Fa0/5, Fa0/6, Fa0/7, Fa0/8
10   USERS_MGMT                       active    Fa0/1, Fa0/2
20   SERVERS_PROD                     active    Fa0/3, Fa0/4
30   DMZ_PUBLIC                       active    Fa0/9, Fa0/10
99   NATIVE_MGMT                      active    Gi0/1 (Trunk), Gi0/2 (Trunk)
`,
  'show mac address-table': () => `
          Mac Address Table
-------------------------------------------
Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
  10    001a.2b3c.4d01    DYNAMIC     Fa0/1
  10    001a.2b99.8877    DYNAMIC     Fa0/2
  20    0050.56a1.99e4    DYNAMIC     Fa0/3
  99    aabb.cc11.2233    DYNAMIC     Gi0/1
Total Mac Addresses for this criterion: 4
`,
  'show interfaces status': () => `
Port      Name               Status       Vlan       Duplex  Speed Type
Fa0/1     PC1-Workstation    connected    10         a-full  a-100 10/100BaseTX
Fa0/2     PC2-Workstation    connected    10         a-full  a-100 10/100BaseTX
Fa0/3     AppServer-01       connected    20         a-full a-1000 10/100/1000BaseTX
Gi0/1     Uplink-to-R1       connected    trunk      full   a-1000 1000BaseSX
Gi0/2     Uplink-to-Core2    connected    trunk      full   a-1000 1000BaseSX
`,
  'arp -a': () => `
Interface: 192.168.1.1 on Interface 2
  Internet Address      Physical Address      Type
  192.168.1.1           aa-bb-cc-11-22-33     dynamic (Default Gateway)
  192.168.1.50          00-1a-2b-3c-4d-01     dynamic (PC1)
  192.168.1.60          00-1a-2b-99-88-77     dynamic (PC2)
  192.168.1.254         00-0c-29-f8-11-aa     dynamic (Management Switch)
  192.168.1.255         ff-ff-ff-ff-ff-ff     static  (Broadcast)
`,
  'show ip route': () => `
Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area 

Gateway of last resort is 203.0.113.1 to network 0.0.0.0

S*    0.0.0.0/0 [1/0] via 203.0.113.1, GigabitEthernet0/0
C     192.168.1.0/24 is directly connected, Vlan10
C     192.168.20.0/24 is directly connected, Vlan20
O     10.50.0.0/16 [110/20] via 10.0.0.2, 02:41:15, GigabitEthernet0/1
B     198.51.100.0/24 [20/0] via 203.0.113.2, 14:12:08
`
};

function executeCliCommand(rawCmd) {
  const cmd = rawCmd.trim();
  if (!cmd) return '';

  CLI_STATE.history.push(cmd);
  CLI_STATE.historyIndex = CLI_STATE.history.length;

  const lower = cmd.toLowerCase();

  if (lower === 'clear' || lower === 'cls') {
    const outputEl = document.getElementById('cli-output-log');
    if (outputEl) outputEl.innerHTML = '';
    return null;
  }

  if (CLI_COMMANDS[lower]) {
    return CLI_COMMANDS[lower]();
  }

  // Parameterized commands
  if (lower.startsWith('ping')) {
    const target = cmd.split(/\s+/)[1] || '192.168.1.1';
    return `
PING ${target} (${target}): 56 data bytes
64 bytes from ${target}: icmp_seq=0 ttl=64 time=0.482 ms
64 bytes from ${target}: icmp_seq=1 ttl=64 time=0.395 ms
64 bytes from ${target}: icmp_seq=2 ttl=64 time=0.412 ms
64 bytes from ${target}: icmp_seq=3 ttl=64 time=0.428 ms
64 bytes from ${target}: icmp_seq=4 ttl=64 time=0.399 ms

--- ${target} ping statistics ---
5 packets transmitted, 5 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 0.395/0.423/0.482/0.032 ms
`;
  }

  if (lower.startsWith('traceroute') || lower.startsWith('tracert')) {
    const target = cmd.split(/\s+/)[1] || '8.8.8.8';
    return `
traceroute to ${target} (8.8.8.8), 30 hops max, 60 byte packets
 1  gateway.local (192.168.1.1)  0.612 ms  0.540 ms  0.490 ms
 2  isp-core-node-01.net (203.0.113.1)  4.215 ms  4.110 ms  3.980 ms
 3  142.250.168.210  5.120 ms  5.230 ms  5.190 ms
 4  dns.google (8.8.8.8)  6.312 ms  6.195 ms  6.250 ms
Trace complete.
`;
  }

  if (lower.startsWith('dig') || lower.startsWith('nslookup')) {
    const domain = cmd.split(/\s+/)[1] || 'example.com';
    return `
; <<>> DiG 9.10.6 <<>> ${domain}
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 41829
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;${domain}.                     IN      A

;; ANSWER SECTION:
${domain}.              300     IN      A       93.184.216.34

;; Query time: 14 msec
;; SERVER: 1.1.1.1#53(1.1.1.1)
;; WHEN: ${new Date().toISOString()}
`;
  }

  if (lower.startsWith('subnet')) {
    const cidr = cmd.split(/\s+/)[1] || '192.168.1.0/24';
    const res = calculateSubnet(cidr);
    if (res.error) return `Error: ${res.error}`;
    return `
Subnet Calculation for: ${cidr}
------------------------------------------------------
Network Address:   ${res.network}
Subnet Mask:       ${res.mask} (CIDR /${res.cidr})
Wildcard Mask:     ${res.wildcard}
Usable Host Range: ${res.firstHost} - ${res.lastHost}
Broadcast Address: ${res.broadcast}
Total / Usable:    ${res.totalHosts} total / ${res.usableHosts} usable hosts
Scope & Class:     ${res.scope} (${res.ipClass})
`;
  }

  return `
% Invalid command or unrecognized command: "${cmd}".
Type "help" for a list of available network diagnostics commands.
`;
}

function handleCliInputKey(e) {
  const inputEl = document.getElementById('cli-input-field');
  if (!inputEl) return;

  if (e.key === 'Enter') {
    const rawVal = inputEl.value;
    const outputEl = document.getElementById('cli-output-log');
    if (!outputEl) return;

    // Echo input
    const promptLine = document.createElement('div');
    promptLine.className = 'text-gray-300 font-mono text-xs';
    promptLine.innerHTML = `<span class="text-emerald-400 font-bold">${CLI_STATE.hostname}</span> ${rawVal}`;
    outputEl.appendChild(promptLine);

    // Run command
    const result = executeCliCommand(rawVal);
    if (result !== null) {
      const respLine = document.createElement('pre');
      respLine.className = 'text-cyan-300 font-mono text-xs whitespace-pre-wrap leading-relaxed py-1';
      respLine.textContent = result;
      outputEl.appendChild(respLine);
    }

    inputEl.value = '';
    outputEl.scrollTop = outputEl.scrollHeight;
  } else if (e.key === 'ArrowUp') {
    if (CLI_STATE.history.length > 0 && CLI_STATE.historyIndex > 0) {
      CLI_STATE.historyIndex--;
      inputEl.value = CLI_STATE.history[CLI_STATE.historyIndex];
    }
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    if (CLI_STATE.historyIndex < CLI_STATE.history.length - 1) {
      CLI_STATE.historyIndex++;
      inputEl.value = CLI_STATE.history[CLI_STATE.historyIndex];
    } else {
      CLI_STATE.historyIndex = CLI_STATE.history.length;
      inputEl.value = '';
    }
    e.preventDefault();
  }
}

// --------------------------------------------------------------------------
// 6. CERTIFICATION & PRACTICE QUIZ ENGINE
// --------------------------------------------------------------------------
const QUIZ_QUESTIONS = [
  {
    question: "You have the network 192.168.10.0/27. What is the broadcast address and how many usable host addresses are available?",
    options: [
      "192.168.10.31 with 30 usable hosts",
      "192.168.10.32 with 32 usable hosts",
      "192.168.10.63 with 62 usable hosts",
      "192.168.10.255 with 254 usable hosts"
    ],
    answer: 0,
    explanation: "A /27 subnet mask has 27 network bits and 5 host bits. Total addresses = 2^5 = 32 (range: .0 to .31). The network address is .0, broadcast is .31, and usable hosts are .1 to .30 (32 - 2 = 30 usable hosts)."
  },
  {
    question: "In the Spanning Tree Protocol (STP 802.1D), how is the Root Bridge elected when all switches share the default priority (32768)?",
    options: [
      "The switch with the highest IP address wins",
      "The switch with the lowest MAC address wins",
      "The switch with the fastest uplinks wins",
      "The switch that booted first wins"
    ],
    answer: 1,
    explanation: "The Bridge ID (BID) is composed of Priority (2 bytes) + MAC address (6 bytes). When priorities are tied at the default 32768, the switch with the lowest numerical MAC address wins the Root Bridge election."
  },
  {
    question: "What is the primary difference between OSPF and BGP?",
    options: [
      "OSPF is an Interior Gateway Protocol using Dijkstra's Link-State SPF within an AS; BGP is an Exterior Gateway Protocol using Path-Vector policies between Autonomous Systems.",
      "OSPF only operates on Layer 2 while BGP operates on Layer 4.",
      "BGP uses hop counts limited to 15, while OSPF uses unlimited bandwidth metrics.",
      "OSPF requires manual route injection while BGP automatically creates full mesh tunnels."
    ],
    answer: 0,
    explanation: "OSPF is a Link-State Interior Gateway Protocol (IGP) designed for fast convergence and optimal path computation inside a single enterprise/campus. BGP is a Path-Vector Exterior Gateway Protocol (EGP) designed for scalability and policy control connecting different Autonomous Systems (ASNs) across the Internet."
  },
  {
    question: "What does the 802.1Q header add to standard Ethernet frames to identify VLAN traffic?",
    options: [
      "A 4-byte Tag Protocol Identifier (TPID 0x8100) and Tag Control Information (TCI containing 12-bit VLAN ID)",
      "An IP header extension option containing the subnet ID",
      "An encrypted IPsec ESP trailer",
      "A 2-byte CRC check appended to the FCS"
    ],
    answer: 0,
    explanation: "IEEE 802.1Q inserts a 4-byte tag directly between the Source MAC and EtherType fields. It consists of TPID (0x8100, 16 bits) and TCI (PCP priority 3 bits, DEI 1 bit, and VID 12 bits allowing 4,096 VLANs)."
  },
  {
    question: "During the DHCP DORA process, which messages are typically broadcast by the client and server?",
    options: [
      "Discover and Request are broadcast by the client; Offer and Acknowledge are typically broadcast or unicast depending on flags",
      "Only the Release message is broadcast",
      "All messages are strictly unicast using ARP",
      "Only the Offer is broadcast"
    ],
    answer: 0,
    explanation: "The client lacks an IP address initially, so it sends DHCP Discover (broadcast 255.255.255.255). The server sends DHCP Offer. The client sends DHCP Request (broadcast, notifying all servers which offer it chose). The server confirms with DHCP ACK."
  },
  {
    question: "Which administrative distance (AD) takes precedence if a router learns the exact same destination prefix via both OSPF and eBGP?",
    options: [
      "eBGP (AD 20) beats OSPF (AD 110)",
      "OSPF (AD 110) beats eBGP (AD 20)",
      "Static route (AD 1) beats both",
      "They load-balance equally regardless of AD"
    ],
    answer: 0,
    explanation: "Lower Administrative Distance represents higher believability. eBGP has an AD of 20, whereas OSPF has an AD of 110. Therefore, the eBGP route will be installed in the routing table."
  },
  {
    question: "What mechanism does Dynamic ARP Inspection (DAI) rely on to prevent ARP poisoning attacks on access switches?",
    options: [
      "The DHCP Snooping binding database",
      "BGP route reflectors",
      "Spanning Tree Root Guard",
      "DNS reverse lookup PTR records"
    ],
    answer: 0,
    explanation: "DAI intercepts all ARP requests and responses on untrusted ports and validates the IP-to-MAC binding against the DHCP Snooping database (or static ARP ACLs) to discard forged ARP packets."
  },
  {
    question: "What is the default TCP port used by BGP to establish peer sessions?",
    options: [
      "TCP Port 179",
      "UDP Port 520",
      "IP Protocol 89",
      "TCP Port 443"
    ],
    answer: 0,
    explanation: "BGP runs over TCP Port 179. Unlike OSPF (which uses raw IP protocol 89) or RIP (UDP 520), BGP relies on TCP for reliable session establishment and state tracking."
  },
  {
    question: "In Port Address Translation (NAT Overload), what allows multiple internal private hosts to share a single public IP address?",
    options: [
      "Mapping unique source TCP/UDP port numbers for each session in the NAT translation table",
      "Modifying the MAC address of each outbound packet",
      "Distributing traffic across multiple default gateways",
      "Encrypting packets with different SSL certificates"
    ],
    answer: 0,
    explanation: "PAT (NAT Overload) tracks outbound connections by translating internal private IP:Port tuples to a single public IP with unique high-order TCP/UDP port numbers (e.g. 192.168.1.50:52100 -> 203.0.113.1:40101)."
  },
  {
    question: "What Syslog severity level corresponds to an 'Emergency' condition (system is unusable)?",
    options: [
      "Level 0",
      "Level 1",
      "Level 4",
      "Level 7"
    ],
    answer: 0,
    explanation: "RFC 5424 defines 8 syslog severity levels: 0 (Emergency), 1 (Alert), 2 (Critical), 3 (Error), 4 (Warning), 5 (Notice), 6 (Informational), 7 (Debug)."
  }
];

let quizCurrentIndex = 0;
let quizScore = 0;
let quizUserAnswers = [];

function initQuiz() {
  quizCurrentIndex = 0;
  quizScore = 0;
  quizUserAnswers = [];
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const container = document.getElementById('quiz-container');
  if (!container) return;

  if (quizCurrentIndex >= QUIZ_QUESTIONS.length) {
    // Show summary
    const percentage = Math.round((quizScore / QUIZ_QUESTIONS.length) * 100);
    const passed = percentage >= 70;
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
          passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' : 'bg-rose-500/20 text-rose-400 border border-rose-500'
        }">
          <i data-lucide="${passed ? 'award' : 'alert-circle'}" class="w-8 h-8"></i>
        </div>
        <h3 class="text-2xl font-bold mb-2 ${passed ? 'text-emerald-400' : 'text-rose-400'}">
          ${passed ? 'Exam Passed! Excellent Work!' : 'Study Review Recommended'}
        </h3>
        <p class="text-gray-300 mb-4">You scored <span class="font-bold text-white">${quizScore} out of ${QUIZ_QUESTIONS.length}</span> (${percentage}%)</p>
        <button onclick="initQuiz()" class="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-lg transition">
          Retake Assessment
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const q = QUIZ_QUESTIONS[quizCurrentIndex];
  let optionsHtml = '';
  q.options.forEach((opt, idx) => {
    optionsHtml += `
      <button onclick="handleQuizAnswer(${idx})" class="w-full text-left p-3.5 rounded-lg border border-gray-700 bg-gray-800/60 hover:border-cyan-500 hover:bg-gray-800 transition flex items-start gap-3 group">
        <span class="w-6 h-6 rounded-full border border-gray-600 group-hover:border-cyan-400 flex items-center justify-center text-xs font-mono font-bold text-gray-400 group-hover:text-cyan-400 flex-shrink-0 mt-0.5">
          ${String.fromCharCode(65 + idx)}
        </span>
        <span class="text-sm text-gray-200 leading-relaxed">${opt}</span>
      </button>
    `;
  });

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between text-xs text-gray-400 border-b border-gray-800 pb-3">
        <span class="font-mono text-cyan-400">QUESTION ${quizCurrentIndex + 1} OF ${QUIZ_QUESTIONS.length}</span>
        <span>Score: ${quizScore} Correct</span>
      </div>
      <h4 class="text-base font-semibold text-white leading-relaxed">${q.question}</h4>
      <div class="space-y-2.5 pt-2">
        ${optionsHtml}
      </div>
      <div id="quiz-feedback" class="hidden mt-4 p-4 rounded-lg text-sm"></div>
    </div>
  `;
}

function handleQuizAnswer(selectedIdx) {
  const q = QUIZ_QUESTIONS[quizCurrentIndex];
  const isCorrect = (selectedIdx === q.answer);
  if (isCorrect) quizScore++;

  quizUserAnswers.push({ qIndex: quizCurrentIndex, selectedIdx, isCorrect });

  const container = document.getElementById('quiz-container');
  const buttons = container.querySelectorAll('button[onclick^="handleQuizAnswer"]');
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === q.answer) {
      btn.className = 'w-full text-left p-3.5 rounded-lg border border-emerald-500 bg-emerald-500/10 text-white flex items-start gap-3';
    } else if (idx === selectedIdx && !isCorrect) {
      btn.className = 'w-full text-left p-3.5 rounded-lg border border-rose-500 bg-rose-500/10 text-white flex items-start gap-3';
    } else {
      btn.className = 'w-full text-left p-3.5 rounded-lg border border-gray-800 bg-gray-900/40 opacity-50 flex items-start gap-3';
    }
  });

  const feedback = document.getElementById('quiz-feedback');
  feedback.classList.remove('hidden');
  feedback.className = `mt-4 p-4 rounded-lg border text-sm ${
    isCorrect 
      ? 'bg-emerald-900/30 border-emerald-600 text-emerald-200' 
      : 'bg-rose-900/30 border-rose-600 text-rose-200'
  }`;
  feedback.innerHTML = `
    <div class="font-bold mb-1 flex items-center gap-2">
      <i data-lucide="${isCorrect ? 'check-circle' : 'x-circle'}" class="w-4 h-4"></i>
      ${isCorrect ? 'Correct!' : 'Incorrect'}
    </div>
    <p class="text-xs text-gray-300 leading-relaxed mb-3">${q.explanation}</p>
    <button onclick="quizNext()" class="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold">
      ${quizCurrentIndex < QUIZ_QUESTIONS.length - 1 ? 'Next Question →' : 'View Results'}
    </button>
  `;
  if (window.lucide) lucide.createIcons();
}

function quizNext() {
  quizCurrentIndex++;
  renderQuizQuestion();
}

// --------------------------------------------------------------------------
// 7. PORT LOOKUP MATRIX & SEARCH
// --------------------------------------------------------------------------
const NETWORK_PORTS = [
  { port: 20, proto: 'TCP', name: 'FTP-Data', cat: 'File Transfer', desc: 'File Transfer Protocol data transfer channel.' },
  { port: 21, proto: 'TCP', name: 'FTP-Control', cat: 'File Transfer', desc: 'FTP session commands & auth. Insecure, plain-text credentials.' },
  { port: 22, proto: 'TCP', name: 'SSH / SFTP', cat: 'Remote Access', desc: 'Secure Shell encrypted remote terminal access and secure file copy.' },
  { port: 23, proto: 'TCP', name: 'Telnet', cat: 'Remote Access', desc: 'Legacy unencrypted terminal protocol. Should never be used in modern networks.' },
  { port: 25, proto: 'TCP', name: 'SMTP', cat: 'Email', desc: 'Simple Mail Transfer Protocol for relaying email between mail servers (MTA).' },
  { port: 53, proto: 'UDP/TCP', name: 'DNS', cat: 'Infrastructure', desc: 'Domain Name System. Queries use UDP 53; zone transfers & large answers use TCP 53.' },
  { port: 67, proto: 'UDP', name: 'DHCP Server', cat: 'Infrastructure', desc: 'DHCP server listening port (BOOTP server).' },
  { port: 68, proto: 'UDP', name: 'DHCP Client', cat: 'Infrastructure', desc: 'DHCP client listening port (BOOTP client).' },
  { port: 69, proto: 'UDP', name: 'TFTP', cat: 'File Transfer', desc: 'Trivial FTP. Simple UDP-based transfer used for switch IOS images & PXE boot.' },
  { port: 80, proto: 'TCP', name: 'HTTP', cat: 'Web', desc: 'Hypertext Transfer Protocol unencrypted web traffic.' },
  { port: 88, proto: 'TCP/UDP', name: 'Kerberos', cat: 'Security', desc: 'Network authentication protocol used heavily in Active Directory domains.' },
  { port: 110, proto: 'TCP', name: 'POP3', cat: 'Email', desc: 'Post Office Protocol v3 for client email retrieval.' },
  { port: 123, proto: 'UDP', name: 'NTP', cat: 'Infrastructure', desc: 'Network Time Protocol for clock synchronization across routers and servers.' },
  { port: 137, proto: 'UDP', name: 'NetBIOS Name', cat: 'Windows', desc: 'NetBIOS Name Service.' },
  { port: 139, proto: 'TCP', name: 'NetBIOS Session', cat: 'Windows', desc: 'NetBIOS Session Service.' },
  { port: 143, proto: 'TCP', name: 'IMAP', cat: 'Email', desc: 'Internet Message Access Protocol for modern synchronized mailboxes.' },
  { port: 161, proto: 'UDP', name: 'SNMP Queries', cat: 'Management', desc: 'Simple Network Management Protocol agent query port (GET / SET / WALK).' },
  { port: 162, proto: 'UDP', name: 'SNMP Traps', cat: 'Management', desc: 'SNMP Trap receiver port for asynchronous device alerts.' },
  { port: 179, proto: 'TCP', name: 'BGP', cat: 'Routing', desc: 'Border Gateway Protocol peering sessions.' },
  { port: 389, proto: 'TCP/UDP', name: 'LDAP', cat: 'Directory', desc: 'Lightweight Directory Access Protocol query port.' },
  { port: 443, proto: 'TCP', name: 'HTTPS', cat: 'Web', desc: 'HTTP over TLS/SSL encrypted web traffic (also QUIC HTTP/3 over UDP 443).' },
  { port: 445, proto: 'TCP', name: 'SMB / CIFS', cat: 'Windows', desc: 'Server Message Block Windows file sharing and IPC.' },
  { port: 465, proto: 'TCP', name: 'SMTPS', cat: 'Email', desc: 'SMTP over SSL wrapper.' },
  { port: 500, proto: 'UDP', name: 'ISAKMP / IKE', cat: 'VPN', desc: 'Internet Key Exchange for IPsec VPN Phase 1 tunnel negotiation.' },
  { port: 514, proto: 'UDP/TCP', name: 'Syslog', cat: 'Management', desc: 'System logging standard port (RFC 5424).' },
  { port: 587, proto: 'TCP', name: 'SMTP Submission', cat: 'Email', desc: 'Standard secure mail submission port with STARTTLS.' },
  { port: 636, proto: 'TCP', name: 'LDAPS', cat: 'Directory', desc: 'LDAP over TLS/SSL.' },
  { port: 853, proto: 'TCP', name: 'DoT (DNS over TLS)', cat: 'Security', desc: 'Encrypted DNS queries over standard TLS.' },
  { port: 993, proto: 'TCP', name: 'IMAPS', cat: 'Email', desc: 'IMAP over TLS/SSL.' },
  { port: 995, proto: 'TCP', name: 'POP3S', cat: 'Email', desc: 'POP3 over TLS/SSL.' },
  { port: 1194, proto: 'UDP/TCP', name: 'OpenVPN', cat: 'VPN', desc: 'Default port for OpenVPN tunnels.' },
  { port: 1433, proto: 'TCP', name: 'MS SQL Server', cat: 'Database', desc: 'Microsoft SQL Server database listener.' },
  { port: 1521, proto: 'TCP', name: 'Oracle DB', cat: 'Database', desc: 'Oracle Database TNS listener.' },
  { port: 3306, proto: 'TCP', name: 'MySQL', cat: 'Database', desc: 'MySQL / MariaDB database port.' },
  { port: 3389, proto: 'TCP/UDP', name: 'RDP', cat: 'Remote Access', desc: 'Microsoft Remote Desktop Protocol.' },
  { port: 4500, proto: 'UDP', name: 'IPsec NAT-T', cat: 'VPN', desc: 'IPsec NAT Traversal encapsulation for ESP packets behind NAT.' },
  { port: 4789, proto: 'UDP', name: 'VXLAN', cat: 'SDN/Overlay', desc: 'Virtual Extensible LAN overlay encapsulation port (RFC 7348).' },
  { port: 5060, proto: 'UDP/TCP', name: 'SIP', cat: 'VoIP', desc: 'Session Initiation Protocol for VoIP signaling.' },
  { port: 5432, proto: 'TCP', name: 'PostgreSQL', cat: 'Database', desc: 'PostgreSQL relational database listener.' },
  { port: 8080, proto: 'TCP', name: 'HTTP-Alt / Proxy', cat: 'Web', desc: 'Common alternate web server port and HTTP proxy listener.' },
  { port: 8443, proto: 'TCP', name: 'HTTPS-Alt', cat: 'Web', desc: 'Common alternate secure web management listener.' },
  { port: 51820, proto: 'UDP', name: 'WireGuard', cat: 'VPN', desc: 'WireGuard modern cryptographic VPN port.' }
];

function renderPortTable(filter = '', category = 'all') {
  const tbody = document.getElementById('port-table-body');
  if (!tbody) return;

  const f = filter.toLowerCase().trim();
  const filtered = NETWORK_PORTS.filter(p => {
    const matchCat = (category === 'all' || p.cat.toLowerCase() === category.toLowerCase());
    const matchText = (
      p.port.toString().includes(f) ||
      p.name.toLowerCase().includes(f) ||
      p.proto.toLowerCase().includes(f) ||
      p.desc.toLowerCase().includes(f) ||
      p.cat.toLowerCase().includes(f)
    );
    return matchCat && matchText;
  });

  tbody.innerHTML = filtered.map(p => `
    <tr class="border-b border-gray-800/60 hover:bg-gray-800/40 transition">
      <td class="py-2.5 px-3 font-mono font-bold text-cyan-400">${p.port}</td>
      <td class="py-2.5 px-3 font-mono text-xs text-gray-300"><span class="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700">${p.proto}</span></td>
      <td class="py-2.5 px-3 font-semibold text-white text-xs">${p.name}</td>
      <td class="py-2.5 px-3 text-xs text-gray-400"><span class="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">${p.cat}</span></td>
      <td class="py-2.5 px-3 text-xs text-gray-300 leading-relaxed">${p.desc}</td>
    </tr>
  `).join('');
}

// --------------------------------------------------------------------------
// 8. GLOBAL SEARCH MODAL (Ctrl + K)
// --------------------------------------------------------------------------
const SEARCHABLE_ITEMS = [
  { title: 'OSI 7-Layer Model vs TCP/IP', anchor: '#mod-osi', cat: 'Foundations', tags: 'layers physical transport encapsulation pdu' },
  { title: 'Subnet Calculator & CIDR Tool', anchor: '#mod-subnet', cat: 'Addressing', tags: 'calculator cidr mask broadcast host bits vlsm' },
  { title: 'IPv4 Addressing & RFC 1918 Private Ranges', anchor: '#mod-ipv4', cat: 'Addressing', tags: '10.0.0.0 172.16.0.0 192.168.0.0 class a b c' },
  { title: 'IPv6 Architecture & SLAAC', anchor: '#mod-ipv6', cat: 'Addressing', tags: '128-bit hex eui-64 link-local dual-stack' },
  { title: 'VLANs & 802.1Q Frame Tagging', anchor: '#mod-vlan', cat: 'Switching', tags: 'trunk access native vlan tpid vid' },
  { title: 'Spanning Tree Protocol (STP / RSTP 802.1w)', anchor: '#mod-stp', cat: 'Switching', tags: 'root bridge bpdu portfast loop guard' },
  { title: 'Link Aggregation (LACP / EtherChannel)', anchor: '#mod-lacp', cat: 'Switching', tags: '802.3ad port channel load balancing' },
  { title: 'OSPF Link-State Protocol & Areas', anchor: '#mod-ospf', cat: 'Routing', tags: 'dijkstra spf area 0 lsa router-id' },
  { title: 'BGP Path Attributes & Peering', anchor: '#mod-bgp', cat: 'Routing', tags: 'as-path ebgp ibgp autonomous system port 179' },
  { title: 'DNS Resolution & Record Types', anchor: '#mod-dns', cat: 'Services', tags: 'a aaaa cname mx txt srv recursive authoritative' },
  { title: 'DHCP DORA Process & Relay Agent', anchor: '#mod-dhcp', cat: 'Services', tags: 'discover offer request ack ip helper-address' },
  { title: 'NAT & Port Address Translation (PAT)', anchor: '#mod-nat', cat: 'Services', tags: 'inside local inside global overload' },
  { title: 'Firewalls, ACLs & Rule Ordering', anchor: '#mod-firewall', cat: 'Security', tags: 'stateful packet filter standard extended' },
  { title: 'IPsec VPN Architecture (IKE Ph1 & Ph2)', anchor: '#mod-vpn', cat: 'Security', tags: 'tunnel transport esp isakmp crypto diffie-hellman' },
  { title: 'Network Diagnostic Commands (Ping, Traceroute, SS)', anchor: '#mod-troubleshooting', cat: 'Toolkit', tags: 'tcpdump wireshark nmap iperf3 netstat' },
  { title: 'Spine-and-Leaf Clos Datacenter Architecture', anchor: '#mod-datacenter', cat: 'Modern & Cloud', tags: 'ecmp sdn underlay overlay vxlan evpn' },
  { title: 'Interactive Packet Flow Simulator', anchor: '#mod-simulator', cat: 'Interactive Lab', tags: 'packet trace simulator animation step' },
  { title: 'Network Administrator Exam Quiz', anchor: '#mod-quiz', cat: 'Assessment', tags: 'quiz exam test practice questions' }
];

function handleGlobalSearch(query) {
  const resultsContainer = document.getElementById('search-results');
  if (!resultsContainer) return;

  const q = query.toLowerCase().trim();
  if (!q) {
    resultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">Type a keyword, protocol, port, or topic to search...</div>';
    return;
  }

  const matches = SEARCHABLE_ITEMS.filter(item => 
    item.title.toLowerCase().includes(q) ||
    item.cat.toLowerCase().includes(q) ||
    item.tags.toLowerCase().includes(q)
  );

  if (matches.length === 0) {
    resultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No topics matching your query.</div>';
    return;
  }

  resultsContainer.innerHTML = matches.map(item => `
    <a href="${item.anchor}" onclick="closeSearchModal()" class="block p-3 rounded-lg hover:bg-gray-800 transition border-b border-gray-800/60 last:border-0">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-cyan-300">${item.title}</span>
        <span class="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">${item.cat}</span>
      </div>
      <div class="text-xs text-gray-400 mt-1">${item.tags}</div>
    </a>
  `).join('');
}

function openSearchModal() {
  const modal = document.getElementById('search-modal');
  if (modal) {
    modal.classList.remove('hidden');
    const input = document.getElementById('search-input');
    if (input) {
      input.focus();
      input.select();
    }
  }
}

function closeSearchModal() {
  const modal = document.getElementById('search-modal');
  if (modal) modal.classList.add('hidden');
}

// --------------------------------------------------------------------------
// 9. EVENT LISTENERS & INITIALIZATION
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateProgressUI();
  runSubnetCalculator();
  renderSimScenario('crossSubnet');
  renderPortTable();
  initQuiz();

  // Keyboard shortcut Ctrl+K / Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearchModal();
    } else if (e.key === 'Escape') {
      closeSearchModal();
    }
  });

  // CLI terminal enter key listener
  const cliInput = document.getElementById('cli-input-field');
  if (cliInput) {
    cliInput.addEventListener('keydown', handleCliInputKey);
  }

  // Subnet input key listener
  const calcInput = document.getElementById('calc-input');
  if (calcInput) {
    calcInput.addEventListener('input', runSubnetCalculator);
  }

  // Port filter listeners
  const portSearch = document.getElementById('port-search-input');
  const portCat = document.getElementById('port-cat-filter');
  if (portSearch) {
    portSearch.addEventListener('input', () => {
      renderPortTable(portSearch.value, portCat ? portCat.value : 'all');
    });
  }
  if (portCat) {
    portCat.addEventListener('change', () => {
      renderPortTable(portSearch ? portSearch.value : '', portCat.value);
    });
  }

  if (window.lucide) {
    lucide.createIcons();
  }
});
