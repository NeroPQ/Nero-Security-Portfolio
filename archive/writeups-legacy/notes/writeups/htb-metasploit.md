# Using the Metasploit Framework — Technical Study & Lab Report

**Platform:** Hack The Box Academy
**Status:** Documented practice · Screenshot evidence pending
**Date:** 2026-10-30
**Official URL:** https://academy.hackthebox.com/course/preview/using-the-metasploit-framework

> Evidence-backed study notes. Module completion has not been independently verified.

## 1. Overview

This report documents technical learning and selected hands-on observations associated with the Hack The Box Academy module Using the Metasploit Framework. Four sections are covered: Meterpreter, Writing & Importing Modules, Introduction to MSFVenom, and Firewall and IDS/IPS Evasion. The available evidence does not establish completion of all four sections or the entire module. A separate FortiLogger training session provides a verified example of successful Meterpreter initial access.

## 2. Learning Objectives

The objective was to understand the framework components used during authorized penetration testing and evaluate the difference between payload delivery, session establishment, privilege context and post-exploitation results.

- Understand Metasploit's module and payload architecture.
- Recognize Meterpreter session capabilities and limitations.
- Understand how external Ruby modules are imported.
- Study payload formats and MSFVenom configuration.
- Understand the defensive role of firewalls, IDS and IPS.
- Document successful and failed actions independently.

## 3. Technical Background

Metasploit provides a modular penetration-testing framework. Exploit modules target particular weaknesses, while payloads define the behavior requested after exploitation. Auxiliary modules support additional assessment tasks. A session is an established interaction channel, but does not automatically imply administrator privileges, unrestricted command execution or successful credential extraction.

- An exploit check and an exploitation result are different observations.
- A handler listens for or manages connections from a payload.
- A staged payload can retrieve a larger component after initial execution.
- Post-exploitation capabilities depend on permissions and environment.

## 4. Meterpreter

Meterpreter is an advanced Metasploit payload providing an interactive session and various extensions. During a laboratory investigation, the analyst should determine the session identity, target process context and available permissions before attempting privileged operations. Session creation is the first verified result, not the final proof of post-exploitation success.

- Identify which payload and handler were used.
- Confirm that the session actually opened.
- Inspect the available session context.
- Separate successful access from later privilege-dependent operations.

```text
# Framework reference commands, not a claimed execution trace
sessions -l
show options
show payloads
```

## 5. Writing & Importing Modules

Metasploit supports additional modules written in Ruby. Modules have metadata, configurable options and implementation methods appropriate to their category. External modules may be placed in the user's module directory and loaded by the framework. This material is documented as study notes because no confirmed custom-module execution output was recovered.

- Understand the responsibilities of module metadata.
- Review module options, validation and target assumptions.
- Inspect externally sourced modules before using them.
- Distinguish loading a module from successful execution.

```text
# Framework reference commands
reload_all
show options
info
```

## 6. Introduction to MSFVenom

MSFVenom is Metasploit's payload-generation utility. It can enumerate supported payloads, architectures, encoders and output formats. The selected payload must match the operating system, execution environment and configured listener. The earlier learning material included a Windows IIS/ASPX example; however, its successful execution was not independently verified in the recovered evidence.

- Understand platform and architecture requirements.
- Differentiate payload type from output-file format.
- Recognize the relationship between a payload and handler.
- Avoid claiming AV or EDR bypass from encoding alone.

```text
# Safe tool-reference commands
msfvenom --help
msfvenom --list payloads
msfvenom --list formats
```

## 7. Firewall and IDS/IPS Evasion

This section explored how firewalls, network detection systems and endpoint protection influence payload delivery and session communication. Signature-based and behavioral controls observe different indicators. The study covered theoretical evasion concepts, but no reliable evidence of successfully bypassing a production-grade IDS, IPS, antivirus or EDR solution was recovered.

- Firewalls enforce configured network access policies.
- IDS detects suspicious activity and generates alerts.
- IPS may block traffic based on configured rules.
- Endpoint tools can correlate process, file and network behavior.
- Encoding a payload is not equivalent to evading security controls.

## 8. FortiLogger — Recorded Laboratory Result

A separate authorized laboratory exercise targeted FortiLogger version 4.4.2.2 using the Metasploit framework. The console reported a vulnerable target, generated and uploaded a payload, executed it and opened Meterpreter session 2. This is supporting practical evidence for framework and Meterpreter concepts, not proof that all HTB Academy sections were completed.

- Vulnerability check: positive.
- Payload upload and execution: reported successful.
- Meterpreter session: confirmed opened.
- SAM hash retrieval: failed.
- SYSTEM-level privilege: not independently confirmed by this output.

```text
[+] The target is vulnerable. FortiLogger version 4.4.2.2
[+] Generate Payload
[+] Payload has been uploaded
[*] Executing payload...
[*] Meterpreter session 2 opened

(Meterpreter 2)(C:\Windows\system32) > hashdump
[-] priv_passwd_get_sam_hashes: Operation failed: Incorrect function.
```

## 9. Troubleshooting and Additional Observations

The failed hashdump operation demonstrates why a successful session should not be treated as evidence of unrestricted access. Possible causes require further investigation of the session's privilege context and environment; the available output does not establish a definitive cause. A separate MS17-010 training investigation produced positive vulnerability indications, while later exploitation attempts did not establish a shell in the recovered transcript.

- Preserve exact error messages for troubleshooting.
- Check session type and permissions before interpreting failures.
- Do not equate a vulnerability check with successful RCE.
- Do not claim credential extraction without corresponding output.
- Record unsuccessful attempts as legitimate laboratory findings.

## 10. Defensive Investigation and Detection

The same framework activity relevant to penetration testing can produce useful defensive telemetry. A SOC analyst may correlate unexpected application child processes, remote network connections, suspicious executable creation, credential access attempts and security-tool alerts. Detection conclusions should be supported by timestamps, affected hosts, process ancestry and other independent evidence.

- Correlate endpoint and network telemetry.
- Investigate unexpected processes spawned by server applications.
- Review unusual outbound connections and session behavior.
- Monitor sensitive credential-store access where telemetry is available.
- Prioritize verified indicators over assumptions based on tool names.

## 11. Conclusion, Limitations and References

The recovered material supports structured study of four Metasploit topics and one successful FortiLogger Meterpreter session. It does not independently prove completion of the entire Academy module, successful AV/IDS/IPS evasion, administrative access or successful credential dumping. Genuine screenshots have not yet been attached to this article. The principal reference is Hack The Box Academy's Using the Metasploit Framework module, supplemented by the recorded authorized laboratory session. The write-up remains evidence pending until suitable original screenshots are available and checked.

- Official module: https://academy.hackthebox.com/course/preview/using-the-metasploit-framework
- Framework documentation: https://docs.metasploit.com/
- Missing evidence: original Meterpreter screenshot.
- Missing evidence: section-specific terminal screenshots.
- No GitHub publishing or deployment is implied by this update.

