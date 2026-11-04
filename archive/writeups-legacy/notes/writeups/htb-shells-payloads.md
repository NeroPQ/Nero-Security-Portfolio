# Shells & Payloads — Windows, Linux and Web Initial Access

**Platform:** Hack The Box Academy  
**Module:** Shells & Payloads (Module 115)  
**Difficulty:** Medium  
**Category:** Offensive Security / Initial Access / Post-Exploitation Fundamentals  
**Coverage:** 17 Sections  
**Documentation Status:** Module-level study documented; practical evidence partially verified  
**Publication Status:** Evidence Pending  
**Official Module:** https://academy.hackthebox.com/app/module/115

---

## 1. Overview

The Shells & Payloads module introduces the technical principles and practical methodologies involved in establishing command execution and interactive shell access on Windows, Linux, and web application environments.

The training follows a fictional penetration testing engagement involving CAT5 Security. Its emphasis is on understanding how shells operate, selecting appropriate payloads, identifying viable delivery methods, and validating the level of access obtained.

The module progresses from basic shell concepts to bind and reverse shell communication, Metasploit-assisted exploitation, MSFvenom payload generation, operating-system-specific infiltration, webshell techniques, and defensive detection.

A final practical engagement combines these techniques into a scenario requiring investigation, exploitation planning, and access verification.

This write-up consolidates the module's learning objectives and documented study activities. It distinguishes technical demonstrations from verified hands-on outcomes.

## 2. Learning Objectives

The primary learning objectives are to:

- Explain the distinction between local, bind, reverse, and web-based shells.
- Understand the relationship between exploits, payloads, and execution contexts.
- Identify shell communication characteristics and network requirements.
- Use common enumeration techniques to identify potential access vectors.
- Understand how Metasploit automates exploit and payload workflows.
- Explain payload generation and platform-specific execution requirements.
- Investigate Windows and Unix/Linux initial access techniques.
- Recognize the limitations of non-interactive shells.
- Understand webshell delivery through vulnerable upload functionality.
- Apply a systematic methodology to practical exploitation assessments.
- Identify endpoint and network indicators associated with shell activity.

## 3. Technical Background

### 3.1 Shell Architecture

A shell provides an interface between a user or remote operator and the operating system.

Common shell interpreters include Bash, Zsh, PowerShell, and Windows Command Prompt.

In a penetration testing context, shell access typically results from successful authentication, exploitation of a vulnerability, or another authorized execution mechanism.

The permissions available through a shell are determined by the security context of the associated process.

Obtaining a shell does not necessarily grant administrative privileges.

### 3.2 Bind Shells and Reverse Shells

A bind shell exposes a listening service on the target system. The operator initiates the network connection to that listener.

A reverse shell operates in the opposite direction: the operator starts a listener, and the target initiates an outbound connection.

These approaches have different network requirements.

Bind shells require a reachable listening port on the target, while reverse shells depend on an outbound connection path from the target toward the operator.

Firewalls, network address translation, host routing, and endpoint security can affect either approach.

### 3.3 Payloads and Exploitation

An exploit takes advantage of a vulnerability or security weakness.

A payload defines the action performed once the necessary execution capability has been obtained.

Payloads may provide command execution, establish a network connection, or initialize a more advanced interactive environment.

Payload selection must consider the operating system, processor architecture, execution context, and available communication channels.

### 3.4 Web-Based Command Execution

A webshell is a server-side script or application component that provides remote command execution through a web interface.

Examples include PHP webshells on Linux web servers and ASPX webshells on Windows IIS environments.

The critical security weakness is not the scripting language itself, but an application configuration or vulnerability that permits unauthorized server-side execution.

## 4. Lab Environment

The module is designed around intentionally vulnerable Windows and Linux systems available through HTB Academy.

The relevant tools and technologies include:

- Kali Linux or HTB Pwnbox
- Nmap
- Netcat
- Metasploit Framework
- MSFvenom
- Burp Suite
- HTTP and FTP clients
- Bash, Python, PowerShell, and CMD
- IIS / ASP.NET
- Apache / PHP
- Wireshark and network traffic analysis tools

The discussions also cover rConfig, Antak, and Laudanum.

**Evidence limitation:** Exact target configurations, tool versions, credentials, and successful execution records have not been verified for every section.

## 5. Investigation Methodology

The methodology can be divided into six phases.

**Phase 1 — Engagement Preparation**

Identify the authorized testing scope, accessible systems, network restrictions, and available assessment tools.

**Phase 2 — Enumeration**

Identify accessible services, application technologies, operating systems, and potential weaknesses.

**Phase 3 — Access Vector Selection**

Evaluate whether the environment supports a bind shell, reverse shell, webshell, or framework-assisted exploit.

**Phase 4 — Execution and Validation**

Attempt the selected technique within the authorized environment and validate the resulting access through system information and command execution.

**Phase 5 — Shell Interaction**

Determine the current user, execution permissions, shell capabilities, and limitations.

**Phase 6 — Evidence and Defensive Analysis**

Preserve command output, record unsuccessful attempts, inspect relevant security telemetry, and document remediation opportunities.

## 6. Section-by-Section Technical Walkthrough

### 01 — Shells Jack Us In, Payloads Deliver Us Shells

The introductory section establishes the difference between a shell and a payload.

A shell is the interface through which instructions are issued to an operating system. A payload is a component that can provide such access following successful execution.

The distinction is central to later exploitation activities: identifying a vulnerability is not equivalent to obtaining a functional shell.

The section also introduces why command-line access is valuable during penetration testing, including its flexibility for system investigation and automation.

**Key takeaway:** A shell is an access interface, while a payload is one possible mechanism for obtaining it.

### 02 — CAT5 Security's Engagement Preparation

The module presents an engagement scenario involving CAT5 Security.

Preparation involves establishing testing objectives, understanding the assessment environment, and selecting tools appropriate to the available systems.

An effective penetration test requires more than running exploits. The operator must understand authorization boundaries, connectivity, credentials, and evidence-handling responsibilities.

Technical preparation should include verifying access to the lab network and maintaining a structured activity log.

**Key takeaway:** Engagement preparation establishes the operational and authorization context for subsequent technical work.

### 03 — Anatomy of a Shell

This section introduces the components and behavior of command-line shells.

Shells receive commands, interact with operating-system resources, and return output through standard input, standard output, and standard error.

The degree of interactivity depends on the environment in which the shell runs.

A fully interactive terminal differs from a restricted command execution interface or a non-TTY remote shell.

Understanding this distinction is essential when troubleshooting command execution, terminal control, or authentication utilities.

**Key takeaway:** Having command execution does not automatically mean having a fully interactive terminal.

### 04 — Bind Shells

A bind shell listens for an incoming connection on the target system.

The operator connects to the exposed service and interacts with the shell over the established network channel.

This architecture may be effective in environments where the target is reachable and inbound connections are allowed.

However, host firewalls and network segmentation frequently restrict access to unexpected listening ports.

The documented learning material includes a bind-shell demonstration involving TCP port 4444 and command execution under a non-administrative account.

**Key takeaway:** Bind shells depend on inbound connectivity to the target and should be understood in terms of both operating-system permissions and network exposure.

### 05 — Reverse Shells

A reverse shell initiates a connection from the target to a listener controlled by the operator.

This approach is useful in environments where direct inbound connections to the target are restricted but outbound connections are possible.

A reverse shell requires the listening address and port to be reachable from the target system.

Misconfigured listener addresses, firewall restrictions, and routing issues are common sources of failure.

A successful TCP connection alone is not sufficient evidence of a usable interactive shell.

**Key takeaway:** Reverse shells depend on target-initiated communication, making accurate network configuration essential.

### 06 — Introduction to Payloads

Payloads are responsible for performing a defined action after execution becomes possible.

They may be implemented using native executables, interpreted scripts, shellcode, or other formats.

A payload's compatibility depends on characteristics such as operating system, architecture, interpreter support, and runtime conditions.

The distinction between a payload and its delivery mechanism is particularly important.

For example, an application upload vulnerability provides a possible delivery mechanism, but successful payload execution depends on additional server-side conditions.

**Key takeaway:** Payload delivery and successful payload execution are separate stages that require independent verification.

### 07 — Automating Payloads & Delivery with Metasploit

Metasploit provides modules that automate portions of the exploitation process.

A typical workflow includes identifying exposed services, researching relevant vulnerabilities, selecting an appropriate module, reviewing required configuration, and executing the module within the lab.

Important commands include `search`, `use`, `info`, `show options`, `set`, `check`, and `run`.

The framework simplifies repetitive tasks and provides mechanisms for handling compatible payload sessions.

However, exploit success depends on satisfying the module's assumptions and requirements.

A failed exploit attempt does not conclusively prove that the target is not vulnerable.

**Key takeaway:** Metasploit supports exploitation workflows, but technical validation remains the operator's responsibility.

### 08 — Crafting payloads with MSFvenom

MSFvenom generates payloads in formats appropriate for different platforms and execution environments.

Important configuration elements include payload type, local callback address, listening port, output format, and processor architecture.

The studied examples include generating ASPX-formatted payloads for a compatible Windows IIS environment.

A generated file is not automatically executable on every system supporting the same operating system.

The target must provide the necessary runtime, permissions, and execution path.

A reverse payload also requires an appropriately configured handler.

**Key takeaway:** Payload generation must account for execution compatibility and network communication requirements.

### 09 — Infiltrating Windows

Windows initial access requires an understanding of exposed services and the security context of the affected application.

Potential execution environments include IIS, ASP.NET, Windows services, and other accessible application components.

The studied material includes an IIS-related scenario involving ASPX execution and a Meterpreter session.

A session running under an IIS Application Pool identity demonstrates execution within the web application's security context.

This does not establish administrative or SYSTEM-level access.

Post-access investigation should therefore begin by identifying the current account, available privileges, and the host environment.

**Key takeaway:** Initial access on Windows must be assessed independently from privilege escalation.

### 10 — Infiltrating Unix/Linux

This section follows an application-focused exploitation methodology.

The workflow begins with identifying exposed services, determining the web application and its version, and researching known vulnerabilities.

The supplied learning notes discuss a vulnerable rConfig deployment, including a Metasploit module related to authenticated file-upload remote code execution.

The resulting execution context may belong to a restricted web service account rather than root.

After establishing command execution, the operator should inspect the current identity and evaluate shell interactivity.

**Key takeaway:** Linux application exploitation commonly produces restricted initial access that requires further investigation.

### 11 — Spawning Interactive Shells

A shell obtained through an application vulnerability may lack full terminal functionality.

Restricted shells can have difficulty supporting terminal-dependent commands, interactive prompts, and job control.

On Unix/Linux systems, Python's `pty` module can be used in compatible environments to spawn a pseudo-terminal.

The studied technique includes `pty.spawn("/bin/bash")`.

Terminal capabilities may also depend on the local listener and environment variables.

Importantly, upgrading a shell's interactivity does not increase the account's privileges.

**Key takeaway:** Shell stabilization improves usability but does not constitute privilege escalation.

### 12 — Introduction to Web Shells

A webshell provides an HTTP-accessible mechanism for command execution or filesystem interaction on a web server.

Webshell access may result from insecure upload functionality, vulnerable application components, or another unauthorized execution path.

Unlike a traditional reverse shell, a webshell does not necessarily require a persistent outbound socket connection.

The server may process commands independently for each HTTP request.

Webshell functionality is constrained by the permissions of the underlying web application process.

**Key takeaway:** Webshells are application-mediated command execution interfaces, not necessarily interactive network shells.

### 13 — Laudanum, One Webshell to Rule Them All

Laudanum is a collection of webshell-related resources supporting several server-side technologies.

The toolkit includes scripts intended for controlled security testing in environments where server-side execution is possible.

The studied material references the local Kali directory `/usr/share/laudanum/`.

The correct file type depends on the target application's execution environment.

Using an incompatible script format or placing it in a non-executable directory will prevent the intended behavior.

**Key takeaway:** Webshell selection must match the server-side technology and execution permissions.

### 14 — Antak Webshell

Antak is an ASPX-based webshell associated with the Nishang toolkit.

It provides a browser-based interface for interacting with PowerShell functionality on compatible Windows web servers.

The studied workflow includes reviewing the ASPX source, configuring access credentials, uploading the file within the lab, and accessing the corresponding application URL.

The effectiveness of the technique depends on ASP.NET support, server configuration, file accessibility, and the web application's execution permissions.

Antak should not be treated as equivalent to an administrative Windows session.

**Key takeaway:** Antak demonstrates how ASP.NET-based server execution can expose Windows command execution through a web interface.

### 15 — PHP Web Shells

This section examines file-upload weaknesses involving PHP web applications.

The provided notes describe a scenario where an upload request is intercepted and the declared MIME type is modified.

The example changes a PHP file's `Content-Type` header to `image/gif`.

This illustrates the danger of trusting client-controlled metadata during file validation.

However, upload acceptance alone does not prove remote code execution.

The file must be stored in an accessible location and processed by the server as executable PHP.

The three distinct outcomes are:

1. The server accepts the upload.
2. The server stores and exposes the uploaded file.
3. The server executes the file as PHP.

Only the third outcome establishes PHP execution capability.

**Key takeaway:** Secure file upload validation must be enforced server-side, and successful execution must be verified separately.

### 16 — The Live Engagement

The final practical section combines the module's concepts into a multi-target assessment.

The engagement requires evaluating existing reconnaissance information, identifying suitable access methods, and demonstrating shell access against Windows, Linux, and web application targets.

The documented prior study notes refer to a Linux target running Ubuntu and a Windows host identified as `SHELLS-WINBLUE`.

Some lab outcomes were previously recorded, but the available evidence is insufficient to authenticate every objective or confirm that the complete assessment was passed.

No unverified flags or completed objectives are claimed in this write-up.

**Key takeaway:** Practical exploitation requires independently validated results across multiple target environments, not merely successful use of individual tools.

### 17 — Detection & Prevention

The final defensive section examines how shell and payload activity can be detected through host and network telemetry.

Relevant security data sources include application logs, file creation events, command execution records, authentication events, firewall logs, network flows, and packet captures.

Important indicators include unexpected executable uploads, web server processes launching command interpreters, unusual outbound connections, and suspicious activities by service accounts.

The section relates offensive techniques to MITRE ATT&CK concepts, including Initial Access, Execution, and Command and Control.

Defensive controls include endpoint protection, application hardening, least-privilege policies, segmentation, network monitoring, and appropriate firewall configurations.

A defense-in-depth approach is essential because no individual protective control can reliably prevent every exploitation technique.

**Key takeaway:** Successful detection depends on correlating host, application, and network evidence rather than relying on a single malicious signature.

## 7. Troubleshooting and Technical Limitations

The module introduces several failure conditions that may occur during shell establishment.

| Scenario | Technical Interpretation |
|---|---|
| No connection to a bind-shell listener | The listening service may be unavailable or blocked by network controls |
| Reverse callback does not arrive | Callback address, port, routing, or firewall configuration may be incorrect |
| Exploit executes without a usable session | Payload execution or session initialization may have failed |
| Webshell upload succeeds without command execution | The destination may not permit server-side script execution |
| Shell commands behave unexpectedly | The shell may lack terminal capabilities |
| Shell is available without administrative access | Execution occurs under a restricted account |
| Security software blocks a payload | Endpoint or network controls may have identified the activity |

These are general technical troubleshooting categories. They are not all confirmed as failures encountered during the recorded exercises.

## 8. Results and Evidence

### 8.1 Documented Learning Outcomes

The available learning material supports familiarity with the following technical areas:

- Bind-shell and reverse-shell architectures.
- Payload selection and Metasploit-assisted execution.
- Windows and Linux initial access concepts.
- Shell stabilization and pseudo-terminal functionality.
- ASPX and PHP webshell behavior.
- File-upload validation weaknesses.
- Detection and prevention strategies.

### 8.2 Previously Recorded Practical Outcomes

Earlier study notes reference a bind-shell interaction, command execution under a restricted account, and selected results from the final multi-target engagement.

These references require confirmation against their original terminal outputs and screenshots before publication as independently verified findings.

### 8.3 Evidence Limitations

The complete set of original screenshots, timestamps, terminal sessions, and assessment results is not currently available for verification.

Accordingly, this write-up does not claim:

- Full completion of every practical exercise.
- Verified exploitation of every target.
- Administrative access without supporting evidence.
- Successful completion of all final assessment objectives.

**Evidence Status: PENDING**

## 9. Security Implications

The techniques studied illustrate how software vulnerabilities and insecure application configurations can expose operating-system command execution.

Several defensive implications are particularly relevant.

**Web Application Security:** File-upload validation should not rely exclusively on client-provided MIME types. Uploaded content should be restricted from server-side execution.

**Endpoint Security:** Unexpected command interpreters, process creation chains, and suspicious memory or network activity should be investigated.

**Network Security:** Outbound connection monitoring and segmentation can reduce the likelihood of unauthorized shell communication.

**Access Control:** Least-privilege execution limits the damage caused by vulnerabilities in public-facing applications.

**Incident Response:** Host and network evidence should be correlated to determine the origin, execution context, and extent of an incident.

MITRE ATT&CK provides useful mappings for public-facing application exploitation, command execution, webshell activity, and command-and-control communication.

## 10. Lessons Learned

The most significant lessons from the module are:

1. A shell represents an execution context, not a guaranteed level of privilege.
2. Bind and reverse shells have different connectivity requirements.
3. Payload compatibility depends on the target operating system and runtime.
4. Automated exploitation requires manual interpretation and verification.
5. Successful file upload does not automatically establish remote code execution.
6. Shell stabilization is separate from privilege escalation.
7. Webshell techniques introduce recognizable application and endpoint artifacts.
8. Evidence collection is essential for a credible penetration testing report.
9. Defensive monitoring should correlate application, process, and network activity.
10. A complete assessment requires validation of objectives rather than assuming success from tool output.

## 11. References

1. Hack The Box Academy — Shells & Payloads, Module 115.  
   https://academy.hackthebox.com/app/module/115

2. Hack The Box Academy — Shells & Payloads Course Overview.  
   https://academy.hackthebox.com/course/preview/shells--payloads

3. Rapid7 — Metasploit Framework Documentation.  
   https://docs.metasploit.com/

4. MITRE ATT&CK — Exploit Public-Facing Application (T1190).  
   https://attack.mitre.org/techniques/T1190/

5. MITRE ATT&CK — Web Shell (T1505.003).  
   https://attack.mitre.org/techniques/T1505/003/

6. OWASP — File Upload Cheat Sheet.  
   https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

---

**Assessment Classification:** Authorized cybersecurity training  
**Documentation Classification:** Consolidated module study and partially documented hands-on practice  
**Publication Status:** Evidence Pending
