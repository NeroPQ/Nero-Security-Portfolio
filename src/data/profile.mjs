export const profile = {
  name: 'Phan Thien Quang',
  handle: 'Nero',

  headline: 'RED TEAM / BLUE TEAM / SECURITY RESEARCH',

  heroSummary:
    'Exploring offensive security, investigating threats, and building practical defensive solutions.',

  bio:
    'Information Assurance student passionate about offensive and defensive cybersecurity, with hands-on experience in penetration testing, SOC operations, vulnerability research, and security engineering.',

  location: 'Ho Chi Minh City, Vietnam',
  github: 'https://github.com/NeroPQ',
  linkedin: 'https://www.linkedin.com/in/phan-quang-nero/',
  tryhackme: 'https://tryhackme.com/p/N3R0PH4N',
  email: 'phanthienquang11234@gmail.com',

  education: {
    school: 'FPT University',
    degree: 'Bachelor of Information Assurance',
    years: '2024 — Present',
    gpa: '3.4 / 4.0',
  },

  platforms: [
    {
      name: 'TryHackMe',
      detail: 'Top 1% · SOC Level 1 path completed',
      url: 'https://tryhackme.com/p/N3R0PH4N',
      category: 'LEARNING PLATFORM',
      mark: 'THM',
    },
    {
      name: 'Hack The Box',
      detail: 'Hands-on security labs',
      url: 'https://app.hackthebox.com/users/3896988?profile-top-tab=machines&ownership-period=1M&profile-bottom-tab=prolabs',
      category: 'LEARNING PLATFORM',
      mark: 'HTB',
    },
    {
      name: 'CTF Competitions',
      detail: 'THRYVE 2026 · CSCV 2026',
      url: 'https://github.com/NeroPQ/CSCV2026-Writeup',
      category: 'HANDS-ON PRACTICE',
      mark: 'CTF',
    },
  ],

  featuredProjects: [
    {
      icon: '⌁',
      group: 'Security Engineering',
      type: 'Detection engineering · Ongoing',
      accent: 'blue',
      name: 'Ransomware AI Detection & Adaptive Response',
      summary:
        'Behavioral telemetry and hybrid detection research with false-positive/negative evaluation. Results are from synthetic and controlled development tests.',
      tags: [
        'Python', 'FastAPI', 'XGBoost',
        'Random Forest', 'Prometheus', 'Grafana', 'Docker'
      ],
      url: 'https://github.com/NeroPQ/Ransomware_AI_Dectection',
      action: 'View source & research ↗',
      status: 'ACTIVE RESEARCH',
    },
    {
      icon: '◈',
      group: 'Security Engineering',
      type: 'Privacy & tooling',
      accent: 'teal',
      name: 'MetaShield · Metadata Risk Scanner',
      summary:
        'Python CLI identifying privacy-sensitive metadata in JPEG, PNG, PDF and DOCX files, with sanitization workflows and automated tests.',
      tags: [
        'Python', 'Typer', 'Pillow',
        'pikepdf', 'pytest', 'GitHub Actions'
      ],
      url: 'https://github.com/NeroPQ/metashield',
      action: 'View project ↗',
      status: 'DOCUMENTED PROJECT',
    },
    {
      icon: '◎',
      group: 'Security Engineering',
      type: 'Blue Team · Practical',
      accent: 'purple',
      name: 'SOC Alert Investigation & SIEM Lab',
      summary:
        'Investigated phishing, PowerShell, suspicious processes and authentication events using host/network evidence, IOC correlation and MITRE ATT&CK.',
      tags: [
        'Splunk', 'Sysmon', 'Windows Logs',
        'Wireshark', 'MITRE ATT&CK'
      ],
      url: null,
      action: null,
      status: 'PRACTICAL LAB',
    },
    {
      icon: '▣',
      group: 'Academic Projects',
      type: 'Educational web app',
      accent: 'teal',
      name: 'AI Smart Campus',
      summary:
        'Student team web project promoting responsible AI use through checkers, guided learning, assessments and feedback.',
      tags: [
        'Web Development',
        'Responsible AI',
        'Education'
      ],
      url: 'https://github.com/NeroPQ/ai-smart-campus',
      action: 'View project repository ↗',
      status: 'ACADEMIC PROJECT',
    },
    {
      icon: '⌘',
      group: 'Academic Projects',
      type: 'Python web application · PWD301',
      accent: 'blue',
      name: 'FIA Workspace · Club Management',
      summary:
        'Academic team web application for managing club members, events, tasks and funds. Includes role-based access control and an AI assistant for data lookup and proposals.',
      tags: [
        'Python', 'Flask', 'Jinja2',
        'SQLAlchemy', 'RBAC', 'Docker'
      ],
      url: 'https://github.com/nitale143/PWD301_Webapp_ClubManagement',
      action: 'View team repository ↗',
      status: 'ACADEMIC TEAM PROJECT',
    },
    {
      icon: '◇',
      group: 'Security Engineering',
      type: 'CTI automation · In progress',
      accent: 'amber',
      name: 'Vulnerability Intelligence Platform',
      summary:
        'Python collector successfully normalized NVD, FIRST EPSS and CISA KEV data for four CVEs. Cloud database, Grafana publishing and automated synchronization are planned.',
      tags: [
        'Python', 'CTI', 'NVD',
        'EPSS', 'CISA KEV'
      ],
      url: null,
      action: null,
      status: 'MVP / IN PROGRESS',
    },
  ],

  experience: [
    {
      label: 'INTERNSHIP · REMOTE · 2026',
      title: 'NetworkWalks · Cybersecurity Intern',
      detail:
        'Hands-on training in web security, reconnaissance, vulnerability assessment, incident response, technical investigation and structured reporting.',
    },
    {
      label: 'EDUCATION · 2024 — PRESENT',
      title: 'FPT University · Information Assurance',
      detail:
        'Third-year student in Ho Chi Minh City · GPA 3.4/4.0 · coursework in networks, systems, information security, cryptography and programming.',
    },
    {
      label: 'COMMUNITY · SECURITY & CTF',
      title: 'FIA Club · Cybersecurity Learning & Competitions',
      detail:
        'Expanded practical knowledge across different cybersecurity topics through club activities and participated in CTF challenges and security competitions of different scales.',
    },
    {
      label: 'COMMUNITY · LEADERSHIP',
      title: 'SiTi Club · Human Resources',
      detail:
        'Supported volunteer coordination, recruitment activities and student community engagement.',
    },
  ],

  achievements: [
    {
      kicker: 'TRYHACKME · PLATFORM',
      title: 'Top 1%',
      detail: 'TryHackMe ranking reported on both resumes; live rank can change.',
      url: 'https://tryhackme.com/p/N3R0PH4N',
      action: 'View THM profile ↗',
      featured: true,
    },
    {
      kicker: 'TRAINING · SEP 2026',
      title: 'SOC Level 1',
      detail: 'TryHackMe SOC Level 1 Learning Path · Certificate of Completion.',
      url: 'https://tryhackme.com/p/N3R0PH4N',
      action: 'View training profile ↗',
    },
    {
      kicker: 'CTF · AUG 2026',
      title: 'THRYVE Top 15',
      detail: 'Placed in the Top 15 at THRYVE CTF 2026.',
      url: null,
      action: null,
    },
    {
      kicker: 'CTF · 2026',
      title: 'CSCV · 46th',
      detail:
        'Team WannaLoSE · FPT University HCMC · 1,900 points. Public challenge writeups available.',
      url: 'https://github.com/NeroPQ/CSCV2026-Writeup',
      action: 'Read team writeups ↗',
    },
    {
      kicker: 'ACADEMIC · SUMMER 2026',
      title: 'Top 100 Students',
      detail: 'Top 100 Excellent Students · FPT University.',
      url: null,
      action: null,
    },
    {
      kicker: 'ENGLISH · MAR 2025',
      title: 'IELTS 6.0',
      detail: 'English proficiency result listed in both resumes.',
      url: null,
      action: null,
    },
  ],

  skillGroups: [
    {
      name: 'SOC & Detection',
      items: [
        'Splunk', 'Elastic / Kibana', 'Sysmon',
        'Windows Event Logs', 'IOC Analysis',
        'MITRE ATT&CK', 'Alert Triage'
      ],
    },
    {
      name: 'Network & Pentesting',
      items: [
        'Nmap', 'Wireshark', 'Snort',
        'NetworkMiner', 'Web Security',
        'Linux', 'TCP/IP', 'VPN'
      ],
    },
    {
      name: 'Engineering & Automation',
      items: [
        'Python', 'FastAPI', 'Bash', 'SQL',
        'Docker', 'GitHub Actions',
        'Grafana', 'Prometheus'
      ],
    },
  ],

  training: [
    {
      title: 'Cisco CCNA (200-301)',
      detail: 'In progress · target December 2026. Not yet certified.',
    },
  ],
};
