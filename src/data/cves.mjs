export const repoBase = 'https://github.com/NeroPQ/CVE-Research-Lab';
export const cves = [
  {
    id: 'CVE-2021-44228', slug: 'log4shell', name: 'Log4Shell', family: 'Remote Code Execution', score: 10.0, level: 'CRITICAL',
    summary: 'A vulnerable Log4j lookup path in Apache Solr led to a JNDI callback, Java class retrieval and verified command execution.',
    impact: 'User-level RCE', result: 'Commands executed as solr (UID 1001)',
    detail: 'Investigated the JNDI/LDAP lookup flow, configured a controlled LDAP referral and HTTP delivery path, then correlated reverse-connection evidence with operating system command output.',
    rootCause: 'Unsafe processing of attacker-controlled JNDI lookup expressions in affected Log4j2 configurations.',
    evidence: ['LDAP referral for the hosted class', 'HTTP GET /Exploit.class with status 200', 'Reverse connection to listener', 'whoami, id, hostname and pwd on target'],
    limits: 'User-level access was verified; root access and post-patch validation were not demonstrated. Version checks were recorded on an earlier lab instance.',
    folder: 'CVE-2021-44228-Log4Shell', evidenceFiles: ['notes/exploitation.md', 'notes/research.md', 'notes/reconnaissance.md'],
    tags: ['Java', 'Apache Solr', 'JNDI', 'Log4j']
  },
  {
    id: 'CVE-2021-4034', slug: 'pwnkit', name: 'PwnKit', family: 'Local Privilege Escalation', score: 7.8, level: 'HIGH',
    summary: 'Reproduced local privilege escalation in pkexec with the public PwnKit proof of concept in an authorized lab.',
    impact: 'Root privileges', result: 'root shell verified as UID 0',
    detail: 'Studied SUID execution and pkexec argument processing, reproduced the public PoC and confirmed the privilege boundary crossing using identity commands and root-only lab file access.',
    rootCause: 'Out-of-bounds access in pkexec when processing an empty argument vector, interacting with environment handling.',
    evidence: ['Compiled and executed public PoC', 'whoami returned root', 'id returned uid=0(root)', 'Root-only lab file access (flag redacted)'],
    limits: 'The exact Linux distribution and polkit package build were not captured in the supplied lab evidence.',
    folder: 'CVE-2021-4034-PwnKit', evidenceFiles: ['notes/evidence-log.md', 'screenshots/01-root-privilege-confirmation.png', 'screenshots/02-flag-access-redacted.png'],
    tags: ['Linux', 'Polkit', 'SUID', 'PrivEsc']
  },
  {
    id: 'CVE-2022-0847', slug: 'dirty-pipe', name: 'Dirty Pipe', family: 'Local Privilege Escalation', score: 7.8, level: 'HIGH',
    summary: 'Validated two privilege-escalation approaches against a vulnerable Linux kernel in a disposable training VM.',
    impact: 'Root privileges', result: 'UID 0 confirmed in two lab approaches',
    detail: 'Researched pipe buffers, page-cache overwrites and the PIPE_BUF_FLAG_CAN_MERGE condition; exercised a controlled passwd-file overwrite and a SUID binary technique.',
    rootCause: 'Improper initialization of pipe_buffer flags permits writes into file-backed cached pages despite ordinary read-only file permissions.',
    evidence: ['PoC-based /etc/passwd overwrite', 'su and id confirmed UID 0', 'SUID binary technique confirmed UID 0', 'Cleanup screenshot for temporary SUID helper'],
    limits: 'Kernel build was not captured and complete cleanup of the passwd-file technique was not independently verified.',
    folder: 'CVE-2022-0847-DirtyPipe', evidenceFiles: ['notes/evidence-log.md', 'screenshots/01-passwd-root-redacted.png', 'screenshots/02-bl4sty-exploit-root.png'],
    tags: ['Linux Kernel', 'Page Cache', 'SUID', 'PrivEsc']
  },
  {
    id: 'CVE-2022-22965', slug: 'spring4shell', name: 'Spring4Shell', family: 'Remote Code Execution', score: 9.8, level: 'CRITICAL',
    summary: 'Reproduced command execution through a Spring Framework data-binding vulnerability in a TryHackMe lab.',
    impact: 'Remote command execution', result: 'whoami response returned root',
    detail: 'Used the provided lab PoC to exercise a Tomcat/JSP attack path and documented HTTP output indicating command execution under the target account.',
    rootCause: 'Unsafe data binding can expose internal Java class-loading paths when vulnerable application and deployment prerequisites are met.',
    evidence: ['Lab PoC source archived', 'HTTP response documented', 'whoami returned root', 'Two screenshots and an evidence log'],
    limits: 'Exact Spring, JDK and Tomcat versions were not captured; id output was not independently visible.',
    folder: 'CVE-2022-22965-Spring4Shell', evidenceFiles: ['notes/evidence-log.md', 'screenshots/01-http-response.png', 'screenshots/02-root-command-output.png'],
    tags: ['Java', 'Spring MVC', 'Tomcat', 'RCE']
  }
];
export const githubReport = (c) => `${repoBase}/blob/main/${c.folder}/README.md`;
export const githubEvidence = (c, path) => `${repoBase}/blob/main/${c.folder}/${path}`;
