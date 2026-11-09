# NetAdmin OS — Enterprise Network Administrator Handbook & Interactive Lab

> **A self-contained, high-performance interactive study portal and reference manual for Network Administrators, Systems Engineers, and NetDevOps professionals.**

---

## 🚀 Features & Modules

- **Core Foundations & Architecture**:
  - Detailed OSI 7-Layer vs TCP/IP 4-Layer breakdown with PDU encapsulation envelopes (Bits -> Frames -> Packets -> Segments -> Data).
  - Physical & logical network topologies: Star, Mesh, Ring, Bus, and Datacenter Spine-and-Leaf Clos fabrics.
- **IPv4, IPv6 & Subnetting Mastery**:
  - **Live Interactive Subnet Calculator**: Input any IP and CIDR prefix to calculate Network ID, Broadcast, Subnet Mask, Wildcard Mask, Usable Range, and a 32-bit binary visualizer with network vs host bit coloring.
  - RFC 1918 Private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), APIPA, Loopback, and Multicast blocks.
  - IPv6 architecture, compression rules, EUI-64, SLAAC, and address types.
- **Switching & Layer 2 Protocols**:
  - Switch CAM table mechanics: Learning, Flooding, Forwarding, Filtering, and Aging.
  - ARP and Gratuitous ARP (GARP).
  - 802.1Q VLAN Tag anatomy (TPID, PCP, DEI, VID), Access vs Trunk ports, and Native VLAN security.
  - Spanning Tree Protocol (STP 802.1D / RSTP 802.1w): Root Bridge election, Port Roles (RP, DP, Alternate), and Port States.
- **Routing, OSPF & BGP**:
  - Routing table lookup mechanics and the Longest Prefix Match rule.
  - Administrative Distance (AD) hierarchy table.
  - OSPF Link-State SPF algorithm, Area 0 hierarchy, LSA types, and neighbor state machine (Down -> Init -> 2-Way -> ExStart -> Exchange -> Loading -> Full).
  - BGP Path Selection algorithm (Weight, LOCAL_PREF, AS-Path, Origin, MED).
- **Core Network Services**:
  - DNS recursive vs iterative resolution flow, record types (A, AAAA, CNAME, MX, TXT, PTR, SRV).
  - DHCP DORA sequence (Discover, Offer, Request, Acknowledge) and DHCP Relay (`ip helper-address`).
  - NAT & PAT (Port Address Translation / Overload) with Inside Local, Inside Global, Outside Local, Outside Global mapping.
- **Network Security & Defense**:
  - Standard vs Extended ACL rules, placement best practices, and the implicit deny rule.
  - IPsec Site-to-Site VPN: IKE Phase 1 (ISAKMP SA) & Phase 2 (IPsec SA / ESP).
- **Interactive Labs & Simulators**:
  - **Interactive Packet Flow Simulator**: Step through a cross-subnet HTTPS request or local ARP/ping with real-time L2/L3/L4 header inspection.
  - **Interactive Network CLI Simulator**: Type commands (`ping`, `traceroute`, `arp -a`, `show ip route`, `show vlan`, `subnet`, `dig`) directly into a terminal interface.
  - **Network Port Reference Matrix**: Searchable and categorized database of 40+ standard protocols and ports.
  - **Certification Practice Exam**: 10 high-yield questions with instant scoring and detailed explanations.
- **Study Progress Tracking**:
  - Check off topics as you study; progress is automatically saved to your browser's `localStorage`.
  - Global Quick Search modal (`Ctrl+K` or `Cmd+K`).
  - Dark / Light mode toggle.

---

## 💻 Local Preview

Because **NetAdmin OS** is a modern, zero-dependency static web application, you can view it immediately without any build steps or web servers:

1. Double click [`index.html`](file:///Users/morayoallen/Downloads/network%20admin/index.html) or open it in any web browser (Chrome, Safari, Firefox, Edge).
2. Or run a simple local web server in this directory:
   ```bash
   # If you have python3 installed:
   python3 -m http.server 8080
   ```
   Then open `http://localhost:8080`.

---

## 🌐 How to Host on GitHub & Get Your Live Link

Follow these simple steps to publish your site on **GitHub Pages** (100% free and automated):

### Step 1: Create a New GitHub Repository
1. Log in to [GitHub](https://github.com).
2. Click the **+** icon in the top right corner and select **New repository**.
3. Name your repository (e.g. `netadmin-study` or `network-admin`).
4. Set visibility to **Public**.
5. Do **not** initialize with a README (this folder already has everything).
6. Click **Create repository**.

### Step 2: Push This Directory to Your GitHub Repository
Open your Mac Terminal, navigate to this directory, and run:

```bash
cd "/Users/morayoallen/Downloads/network admin"

# Initialize git repository
git init -b main

# Add all files
git add .

# Commit
git commit -m "Initial commit of NetAdmin OS handbook and interactive lab"

# Link your new repository (replace <YOUR_GITHUB_USERNAME> and <REPO_NAME>)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<REPO_NAME>.git

# Push to GitHub
git push -u origin main
```

*(Note: If your Mac requests the Command Line Developer Tools when running `git`, click "Install" on the popup, or run `xcode-select --install` in your terminal, then re-run the commands above.)*

### Step 3: Enable GitHub Pages for Your Live Link
1. On GitHub, navigate to your repository page.
2. Click **Settings** (top tab) -> **Pages** (in the left sidebar).
3. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions** (the automated `.github/workflows/deploy.yml` included in this repo will automatically deploy it), **OR** select **Deploy from a branch** -> Branch: `main` / `/ (root)` -> Click **Save**.
4. Within 1–2 minutes, GitHub will publish your site!
5. Your live link will be:
   ```text
   https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>/
   ```
