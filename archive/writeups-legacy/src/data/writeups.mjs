// NERO.SEC — Platform write-ups
// CVE case studies are intentionally kept in the Research section.

export const writeups = [
  {
    slug: 'thm-soc-level-1',
    platform: 'THM',
    category: 'SOC / Blue Team',
    title: 'SOC Level 1 — Investigation & Alert Triage',
    status: 'Path completed (reported in CV)',
    kind: 'reported',
    date: '2026',
    source: 'https://tryhackme.com/path/outline/blueteam',
    summary:
      'A structured overview of SIEM, phishing, endpoint monitoring and incident triage; not a claim that every individual room was independently verified.',
    tags: [
      'Splunk', 'Elastic', 'Windows Logs',
      'Wireshark', 'MITRE ATT&CK'
    ],
    sections: [
      {
        heading: 'Learning scope',
        text:
          'The SOC Level 1 learning path covers alert triage, phishing investigation, SIEM and EDR fundamentals, network monitoring, Windows and Linux log analysis, and escalation. The completion claim comes from my resume; a room-by-room completion export is not available.'
      },
      {
        heading: 'Practical investigation workflow',
        text:
          'For each alert, I establish what triggered the detection, the affected host or identity, the activity timeline, and the independent evidence required to reach a verdict. Process, authentication and network records should corroborate one another before escalation.',
        points: [
          'Record the alert ID, detection rule and timestamp.',
          'Correlate accounts, process trees, destinations and host telemetry.',
          'Determine True Positive, False Positive or Inconclusive based on evidence.',
          'Recommend containment or escalation only where justified.'
        ]
      },
      {
        heading: 'Phishing investigation notes',
        text:
          'Earlier investigation sessions included phishing alert examples #8815 and #8817, analyzed through sender-domain inspection, suspicious login links and connection evidence. These are documented investigation notes, not verified individual TryHackMe room completions. A blocked network connection must not be reported as a successful compromise.'
      },
      {
        heading: 'Windows event correlation',
        text:
          'Windows Event IDs 4624 and 4625 represent successful and failed logons. Event ID 4688 may record process creation when the relevant auditing is enabled. These records require interpretation alongside logon types, users, hosts, process ancestry and network events.'
      },
      {
        heading: 'Defensive takeaway',
        text:
          'A good SOC investigation results in a defensible narrative: what was detected, the independent observations supporting or contradicting it, a justified verdict, and an actionable handoff. Tools support the analysis but do not replace it.'
      }
    ],
    images: []
  },
  {
    slug: 'thm-flarevm-arsenal',
    platform: 'THM',
    category: 'Malware Analysis',
    title: 'FlareVM — Arsenal of Tools',
    status: 'Studied / completion not verified',
    kind: 'notes',
    date: '2026',
    source: 'https://tryhackme.com/room/flarevmarsenaloftools',
    summary:
      'Notes on the isolated Windows malware-analysis toolbox, static inspection, triage and safe handling of suspicious files.',
    tags: [
      'FlareVM', 'Static Analysis', 'Malware Triage'
    ],
    sections: [
      {
        heading: 'Room objective',
        text:
          'FlareVM is a Windows-based toolkit for incident response, reverse engineering and malware investigation. The room introduces tool categories and safe workflows. My earlier learning notes cover these concepts, but there is no retained evidence that every room task was completed.'
      },
      {
        heading: 'Safe analysis workflow',
        text:
          'Start with an isolated virtual machine and an evidence copy. Inspect file type, metadata and readable strings before progressing to deeper static analysis or controlled dynamic execution. Record cryptographic hashes and observations for reproducibility.',
        points: [
          'Use an isolated, disposable VM for untrusted samples.',
          'Record sample provenance and SHA-256.',
          'Begin with static inspection.',
          'Perform dynamic analysis only inside a controlled lab.',
          'Never distribute suspicious samples from the training environment.'
        ]
      },
      {
        heading: 'Connection to SOC operations',
        text:
          'A SOC analyst may receive a suspicious document or executable after alert triage. FlareVM helps examine the artifact and identify potential indicators for further investigation. Static strings or suspicious metadata alone should not be treated as proof that malicious behavior occurred.'
      }
    ],
    images: []
  },
  {
    slug: 'htb-footprinting',
    platform: 'HTB',
    category: 'Reconnaissance',
    title: 'Footprinting — Network Service Enumeration',
    status: 'Hands-on practice; full module not verified',
    kind: 'practice',
    date: '2026-10',
    source: 'https://academy.hackthebox.com/course/preview/footprinting',
    summary:
      'Systematic enumeration of enterprise services including DNS, mail, SMB/NFS, SNMP, databases and remote management.',
    tags: [
      'Nmap', 'DNS', 'SMTP / IMAP',
      'SMB', 'SNMP', 'MSSQL'
    ],
    sections: [
      {
        heading: 'Objective and methodology',
        text:
          'Footprinting focuses on discovering accessible services, identifying their protocols and configurations, and extracting useful information during an authorized assessment. Service enumeration is not equivalent to vulnerability exploitation.'
      },
      {
        heading: 'Sections covered in my practice',
        text:
          'The documented exercises and discussions involved FTP, SMB, NFS, DNS, SMTP, IMAP/POP3, SNMP, MySQL, MSSQL, Oracle TNS, IPMI, SSH, RDP and WinRM. The historical conversations support practical exposure to these topics but do not establish completion of the entire HTB Academy module.'
      },
      {
        heading: 'Hard lab — Mail services',
        text:
          'Recovered notes describe a training host exposing SSH and several mail-related ports, including POP3/IMAP and their TLS variants. The investigation began with service identification and then focused on the behavior of the identified mail protocols. A final verified flag was not recovered.'
      },
      {
        heading: 'Technical observations',
        text:
          'Protocol-specific enumeration is more informative than relying on port numbers alone. SMTP may disclose mail configuration or supported extensions; SMB may reveal shares and access policies; SNMP may expose management information; and database services may reveal version and authentication characteristics.'
      },
      {
        heading: 'Security takeaway',
        text:
          'A useful assessment finding includes the service, the observed evidence, the potential security implication and any limitations. Negative results should also be documented; an unsuccessful enumeration attempt does not prove that the service is secure.'
      }
    ],
    images: []
  },
  {
    slug: 'htb-shells-payloads',
    platform: 'HTB',
    category: 'Exploitation Fundamentals',
    title: 'Shells & Payloads — From Foothold to Validation',
    status: 'Hands-on sections documented',
    kind: 'practice',
    date: '2026-10',
    source: 'https://academy.hackthebox.com/course/preview/shells--payloads',
    summary:
      'Bind and reverse shells, web shells and controlled application-lab footholds, including rConfig and file-upload investigation.',
    tags: [
      'Linux', 'Reverse Shell', 'Web Shell',
      'PHP', 'ASPX'
    ],
    sections: [
      {
        heading: 'Understanding shells',
        text:
          'A bind shell listens on the target and waits for a connection, while a reverse shell initiates an outbound connection from the target to the tester. The choice depends on routing, firewall restrictions, available interpreters and the authorized assessment scope.'
      },
      {
        heading: 'Hands-on sections',
        text:
          'The documented practice included Anatomy of a Shell, Bind Shells, Reverse Shells, Unix/Linux footholds, Antak ASPX web shells, PHP web shells and payload delivery.'
      },
      {
        heading: 'rConfig file-upload investigation',
        text:
          'An rConfig 3.9.6 training target was investigated through a file-upload exploitation exercise. The resulting application investigation identified configuration-related artifacts, including edgerouter-isp.yml and hostnameinfo.txt.'
      },
      {
        heading: 'Validating a foothold',
        text:
          'A successful shell requires more than a tool reporting that a payload was delivered. The resulting session must be validated by observing command execution, user context, filesystem permissions and the expected application environment.'
      },
      {
        heading: 'Defensive takeaway',
        text:
          'Upload restrictions should be enforced on the server rather than relying on client-provided MIME types. Application owners should monitor unexpected server-side scripts, unusual child processes and outbound connections originating from web application services.'
      }
    ],
    images: []
  },
  {
    "slug": "htb-metasploit",
    "platform": "HTB",
    "category": "Exploitation Frameworks",
    "title": "Using the Metasploit Framework — Technical Study & Lab Report",
    "status": "Documented practice · Screenshot evidence pending",
    "kind": "practice",
    "date": "2026-10-30",
    "source": "https://academy.hackthebox.com/course/preview/using-the-metasploit-framework",
    "summary": "An evidence-aware technical study of Meterpreter, external Metasploit modules, MSFVenom and firewall/IDS evasion, supplemented by recorded FortiLogger and MS17-010 lab observations.",
    "tags": [
      "Metasploit",
      "Meterpreter",
      "MSFVenom",
      "External Modules",
      "IDS/IPS",
      "HTB Academy"
    ],
    "sections": [
      {
        "heading": "1. Overview",
        "text": "This report documents technical learning and selected hands-on observations associated with the Hack The Box Academy module Using the Metasploit Framework. Four sections are covered: Meterpreter, Writing & Importing Modules, Introduction to MSFVenom, and Firewall and IDS/IPS Evasion. The available evidence does not establish completion of all four sections or the entire module. A separate FortiLogger training session provides a verified example of successful Meterpreter initial access."
      },
      {
        "heading": "2. Learning Objectives",
        "text": "The objective was to understand the framework components used during authorized penetration testing and evaluate the difference between payload delivery, session establishment, privilege context and post-exploitation results.",
        "points": [
          "Understand Metasploit's module and payload architecture.",
          "Recognize Meterpreter session capabilities and limitations.",
          "Understand how external Ruby modules are imported.",
          "Study payload formats and MSFVenom configuration.",
          "Understand the defensive role of firewalls, IDS and IPS.",
          "Document successful and failed actions independently."
        ]
      },
      {
        "heading": "3. Technical Background",
        "text": "Metasploit provides a modular penetration-testing framework. Exploit modules target particular weaknesses, while payloads define the behavior requested after exploitation. Auxiliary modules support additional assessment tasks. A session is an established interaction channel, but does not automatically imply administrator privileges, unrestricted command execution or successful credential extraction.",
        "points": [
          "An exploit check and an exploitation result are different observations.",
          "A handler listens for or manages connections from a payload.",
          "A staged payload can retrieve a larger component after initial execution.",
          "Post-exploitation capabilities depend on permissions and environment."
        ]
      },
      {
        "heading": "4. Meterpreter",
        "text": "Meterpreter is an advanced Metasploit payload providing an interactive session and various extensions. During a laboratory investigation, the analyst should determine the session identity, target process context and available permissions before attempting privileged operations. Session creation is the first verified result, not the final proof of post-exploitation success.",
        "points": [
          "Identify which payload and handler were used.",
          "Confirm that the session actually opened.",
          "Inspect the available session context.",
          "Separate successful access from later privilege-dependent operations."
        ],
        "code": "# Framework reference commands, not a claimed execution trace\nsessions -l\nshow options\nshow payloads"
      },
      {
        "heading": "5. Writing & Importing Modules",
        "text": "Metasploit supports additional modules written in Ruby. Modules have metadata, configurable options and implementation methods appropriate to their category. External modules may be placed in the user's module directory and loaded by the framework. This material is documented as study notes because no confirmed custom-module execution output was recovered.",
        "points": [
          "Understand the responsibilities of module metadata.",
          "Review module options, validation and target assumptions.",
          "Inspect externally sourced modules before using them.",
          "Distinguish loading a module from successful execution."
        ],
        "code": "# Framework reference commands\nreload_all\nshow options\ninfo"
      },
      {
        "heading": "6. Introduction to MSFVenom",
        "text": "MSFVenom is Metasploit's payload-generation utility. It can enumerate supported payloads, architectures, encoders and output formats. The selected payload must match the operating system, execution environment and configured listener. The earlier learning material included a Windows IIS/ASPX example; however, its successful execution was not independently verified in the recovered evidence.",
        "points": [
          "Understand platform and architecture requirements.",
          "Differentiate payload type from output-file format.",
          "Recognize the relationship between a payload and handler.",
          "Avoid claiming AV or EDR bypass from encoding alone."
        ],
        "code": "# Safe tool-reference commands\nmsfvenom --help\nmsfvenom --list payloads\nmsfvenom --list formats"
      },
      {
        "heading": "7. Firewall and IDS/IPS Evasion",
        "text": "This section explored how firewalls, network detection systems and endpoint protection influence payload delivery and session communication. Signature-based and behavioral controls observe different indicators. The study covered theoretical evasion concepts, but no reliable evidence of successfully bypassing a production-grade IDS, IPS, antivirus or EDR solution was recovered.",
        "points": [
          "Firewalls enforce configured network access policies.",
          "IDS detects suspicious activity and generates alerts.",
          "IPS may block traffic based on configured rules.",
          "Endpoint tools can correlate process, file and network behavior.",
          "Encoding a payload is not equivalent to evading security controls."
        ]
      },
      {
        "heading": "8. FortiLogger — Recorded Laboratory Result",
        "text": "A separate authorized laboratory exercise targeted FortiLogger version 4.4.2.2 using the Metasploit framework. The console reported a vulnerable target, generated and uploaded a payload, executed it and opened Meterpreter session 2. This is supporting practical evidence for framework and Meterpreter concepts, not proof that all HTB Academy sections were completed.",
        "code": "[+] The target is vulnerable. FortiLogger version 4.4.2.2\n[+] Generate Payload\n[+] Payload has been uploaded\n[*] Executing payload...\n[*] Meterpreter session 2 opened\n\n(Meterpreter 2)(C:\\Windows\\system32) > hashdump\n[-] priv_passwd_get_sam_hashes: Operation failed: Incorrect function.",
        "points": [
          "Vulnerability check: positive.",
          "Payload upload and execution: reported successful.",
          "Meterpreter session: confirmed opened.",
          "SAM hash retrieval: failed.",
          "SYSTEM-level privilege: not independently confirmed by this output."
        ]
      },
      {
        "heading": "9. Troubleshooting and Additional Observations",
        "text": "The failed hashdump operation demonstrates why a successful session should not be treated as evidence of unrestricted access. Possible causes require further investigation of the session's privilege context and environment; the available output does not establish a definitive cause. A separate MS17-010 training investigation produced positive vulnerability indications, while later exploitation attempts did not establish a shell in the recovered transcript.",
        "points": [
          "Preserve exact error messages for troubleshooting.",
          "Check session type and permissions before interpreting failures.",
          "Do not equate a vulnerability check with successful RCE.",
          "Do not claim credential extraction without corresponding output.",
          "Record unsuccessful attempts as legitimate laboratory findings."
        ]
      },
      {
        "heading": "10. Defensive Investigation and Detection",
        "text": "The same framework activity relevant to penetration testing can produce useful defensive telemetry. A SOC analyst may correlate unexpected application child processes, remote network connections, suspicious executable creation, credential access attempts and security-tool alerts. Detection conclusions should be supported by timestamps, affected hosts, process ancestry and other independent evidence.",
        "points": [
          "Correlate endpoint and network telemetry.",
          "Investigate unexpected processes spawned by server applications.",
          "Review unusual outbound connections and session behavior.",
          "Monitor sensitive credential-store access where telemetry is available.",
          "Prioritize verified indicators over assumptions based on tool names."
        ]
      },
      {
        "heading": "11. Conclusion, Limitations and References",
        "text": "The recovered material supports structured study of four Metasploit topics and one successful FortiLogger Meterpreter session. It does not independently prove completion of the entire Academy module, successful AV/IDS/IPS evasion, administrative access or successful credential dumping. Genuine screenshots have not yet been attached to this article. The principal reference is Hack The Box Academy's Using the Metasploit Framework module, supplemented by the recorded authorized laboratory session. The write-up remains evidence pending until suitable original screenshots are available and checked.",
        "points": [
          "Official module: https://academy.hackthebox.com/course/preview/using-the-metasploit-framework",
          "Framework documentation: https://docs.metasploit.com/",
          "Missing evidence: original Meterpreter screenshot.",
          "Missing evidence: section-specific terminal screenshots.",
          "No GitHub publishing or deployment is implied by this update."
        ]
      }
    ],
    "images": []
  },
  {
    slug: 'htb-password-attacks',
    platform: 'HTB',
    category: 'Authentication Security',
    title: 'Password Attacks — SMB & SAM Investigation',
    status: 'Hands-on sections documented',
    kind: 'practice',
    date: '2026-10-31',
    source: 'https://academy.hackthebox.com/course/preview/password-attacks',
    summary:
      'Controlled SMB authentication, authenticated access and Windows local account hash analysis, with sensitive values excluded.',
    tags: [
      'SMB', 'Windows', 'SAM',
      'Authentication', 'Hash Analysis'
    ],
    sections: [
      {
        heading: 'Scope of investigation',
        text:
          'The module covers credential storage, authentication protocols, password attacks and weak credential practices. My recovered activity focuses on network services and Windows SMB. Full completion of every module section is not established.'
      },
      {
        heading: 'SMB laboratory observations',
        text:
          'A Windows laboratory target accepted a provided training account. The tool subsequently reported privileged access and retrieved local SAM account hash data. The original password and hash values are intentionally removed from this public version.',
        code:
          'SMB  [lab-target]  [+] [lab-user]:[REDACTED] (Pwn3d!)\n' +
          'SMB  [lab-target]  [*] Dumping SAM hashes\n' +
          'SMB  [lab-target]  [REDACTED: local account hash output]'
      },
      {
        heading: 'Technical interpretation',
        text:
          'Authentication success, administrative authorization and access to stored credentials are distinct conditions. Technical reports should identify precisely which security boundary was crossed and which observed outputs support that conclusion.'
      },
      {
        heading: 'Defensive takeaway',
        text:
          'Reduce credential reuse, enforce strong authentication, restrict local administrator permissions, monitor suspicious remote logons and protect credential stores. Sensitive account data should not appear in public screenshots or write-ups.'
      }
    ],
    images: []
  }
];


// BEGIN NERO_NEXURA_DRAFT_PREVIEW_V1
import {
  nexuraReportMarkdown
} from './nero-nexura-report.mjs';

const neroNexuraDraft = {
  "slug": "htb-password-attacks-skills-assessment-nexura",
  "platform": "HTB",
  "category": "Authentication Security",
  "title": "HTB Academy — Password Attacks Skills Assessment: NEXURA Domain",
  "status": "DRAFT — EVIDENCE PENDING",
  "kind": "draft",
  "date": "2026-11-02",
  "source": "https://academy.hackthebox.com/course/preview/password-attacks",
  "summary": "Full technical report of the NEXURA Password Attacks skills assessment. Screenshots and completion evidence remain pending verification.",
  "tags": [
    "HTB Academy",
    "Password Attacks",
    "Skills Assessment",
    "Authentication",
    "Evidence Pending"
  ],
  "sections": [],
  "images": []
};

if (
  process.env.NERO_SHOW_DRAFTS === '1' &&
  !writeups.some(item => item.slug === neroNexuraDraft.slug)
) {
  writeups.push({
    ...neroNexuraDraft,
    markdown: nexuraReportMarkdown
  });
}
// END NERO_NEXURA_DRAFT_PREVIEW_V1


// BEGIN NERO_FORTILOGGER_DRAFT_V1
import {
  fortiloggerReportMarkdown
} from './nero-fortilogger-report.mjs';

const neroFortiLoggerDraft = {
  "slug": "htb-metasploit-fortilogger-meterpreter",
  "platform": "HTB",
  "category": "Exploitation Frameworks",
  "title": "HTB Academy \u2014 Meterpreter: FortiLogger Exploitation and SAM Dump Troubleshooting",
  "status": "DRAFT \u2014 EVIDENCE PENDING",
  "kind": "draft",
  "date": "2026-11-02",
  "source": "https://academy.hackthebox.com/course/preview/using-the-metasploit-framework",
  "summary": "Full FortiLogger and Meterpreter technical report recovered from the existing Kali draft. Screenshot evidence remains pending.",
  "tags": [
    "HTB Academy",
    "Metasploit",
    "Meterpreter",
    "FortiLogger",
    "Technical Investigation"
  ],
  "sections": [],
  "images": []
};

if (
  process.env.NERO_SHOW_DRAFTS === '1' &&
  !writeups.some(w => w.slug === neroFortiLoggerDraft.slug)
) {
  writeups.push({
    ...neroFortiLoggerDraft,
    markdown: fortiloggerReportMarkdown
  });
}
// END NERO_FORTILOGGER_DRAFT_V1


// BEGIN NERO_SHELLS_PAYLOADS_FULL_MODULE_V1
import {
  neroShellsPayloadsMarkdown
} from './nero-shells-payloads-report.mjs';

const neroShellsPayloadsEntry = writeups.find(
  item => item.slug === 'htb-shells-payloads'
);

if (!neroShellsPayloadsEntry) {
  throw new Error('Missing canonical Shells & Payloads entry');
}

Object.assign(neroShellsPayloadsEntry, {
  title: 'Shells & Payloads — Windows, Linux and Web Initial Access',
  platform: 'HTB',
  category: 'Offensive Security / Initial Access',
  status: '17 sections documented · Evidence Pending',
  kind: 'practice',
  date: '2026-11-02',
  source: 'https://academy.hackthebox.com/app/module/115',
  summary:
    'Complete 17-section technical module journal covering ' +
    'shell fundamentals, Windows/Linux initial access, ' +
    'Metasploit, web shells, troubleshooting and defensive analysis.',
  tags: [
    'HTB Academy',
    '17 Sections',
    'Medium',
    'Bind Shell',
    'Reverse Shell',
    'Metasploit',
    'MSFvenom',
    'Web Shells'
  ],
  markdown: neroShellsPayloadsMarkdown
});
// END NERO_SHELLS_PAYLOADS_FULL_MODULE_V1

