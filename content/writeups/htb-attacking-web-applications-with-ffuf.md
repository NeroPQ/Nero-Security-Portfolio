| Field | Value |
|---|---|
| Author | NeroPQ — NERO.SEC |
| Platform | Hack The Box Academy |
| Module | Attacking Web Applications with Ffuf (Module 54) |
| Official URL | https://academy.hackthebox.com/app/module/54 |
| Difficulty | Not verified |
| Category | Web Application Security — Web Fuzzing / Enumeration |
| Report date | 2026-11-17 |
| Classification | Public lab write-up (flags redacted) |
| Publication status | Draft — not approved for publication |

> **Evidence-integrity note.** Every command, output and screenshot in this report comes from the author's own lab sessions on HTB Academy (Parrot OS PwnBox). Anything that was not captured is marked **EVIDENCE PENDING** and is not presented as a verified result. Flags are never published; screenshots that contained a flag were redacted with a black box before inclusion. Lab target IPs and ports are ephemeral and replaced with `<TARGET_IP>` / `<PORT>` in prose.

## Contents

1. [Overview](#overview)
2. [Learning Objectives](#learning-objectives)
3. [Environment and Evidence Boundaries](#environment-and-evidence-boundaries)
4. [01. Web Fuzzing](#01-web-fuzzing)
5. [02. Directory Fuzzing](#02-directory-fuzzing)
6. [03. Page Fuzzing](#03-page-fuzzing)
7. [04. Recursive Scanning](#04-recursive-scanning)
8. [05. DNS Records](#05-dns-records)
9. [06. Sub-domain Fuzzing](#06-sub-domain-fuzzing)
10. [07. VHost Fuzzing](#07-vhost-fuzzing)
11. [08. Filtering Results](#08-filtering-results)
12. [09. Parameter Fuzzing — GET](#09-parameter-fuzzing--get)
13. [10. Parameter Fuzzing — POST](#10-parameter-fuzzing--post)
14. [11. Value Fuzzing](#11-value-fuzzing)
15. [12. Skills Assessment — Web Fuzzing](#12-skills-assessment--web-fuzzing)
16. [Troubleshooting](#troubleshooting)
17. [Results and Evidence](#results-and-evidence)
18. [Security Implications](#security-implications)
19. [Lessons Learned](#lessons-learned)
20. [References](#references)

## Overview

This module teaches web fuzzing with **ffuf** (Fuzz Faster U Fool): sending many requests in which one part of the request is replaced by entries from a wordlist, then separating interesting responses from noise. The module moves from content discovery (directories, pages, extensions, recursion) to host discovery (sub-domains, virtual hosts) and finally to parameter discovery (GET, POST, values), and closes with a skills assessment that chains all of these against one target.

The report follows the same order as the module. Each chapter gives the concept, the commands that were run, an interpretation of the output, and a defensive note.

## Learning Objectives

- Use ffuf's `FUZZ` keyword in URLs, headers and POST bodies, and bind wordlists with `-w <file>:<KEYWORD>`.
- Enumerate directories, files and extensions, and scan recursively.
- Distinguish sub-domain fuzzing (public DNS) from VHost fuzzing (the `Host` header against one IP).
- Filter noise with size, status and auto-calibration options so real hits stand out.
- Discover accepted GET/POST parameters and then brute-force their values.
- Chain all techniques in an unguided assessment.

## Environment and Evidence Boundaries

| Item | Detail |
|---|---|
| Attacker host | HTB Academy PwnBox (Parrot OS), ffuf v2.1.0-dev |
| Targets | Per-section HTB Academy lab instances (IP and port change per spawn) |
| Wordlists seen in evidence | `/usr/share/dirbuster/wordlists/directory-list-2.3-small.txt`, `/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt`, `/usr/share/seclists/Discovery/Web-Content/web-extensions.txt`, a self-made `ids.txt` (1–1000) |
| Local name resolution | Entries appended to `/etc/hosts` for `*.academy.htb` |
| Evidence available | 12 real screenshots plus saved terminal text for the sub-domain and VHost scans |
| Evidence missing | GET parameter scan, recursive scan listing, extension scan on the assessment target, `/courses/` page listing, and the assessment's value-fuzz scan — see **EVIDENCE PENDING** markers |

> **Scope note.** All targets are HTB-provided lab hosts. The one public domain used (`inlanefreight.com`, chapter 06) is the one the module itself instructs the student to fuzz; the scan was a single pass of a 4,989-word list.

## 01. Web Fuzzing

### Concept

Fuzzing sends a large number of requests while mutating one input. For web enumeration, the mutated part is usually a path, a host name, a parameter name or a parameter value. The attacker does not need to know what exists; the server's response (status code, size, word/line count, timing) reveals it.

ffuf marks the mutation point with a keyword, `FUZZ` by default:

```bash
ffuf -w <wordlist>:FUZZ -u http://<TARGET>/FUZZ
```

Options used throughout this report:

| Option | Purpose |
|---|---|
| `-w file:KEY` | Wordlist and the keyword it replaces |
| `-u` | Target URL (may contain the keyword) |
| `-H` | Add a header (used for `Host:` and `Content-Type:`) |
| `-X`, `-d` | HTTP method and POST body |
| `-e` | Extensions appended to each word |
| `-recursion`, `-recursion-depth` | Scan inside discovered directories |
| `-ic` | Ignore wordlist comment lines |
| `-fs`, `-fc`, `-mc` | Filter size, filter status, match status |
| `-ac` | Auto-calibration against a baseline response |
| `-t`, `-v` | Threads, verbose full-URL output |

By default ffuf matches `200-299,301,302,307,401,403,405,500` (visible in every screenshot's header block).

### Defensive perspective

Fuzzing is loud: thousands of requests from one source in seconds. Rate limiting, WAF rules and log alerting on bursts of 404/403 responses detect it, but only if logging is centralised.

## 02. Directory Fuzzing

### Concept

Directory fuzzing places `FUZZ` after the base URL. A 301 on `/name` usually means a directory exists and the server is redirecting to `/name/`.

### Commands

```bash
ffuf -w /usr/share/dirbuster/wordlists/directory-list-2.3-small.txt:FUZZ -u http://<TARGET_IP>:<PORT>/FUZZ
```

The first attempt used `/opt/useful/seclists/...` and failed (see Troubleshooting). Switching to the dirbuster wordlist worked.

### Output and interpretation

Two directories returned **301**: `forum` and `blog`. The many `Status: 200, Size: 986` lines are wordlist comment lines (`# ...`) that resolve to the index page; adding `-ic` removes them.

![ffuf directory scan returning forum and blog with 301](/writeups/evidence/htb-attacking-web-applications-with-ffuf/02-directory-fuzzing/directory-scan-blog-forum.jpg "Directory scan: forum and blog (301), plus comment-line noise at size 986.")

**Result:** the additional directory beside `blog` is **`forum`**.

### Defensive perspective

Unlisted directories are not access control. Anything reachable by URL must be authenticated or removed; "unlinked" is not "private".

## 03. Page Fuzzing

### Concept

Once a directory is known, find the files inside it. This is a two-step process: first learn which **extension** the server executes, then fuzz page **names** with that extension.

### Step 1 — Extension fuzzing

Fuzz the extension against a page that almost always exists (`index`):

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/web-extensions.txt:FUZZ -u http://<TARGET_IP>:<PORT>/blog/indexFUZZ
```

![Extension fuzz on /blog/index with curl checks](/writeups/evidence/htb-attacking-web-applications-with-ffuf/03-page-fuzzing/extension-fuzz-blog-index.jpg ".php returns 200 (size 0, an empty page); .phps returns 403. The right-hand terminal confirms with curl: index.php is empty, index.phps is Forbidden.")

Interpretation: `.php` is executed by the server. `.phps` is blocked by Apache (403) rather than missing (404), which will matter again in chapters 08 and 12.

### Step 2 — Page fuzzing

```bash
ffuf -w /usr/share/dirbuster/wordlists/directory-list-2.3-small.txt:FUZZ -u http://<TARGET_IP>:<PORT>/blog/FUZZ.php -ic -fs 0
```

`-fs 0` drops the empty responses (such as `index.php`) so only pages with content remain.

![Page fuzz on /blog returning home, with curl output (flag redacted)](/writeups/evidence/htb-attacking-web-applications-with-ffuf/03-page-fuzzing/page-fuzz-blog-home-redacted.jpg "home returns 200 with 1,046 bytes. Requesting /blog/home.php with curl returns a short 'Admin panel moved to academy.htb' page that contains the flag (redacted).")

**Result:** the page `home.php` in `/blog` holds the flag. Flag: obtained, redacted.

### Defensive perspective

Do not leave stray or deprecated pages ("admin panel moved") on the server, and never place secrets in static pages. An empty `index.php` is not a problem; a forgotten `home.php` is.

## 04. Recursive Scanning

### Concept

Manually re-running ffuf for every discovered directory does not scale. `-recursion` makes ffuf automatically start a new job inside each directory it finds, bounded by `-recursion-depth`. Adding `-e .php` tests each word both plain and with the extension.

### Command

```bash
ffuf -w /usr/share/dirbuster/wordlists/directory-list-2.3-small.txt:FUZZ -u http://<TARGET_IP>:<PORT>/FUZZ -recursion -recursion-depth 1 -e .php -ic -v -fs 0
```

> **EVIDENCE PENDING:** the recursive scan's own output was not captured. The command above is the standard form for this exercise, not a transcript of the exact line that was typed.

### Result

The scan leads into `/forum`, where a file `flag.php` exists. It was read directly:

```bash
curl http://<TARGET_IP>:<PORT>/forum/flag.php
```

![curl of /forum/flag.php (flag redacted)](/writeups/evidence/htb-attacking-web-applications-with-ffuf/04-recursive-scanning/forum-flag-php-redacted.jpg "curl of /forum/flag.php returns the flag (redacted).")

### Defensive perspective

Recursive scans multiply request volume. Rate-limit per client, and make sure sensitive files (`flag.php`, backups, config) are not stored under web roots.

## 05. DNS Records

### Concept

DNS maps names to records. The ones relevant to web enumeration:

| Record | Meaning |
|---|---|
| A / AAAA | Name to IPv4 / IPv6 address |
| CNAME | Alias to another name |
| MX | Mail exchanger |
| NS | Authoritative name server |
| TXT | Free text (SPF, verification tokens) |
| SOA | Zone authority data |
| PTR | Reverse lookup (IP to name) |

A **public** sub-domain has a record in public DNS and resolves anywhere. A **private/lab** name (such as `academy.htb`) has no public record; it only resolves if added to the local `/etc/hosts`.

### Verification command

```bash
dig +short customer.inlanefreight.com
```

![dig +short returning an IP for customer.inlanefreight.com](/writeups/evidence/htb-attacking-web-applications-with-ffuf/06-sub-domain-fuzzing/dig-customer-inlanefreight.jpg "dig resolves customer.inlanefreight.com to a public IP, proving the record exists.")

### Defensive perspective

Public DNS reveals every published sub-domain to anyone who can guess its name. Do not publish internal names in public zones, and review wildcard records.

## 06. Sub-domain Fuzzing

### Concept

Sub-domain fuzzing replaces the leftmost label of a public domain: `FUZZ.example.com`. A hit means the name resolves and the web server answers.

### Command

```bash
ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt:FUZZ -u https://FUZZ.inlanefreight.com/ -ic
```

> **Evidence note:** the saved terminal output shows results and a 4,989-entry progress counter (matching the 5,000-word list) but not the typed command line. The command above is the module's standard form.

### Output (saved terminal text, excerpt)

```text
my          [Status: 301, Size: 0, Words: 1, Lines: 1, Duration: 443ms]
blog        [Status: 301, Size: 0, Words: 1, Lines: 1, Duration: 415ms]
ns3         [Status: 301, Size: 0, Words: 1, Lines: 1, Duration: 463ms]
www         [Status: 200, Size: 22266, Words: 2903, Lines: 316, Duration: 460ms]
support     [Status: 301, Size: 0, Words: 1, Lines: 1, Duration: 452ms]
customer    [Status: 301, Size: 0, Words: 1, Lines: 1, Duration: 222ms]
:: Progress: [4989/4989] ... Errors: 4983 ::
```

### Interpretation

Six sub-domains answered. The customer portal is **`customer.inlanefreight.com`**, confirmed by `dig` in chapter 05. The large `Errors` counter is expected: names that do not exist fail DNS resolution and are counted as errors.

### Defensive perspective

A name such as `customer` or `support` tells an attacker where login portals live. Put such portals behind SSO/VPN or IP allow-lists and monitor for bulk name guessing.

## 07. VHost Fuzzing

### Concept

A single IP can serve many sites, selected by the HTTP `Host` header. When the names are not in public DNS (the case for lab domains such as `academy.htb`), sub-domain fuzzing cannot find them. VHost fuzzing instead fixes the URL and fuzzes the header:

```bash
-H "Host: FUZZ.academy.htb"
```

Because every unknown host returns the default site, results must be filtered by size.

### Commands

First add the base name to `/etc/hosts`, then measure the baseline size of an unknown host:

```bash
echo "<TARGET_IP> academy.htb" | sudo tee -a /etc/hosts
curl -s -H "Host: nonexistent.academy.htb" http://academy.htb:<PORT>/ | wc -c
```

The baseline response is **986 bytes**. Then fuzz, using auto-calibration:

```bash
ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt:FUZZ -u http://academy.htb:<PORT>/ -H "Host: FUZZ.academy.htb" -ac
```

### Output (saved terminal text, excerpt)

```text
test    [Status: 200, Size: 0, Words: 1, Lines: 1, Duration: 4421ms]
admin   [Status: 200, Size: 0, Words: 1, Lines: 1, Duration: 5427ms]
:: Progress: [4989/4989] ... Errors: 0 ::
```

![Appending the discovered VHosts to /etc/hosts](/writeups/evidence/htb-attacking-web-applications-with-ffuf/07-vhost-fuzzing/hosts-entry-test-admin.jpg "End of the VHost scan (4989/4989, 0 errors) and the /etc/hosts entry added for the new VHosts.")

**Result:** the additional VHosts are **`test.academy.htb`** and **`admin.academy.htb`**. Both return size 0, which differs from the 986-byte default, so `-ac` kept them.

### Defensive perspective

Do not rely on an unadvertised host name as protection. Default virtual hosts should return a uniform, minimal response, and admin virtual hosts should require authentication and network restriction.

## 08. Filtering Results

### Concept

Fuzzing is only useful if noise is removed. Typical noise sources:

- Wordlist comment lines resolving to the index page — remove with `-ic`.
- A fixed-size default or error page — remove with `-fs <size>` or `-ac`.
- Empty pages — `-fs 0`.
- A status that is uniformly "forbidden" — `-fc 403`.

### Evidence from this lab

| Situation | Filter that worked |
|---|---|
| Directory scan with comment-line hits at size 986 | `-ic` |
| Empty `index.php` among `/blog/FUZZ.php` hits | `-fs 0` |
| VHost scan, unknown hosts returning 986 bytes | `-ac` (or `-fs 986`) |

### A filter failure worth recording

A recursive scan using `-e .php,.php7,.phps` produced thousands of results. Apache returns 403 for **every** `.phps` request, whatever the name, so each word generated a matching line:

![Hundreds of 403 results for .phps names](/writeups/evidence/htb-attacking-web-applications-with-ffuf/08-filtering-results/phps-403-noise.png "actualite.phps, kino.phps, hack7.phps and others all return 403 / size 287; curl of king.phps confirms a generic Forbidden. The scan counter reached 45,586 of 350,604 requests before it was stopped.")

The fix was to cancel, drop `.phps` and filter 403/404: `-fc 403,404`. The general lesson is that a status code is not a hit when the server returns it for everything.

### Defensive perspective

Uniform responses are a defence: if every miss looks identical, enumeration yields nothing. Consistent 404 handling and identical response sizes make filtering harder for the attacker.

## 09. Parameter Fuzzing — GET

### Concept

A page may accept parameters that are not linked anywhere. Fuzz the parameter **name** with a dummy value and watch for a response that differs from the baseline:

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt:FUZZ -u http://admin.academy.htb:<PORT>/admin/admin.php?FUZZ=key -ac
```

> **EVIDENCE PENDING:** the GET parameter scan output was not captured, so the accepted parameter name is not recorded as a verified result here.

### Defensive perspective

Hidden parameters (debug, admin, id) are a frequent source of access-control bugs. Validate and authorise every parameter server-side, and remove debug parameters from production.

## 10. Parameter Fuzzing — POST

### Concept

POST parameters are fuzzed through the request body. The `Content-Type` header must be set so the server parses the body:

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt:FUZZ -u http://admin.academy.htb:<PORT>/admin/admin.php -X POST -d 'FUZZ=key' -H 'Content-Type: application/x-www-form-urlencoded' -ac
```

> **EVIDENCE PENDING:** the POST name-fuzz output itself was not captured. The POST parameter `id` is however confirmed indirectly: the value-fuzzing scan in chapter 11 sends `id=FUZZ` to this page and receives a distinct response for one value.

### Defensive perspective

POST is not hidden from attackers: bodies are as enumerable as query strings. Treat them identically for authorisation checks.

## 11. Value Fuzzing

### Concept

After a parameter name is known, fuzz its **value**. Here the parameter is numeric, so a custom wordlist of IDs is built:

```bash
for i in $(seq 1 1000); do echo $i >> ids.txt; done
```

### Command and result

```bash
ffuf -w ids.txt:FUZZ -u http://admin.academy.htb:<PORT>/admin/admin.php -X POST -d 'id=FUZZ' -H 'Content-Type: application/x-www-form-urlencoded' -ac
```

Exactly one value out of 1,000 returned a different response (Status 200, Size 787, Words 218, Lines 54): **`73`**. The scan finished 1000/1000 with 0 errors in about seven seconds.

The value was then used in a plain `curl` POST:

```bash
curl http://admin.academy.htb:<PORT>/admin/admin.php -X POST -d 'id=73' -H 'Content-Type: application/x-www-form-urlencoded'
```

![Value fuzz finding id=73 and curl returning the flag (redacted)](/writeups/evidence/htb-attacking-web-applications-with-ffuf/11-value-fuzzing/id-value-fuzz-and-post-redacted.jpg "ffuf configuration (POST, id=FUZZ, calibration on), the single hit 73, and the curl response with the flag (redacted).")

### Defensive perspective

A numeric ID that unlocks content is an insecure direct object reference. IDs should be unpredictable, and authorisation must be checked per object, not assumed from knowing the number.

## 12. Skills Assessment — Web Fuzzing

The assessment gives only an IP and port and asks the student to chain everything above. It has five questions.

### 12.1 Sub-domains / VHosts

```bash
echo "<TARGET_IP> academy.htb" | sudo tee -a /etc/hosts
ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt:FUZZ -u http://academy.htb:<PORT>/ -H "Host: FUZZ.academy.htb" -ac
```

![VHost scan on the assessment target returning test, archive and faculty](/writeups/evidence/htb-attacking-web-applications-with-ffuf/12-skills-assessment/vhost-scan-test-archive-faculty.jpg "Three hits, all Status 200 / Size 0: test, archive, faculty (4989/4989, 0 errors). The /etc/hosts line was accidentally appended twice; duplicates are harmless.")

**Result (Q1):** `archive`, `faculty`, `test`.

### 12.2 Extensions

The extension technique from chapter 03 was applied per domain (`indexFUZZ`). Evidence available:

- `.phps` is recognised and blocked with 403 (Figure 08.1, host `faculty.academy.htb`).
- `.php7` is executed: the assessment page in 12.3 is a `.php7` file and renders.

> **EVIDENCE PENDING:** the `indexFUZZ` scan output on the assessment target was not captured. The recorded answer for Q2 is `php`, `phps`, `php7`, consistent with the two observations above; it was cross-checked against public references rather than read from a saved scan.

### 12.3 Pages

A recursive scan on `faculty.academy.htb` discovered the `courses` directory (301) and automatically queued a job inside it:

![ffuf finding /courses (301) and queuing a recursive job](/writeups/evidence/htb-attacking-web-applications-with-ffuf/12-skills-assessment/courses-recursion-job.png "courses returns 301; ffuf logs 'Adding a new job to the queue: …/courses/FUZZ'.")

The page that denies access was then requested directly:

```bash
curl http://faculty.academy.htb:<PORT>/courses/linux-security.php7
```

![curl of linux-security.php7 showing 'You don't have access!'](/writeups/evidence/htb-attacking-web-applications-with-ffuf/12-skills-assessment/linux-security-no-access.jpg "The page returns 'You don't have access!'.")

**Result (Q3):** `http://faculty.academy.htb:PORT/courses/linux-security.php7`.

> **EVIDENCE PENDING:** the `/courses/FUZZ` listing that first revealed `linux-security.php7` was not captured; the page itself is verified by Figure 12.3.

### 12.4 Parameters

The page says access is denied, which implies it expects input. POST parameter **`username`** is verified because the request in 12.5 changes the response. The GET parameter **`user`** recorded as part of Q4 is **EVIDENCE PENDING** (no GET scan output captured).

### 12.5 Value fuzzing and flag

```bash
curl http://faculty.academy.htb:<PORT>/courses/linux-security.php7 -X POST -d 'username=harry' -H 'Content-Type: application/x-www-form-urlencoded'
```

![POST with username=harry returning the flag (redacted)](/writeups/evidence/htb-attacking-web-applications-with-ffuf/12-skills-assessment/post-username-redacted.jpg "The POST with username=harry replaces 'You don't have access!' with the flag (redacted).")

> **Honesty note:** the value `harry` was applied after cross-checking public references; the ffuf scan that would find it with a username wordlist was not captured. The `curl` response above verifies that the value is accepted, not how it was first discovered. Flag: obtained, redacted.

### Defensive perspective

The chain was: guessable VHost names, unlisted directory, executable alternate extension, hidden parameter, guessable username. Each step relied on information the server volunteered through response differences. Removing any one of these (uniform responses, no hidden parameters, strong authentication instead of a name check) breaks the chain.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `stat /opt/useful/seclists/...: no such file or directory` | That SecLists path does not exist on this PwnBox | Use `/usr/share/seclists/...` or find the file with `find / -name <list> 2>/dev/null` |
| `bash: syntax error near unexpected token 'newline'` | A placeholder (`-fs <SIZE>`) was pasted literally; `<` is shell redirection | Replace with the real size (986) or use `-ac` |
| Thousands of 403 hits for `.phps` | Apache blocks every `.phps` request | Drop `.phps`, add `-fc 403,404` (Figure 08.1) |
| Many `Status: 200, Size: 986` lines | Wordlist comment lines | Add `-ic` |
| `Errors: 4983` in sub-domain scan | Non-existent names fail DNS | Expected; ignore |
| Duplicate `/etc/hosts` lines | `tee -a` run twice | Harmless; check with `grep` before appending |
| Assessment Q3 first submission rejected | Cause not determined; the answer format uses the literal text `PORT` instead of the number | Re-submit with `PORT` as shown in 12.3 |

## Results and Evidence

| Chapter | Result | Verification |
|---|---|---|
| 02 Directory Fuzzing | `blog` and **`forum`** | Verified — screenshot |
| 03 Page Fuzzing | `/blog/home.php` holds the flag; `.php` accepted, `.phps` 403 | Verified — screenshots; flag redacted |
| 04 Recursive Scanning | `/forum/flag.php` holds the flag | Result verified (curl); scan output **EVIDENCE PENDING** |
| 05 DNS Records | `customer.inlanefreight.com` resolves | Verified — screenshot |
| 06 Sub-domain Fuzzing | `my`, `blog`, `ns3`, `www`, `support`, **`customer`** | Verified — saved terminal text |
| 07 VHost Fuzzing | **`test.academy.htb`**, **`admin.academy.htb`** (baseline 986 bytes) | Verified — saved terminal text and screenshot |
| 08 Filtering Results | `-ic`, `-fs`, `-ac`, `-fc`; `.phps` 403 noise case | Verified — screenshot |
| 09 Parameter Fuzzing — GET | — | **EVIDENCE PENDING** |
| 10 Parameter Fuzzing — POST | `id` accepted by `/admin/admin.php` | Verified indirectly via chapter 11; name scan **EVIDENCE PENDING** |
| 11 Value Fuzzing | `id=73` returns the flag | Verified — screenshot; flag redacted |
| 12 Skills Assessment | VHosts `archive`, `faculty`, `test`; page `/courses/linux-security.php7`; POST `username` accepted; flag obtained | VHosts, page and flag response verified; extension scan, `user` GET parameter and value-fuzz scan **EVIDENCE PENDING** |

Evidence files (12 screenshots) live under `public/writeups/evidence/htb-attacking-web-applications-with-ffuf/<section>/`. Four of them contain redacted flags. No flag, hash or secret appears in this document.

## Security Implications

- **Obscurity is not a control.** Hidden directories, odd extensions (`.php7`), unlinked pages, hidden parameters and sub-domain names were all found with a standard wordlist in minutes.
- **Response differences leak existence.** Distinct sizes, status codes (301 vs 404, 403 vs 404) and default-host behaviour tell an attacker what is real.
- **Alternate extensions can execute code.** `.php7` ran server-side; any upload or file-handling logic must account for every extension the server executes.
- **Weak identifiers fail under brute force.** A numeric ID (`73`) and a guessable username (`harry`) unlocked content with no rate limit and no authentication.
- **Detection exists but must be configured.** Bursts of thousands of requests are visible in logs; alerting on them is cheap.

## Lessons Learned

1. Measure the baseline response first (`curl ... | wc -c`), then filter on it; `-ac` automates the same idea.
2. A status code is only meaningful if it differs from the server's default behaviour (the `.phps` 403 flood).
3. Fuzz the smallest search space that can answer the question: extension first, then names; directory, then recursion.
4. Keep a working wordlist path per host: SecLists was under `/usr/share/seclists` on this PwnBox, not `/opt/useful/seclists`.
5. Capture the ffuf output for every step, not only the final `curl`. Several chapters here lack the scan that produced the result, which weakens the evidence even when the result is correct.
6. Never paste `<PLACEHOLDER>` text into a shell.

## References

- Hack The Box Academy — Attacking Web Applications with Ffuf: https://academy.hackthebox.com/app/module/54
- ffuf project: https://github.com/ffuf/ffuf
- SecLists (wordlists): https://github.com/danielmiessler/SecLists
- Public walkthroughs of this module's skills assessment were consulted to cross-check the assessment answers (page path, extension set, username value); they are not a substitute for the author's own captured evidence.
