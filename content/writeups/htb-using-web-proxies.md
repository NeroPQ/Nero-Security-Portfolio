**Platform:** Hack The Box Academy  
**Module:** Using Web Proxies (Module 110)  
**Difficulty:** Easy  
**Category:** Web Application Security / Tooling  
**Coverage:** 15 Sections, including the Skills Assessment  
**Documentation Status:** Practiced — full module completion not independently verified  
**Publication Status:** Evidence Pending  
**Official Module:** https://academy.hackthebox.com/app/module/110

---

## Executive Summary

A web proxy sits between a browser (or any HTTP client) and a web application. Every request and response passes through it, so the tester can read, pause, modify, replay, fuzz and scan the traffic. For web application testing this is the single most important tool category: almost every later web module assumes that the operator can drive Burp Suite or OWASP ZAP comfortably.

The Hack The Box Academy module **Using Web Proxies** teaches both tools side by side. It covers proxy and certificate setup, request and response interception, automatic modification rules, repeating requests, encoding and decoding, routing other tools through the proxy, fuzzing with Burp Intruder and the ZAP Fuzzer, automated scanning with Burp Scanner and the ZAP Scanner, and extending both tools.

This report documents all fifteen sections. Practical outcomes are recorded only where the lab session produced evidence:

| Exercise | Technique | Recorded outcome |
|---|---|---|
| ZAP Fuzzer — md5 username cookie | Intruder/Fuzzer payload processing (MD5) | Flag recovered; valid user identified as `user` |
| ZAP Scanner — `/flag.txt` | Active scan → OS command injection | Flag recovered through `/devtools/ping.php` |
| Skills Assessment Q1 — disabled button | Client-side control bypass, repeated POST | Flag recovered |
| Skills Assessment Q2 — encoded cookie | Hex → Base64 decoding | 31-character value recovered |
| Skills Assessment Q3 — md5 last character | Encoded fuzzing (Base64 → Hex) | Flag recovered; missing character was `d` |
| Skills Assessment Q4 — Metasploit request | Proxying tools | Directory `CFIDE` identified |

Earlier section exercises (Sections 04–10) are documented as reproducible procedures. Their individual answers were not captured in the session evidence and are therefore not claimed.

---

## Section 01 — Intro to Web Proxies

### 1.1 Objective

Understand what a web proxy is, why it is central to web application testing and how Burp Suite and OWASP ZAP compare.

### 1.2 What a Web Proxy Does

A web proxy is a **man-in-the-middle (MITM) tool that the tester controls**. The browser is configured to send its traffic to a local listener (by default `127.0.0.1:8080`). The proxy forwards each request to the real server and passes each response back.

```text
Browser ──► 127.0.0.1:8080 (Burp / ZAP) ──► Web Server
Browser ◄── 127.0.0.1:8080 (Burp / ZAP) ◄── Web Server
```

Because the proxy terminates and re-creates the connection, it can:

- show the full raw HTTP request and response, including headers and cookies;
- pause traffic so that it can be edited before it continues;
- replay a request many times with small changes;
- generate thousands of variant requests (fuzzing);
- crawl and scan an application for known vulnerability classes.

### 1.3 Typical Uses in an Assessment

| Use | Example |
|---|---|
| Bypassing client-side validation | Removing a `disabled` attribute or a JavaScript input check |
| Parameter tampering | Changing a price, role or user ID in a POST body |
| Web fuzzing | Discovering hidden files, directories and parameter values |
| Session testing | Inspecting, decoding and forging cookies |
| Vulnerability scanning | Crawling and actively probing for SQLi, command injection, XSS |
| Tool debugging | Routing Metasploit, Nmap or scripts through the proxy to see exactly what they send |

### 1.4 Burp Suite vs OWASP ZAP

| Feature | Burp Suite Community | Burp Suite Pro | OWASP ZAP |
|---|---|---|---|
| Price | Free | Paid | Free, open source |
| Intercept / Repeater / Decoder | Yes | Yes | Yes |
| Intruder (fuzzing) | Yes, throttled | Full speed | ZAP Fuzzer, not throttled |
| Active scanner | No | Yes | Yes |
| Extensions | BApp Store (some Pro-only) | BApp Store | ZAP Marketplace |

**Key point:** ZAP offers unthrottled fuzzing and a scanner for free. Burp Community is excellent for manual work, but large Intruder attacks are slow.

---

## Section 02 — Setting Up

### 2.1 Objective

Install and launch both proxies.

### 2.2 Burp Suite

Burp Suite is preinstalled on Pwnbox and Kali. It can also be downloaded from PortSwigger for Windows, macOS and Linux. Burp is a Java application. On a system without the bundled launcher it can be started with:

```bash
java -jar </path/to/burpsuite.jar>
```

The Community edition only supports **temporary projects**. Choose **Temporary project → Use Burp defaults → Start Burp**.

### 2.3 OWASP ZAP

ZAP is also preinstalled on Pwnbox. Otherwise it can be installed from the official site or started from the JAR in the same way. On first launch ZAP asks whether to persist the session; for short labs, **"No, I do not want to persist this session"** is sufficient.

### 2.4 Practical Notes

- Both tools can switch to a dark theme (Burp: **User options → Display**, ZAP: **Tools → Options → Display**).
- Only one tool can bind to `127.0.0.1:8080` at a time. When both run, move one to another port. In this session ZAP listened on `localhost:39452` while Burp kept `8080`.

---

## Section 03 — Proxy Setup

### 3.1 Objective

Route browser traffic through the proxy and make HTTPS interception work.

### 3.2 Pre-Configured Browser

Both tools ship an embedded Chromium that is already configured:

- **Burp:** Proxy → Intercept → **Open Browser**
- **ZAP:** the Firefox/Chrome icon on the toolbar

This is the fastest option and needs no certificate import.

### 3.3 Using Your Own Firefox

Set the proxy manually in **Settings → Network Settings → Manual proxy configuration** (`127.0.0.1`, port `8080`), or use the **FoxyProxy** extension so that the proxy can be toggled with one click:

```text
Title:     Burp / ZAP
Type:      HTTP
Hostname:  127.0.0.1
Port:      8080
```

### 3.4 Installing the CA Certificate

Without the proxy's CA certificate, the browser rejects intercepted HTTPS connections.

| Tool | How to export the certificate |
|---|---|
| Burp | With the proxy enabled, browse to `http://burp` and click **CA Certificate** |
| ZAP | **Tools → Options → Network → Server Certificates → Save** |

In Firefox, import it via **Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import**, and trust it to identify websites.

---

## Section 04 — Intercepting Web Requests

### 4.1 Objective

Pause a request in transit, change it and forward it.

### 4.2 Burp

**Proxy → Intercept → Intercept is on.** Load the page; the request stops in Burp. Edit it, then **Forward** (or **Drop**).

### 4.3 ZAP

Click the **green circle** on the toolbar to set a break on all requests (or `CTRL+B`). It turns red when active. Use **Step** to send the current message and **Continue** to release the rest. ZAP also offers the **Heads Up Display (HUD)** to intercept directly inside the browser.

### 4.4 Manipulating an Intercepted Request

The module's lab is a **ping** page. The front end only allows an IP address, but the check exists in the browser, not on the server. Intercepting the POST request shows the real parameter:

```http
POST / HTTP/1.1
Host: <TARGET>
Content-Type: application/x-www-form-urlencoded

ip=1
```

Appending a shell separator turns the parameter into a command injection:

```text
ip=;ls;
```

The exercise asks for `flag.txt` to be read the same way:

```text
ip=;cat flag.txt;
```

### 4.5 Recorded Outcome

The flag for this exercise was not captured in the session evidence. The payload pattern above is the documented procedure.

**Lesson:** any validation that only runs in the browser can be bypassed by editing the request after it leaves the browser.

---

## Section 05 — Intercepting Responses

### 5.1 Objective

Change the server's response before the browser renders it.

### 5.2 Burp

Enable **Proxy → Options → Intercept Server Responses → Intercept Response**. Reload the page with a forced refresh (`CTRL+SHIFT+R`) to avoid a cached copy. The response can then be edited, for example:

```html
<!-- original -->
<input type="number" id="ip" name="ip" min="1" max="255" maxlength="3" ...>
<!-- edited -->
<input type="text" id="ip" name="ip" min="1" max="255" maxlength="100" ...>
```

### 5.3 Built-In Shortcuts

- **Burp:** Proxy → Options → Response Modification → **Unhide hidden form fields**, **Enable disabled form fields**, **Remove input field length limits**.
- **ZAP HUD:** **Show/Enable** reveals hidden fields and enables disabled ones. **Comments** highlights HTML comments.

### 5.4 Relevance

This technique reappears in the Skills Assessment (Q1), where a button is shipped with the `disabled` attribute.

---

## Section 06 — Automatic Modification

### 6.1 Objective

Apply the same change to every request or response without manual interception.

### 6.2 Request Modification

**Burp:** Proxy → Options → **Match and Replace → Add**

| Field | Value |
|---|---|
| Type | Request header |
| Match | `^User-Agent.*$` |
| Replace | `User-Agent: HackTheBox Agent 1.0` |
| Regex match | Enabled |

**ZAP:** **Replacer** (`CTRL+R`), with a match type of *Request Header (will add if not present)* and an initiator scope of all HTTP messages.

### 6.3 Response Modification

The same mechanism can permanently rewrite responses. For example, replacing `type="number"` with `type="text"` and `maxlength="3"` with `maxlength="100"` makes the ping field accept any input on every reload.

### 6.4 Recorded Outcome

The section question was not captured in the session evidence.

---

## Section 07 — Repeating Requests

### 7.1 Objective

Resend a captured request with small changes, without going back through the browser each time.

### 7.2 Proxy History

Both tools keep a full history: **Burp → Proxy → HTTP History**, **ZAP → History** tab (or the HUD history pane). Filters and sorting make it easy to find a specific request.

### 7.3 Burp Repeater

Select a request and press `CTRL+R` (**Send to Repeater**), then `CTRL+SHIFT+R` to switch to the tab. Edit and **Send**. Right-click → **Change request method** converts GET to POST and back, moving parameters between the URL and body.

### 7.4 ZAP Request Editor

Right-click a history entry → **Open/Resend with Request Editor**. The HUD offers the same through **Replay in Console** or **Replay in Browser**.

### 7.5 Practical Observation from the Session

When the method is changed by hand, the request must remain valid HTTP. A Repeater attempt against `/lucky.php` returned `400 Bad Request` because the request contained:

- two `Content-Type` headers;
- `Content-Length: 0` immediately followed by the body;
- no blank line between the headers and the body.

![E08: Repeater request with duplicated headers and missing blank line returns 400](/writeups/evidence/htb-using-web-proxies/e08-repeater-400-bad-request.png "A hand-edited POST failed with 400 Bad Request; the request had duplicate Content-Type headers and no blank line before the body")

**Correct structure:**

```http
POST /lucky.php HTTP/1.1
Host: <TARGET>
Content-Type: application/x-www-form-urlencoded
Content-Length: 12

getflag=true
```

**Lesson:** use *Change request method* rather than rewriting headers by hand, and remember that the blank line is the separator between headers and body.

---

## Section 08 — Encoding/Decoding

### 8.1 Objective

Encode payloads correctly and decode values found in requests and responses.

### 8.2 URL Encoding

Characters with special meaning in HTTP must be URL-encoded inside parameters:

| Character | Encoded | Why it matters |
|---|---|---|
| Space | `%20` or `+` | Ends the URL in the request line |
| `&` | `%26` | Separates parameters |
| `#` | `%23` | Starts a fragment |
| `;` | `%3B` | Shell separator in injection payloads |

Burp Repeater: select text → right-click → **Convert Selection → URL → URL-encode key characters**, or `CTRL+U`.

### 8.3 Decoding Tools

- **Burp Decoder** — decode/encode as URL, HTML, Base64, ASCII Hex, Hex, Octal, Binary, Gzip; **Smart decode** guesses the format.
- **ZAP Encode/Decode/Hash** (`CTRL+E`) — shows Base64, URL, Hex and hashes in parallel tabs.
- **CyberChef** — useful for chaining several decoding steps in a recipe.

### 8.4 Recognising Common Formats

| Pattern | Likely format |
|---|---|
| Only `0-9a-f`, even length | ASCII Hex |
| Mixed case, digits, `+ /`, often ending in `=` | Base64 |
| 32 hex characters | MD5 |
| `%XX` sequences | URL encoding |

Values are frequently encoded more than once. Decode layer by layer and re-check the format after each step, which is exactly what Skills Assessment Q2 requires.

---

## Section 09 — Proxying Tools

### 9.1 Objective

Send traffic from command-line tools through the proxy so that it can be inspected and replayed.

### 9.2 Proxychains

Add the proxy at the end of `/etc/proxychains.conf` (commenting out the default `socks4` line) and enable `quiet_mode`:

```text
#socks4  127.0.0.1 9050
http 127.0.0.1 8080
```

```bash
proxychains -q curl http://<TARGET>
```

### 9.3 Nmap

```bash
nmap --proxies http://127.0.0.1:8080 <TARGET> -pPORT -Pn -sC
```

Nmap's proxy support is limited; proxychains is more reliable when a scan does not appear in the history.

### 9.4 Metasploit

```text
msf6 > use auxiliary/scanner/http/robots_txt
msf6 > set PROXIES HTTP:127.0.0.1:8080
msf6 > set RHOSTS <TARGET>
msf6 > set RPORT <PORT>
msf6 > run
```

Every request the module makes then appears in the proxy history. This is the basis of Skills Assessment Q4.

---

## Section 10 — Burp Intruder

### 10.1 Objective

Use Burp's built-in fuzzer to discover content and test parameter values.

### 10.2 Target and Positions

Send a request to Intruder (`CTRL+I`). In **Positions**, clear Burp's automatic markers and add a single position:

```http
GET /admin/§DIRECTORY§.html HTTP/1.1
Host: <TARGET>
```

### 10.3 Attack Types

| Type | Behaviour |
|---|---|
| Sniper | One payload set, one position at a time |
| Battering ram | Same payload in every position |
| Pitchfork | One payload set per position, iterated in parallel |
| Cluster bomb | Every combination of all payload sets |

### 10.4 Payloads

- **Payload type:** *Simple list*, *Runtime file*, *Numbers*, *Null payloads*, etc.
- **Payload processing:** add prefixes/suffixes, hash (MD5), Base64/URL-encode, or *Skip if matches regex* (e.g. `^\..*$` to skip dot-files).
- **Payload encoding:** URL-encode selected characters. Disable it when the payload is already in its final form.

A wordlist such as SecLists `Discovery/Web-Content/common.txt` is a reasonable size for Community, which is throttled. Very large lists (tens of thousands of entries) take too long.

### 10.5 Analysing Results

- Sort by **Status** and **Length**. Valid files usually return `200` with a different length from the `404` baseline.
- **Settings → Grep - Match** can flag responses containing `HTB{`.

### 10.6 Recorded Outcome

The `/admin/*.html` exercise was configured with a single Sniper position and a simple-list wordlist. The resulting flag was not captured in the session evidence.

---

## Section 11 — ZAP Fuzzer

### 11.1 Objective

Fuzz a value with processing applied to every payload, and compare ZAP's fuzzer with Intruder.

### 11.2 Workflow

1. Right-click a request in History → **Attack → Fuzz**.
2. Highlight only the value to fuzz and click **Add**.
3. Add a payload: **Strings**, **File**, **File Fuzzers** (built-in wordlists), or **Numberzz**.
4. Add **Processors**: Base64 encode/decode, MD5/SHA hash, prefix/postfix string, URL encode, and more.
5. Set **Options** (threads, depth-first vs breadth-first), then **Start Fuzzer**.

ZAP is not throttled, so it is noticeably faster than Burp Community for large wordlists.

### 11.3 Exercise — md5-Hashed Username Cookie

The `/skills/` page sets a cookie equal to the MD5 hash of the username. The guest cookie was observed in the response:

```text
Set-Cookie: cookie=084e0343a0486ff05530df6c705c8bb4
```

`084e0343a0486ff05530df6c705c8bb4` is `md5("guest")`. The goal is to fuzz the cookie with MD5 hashes of the usernames in SecLists `Usernames/top-usernames-shortlist.txt`.

### 11.4 First Attempt and Correction

The first request copied the server header into the request as `Set-Cookie:`. A client must send the cookie with the **`Cookie:`** header; `Set-Cookie` is only meaningful in a response.

![E02: Repeater request mistakenly using Set-Cookie for the guest md5 cookie](/writeups/evidence/htb-using-web-proxies/e02-skills-cookie-request.png "The /skills/ request initially carried Set-Cookie instead of Cookie; the response shows the guest md5 cookie set by the server")

Corrected position:

```http
GET /skills/ HTTP/1.1
Host: <TARGET>
Cookie: cookie=§084e0343a0486ff05530df6c705c8bb4§
```

### 11.5 Execution

The fuzz was carried out with **Burp Intruder**, which provides the same processing logic as the ZAP Fuzzer:

- Payload: `top-usernames-shortlist.txt`
- Payload processing: **Hash → MD5**
- Payload encoding: disabled

Results were sorted by length:

| Payload (md5) | Username | Length |
|---|---|---|
| `084e0343a0486ff05530df6c705c8bb4` | guest | 691 |
| `ee11cbb19052e40b07aac0ca060c23ee` | user | **731** |
| others | — | 526–527 |

The `user` response contained `Welcome Back user` and the flag.

![E01: Burp Intruder md5 cookie fuzz with the user response containing the flag](/writeups/evidence/htb-using-web-proxies/e01-burp-intruder-md5-cookie-fuzz.jpg "Request 8 (md5 of user, length 731) returns Welcome Back user and the section flag; the browser address bar was cropped")

**Verified flag:** `HTB{fuzz1n6_my_f1r57_c00k13}`

**Deviation from the module:** the section names the ZAP Fuzzer, but the fuzz was executed with Burp Intruder. The technique (wordlist + MD5 processor on the cookie value) is identical.

---

## Section 12 — Burp Scanner

### 12.1 Objective

Understand Burp Pro's automated crawler and scanner.

### 12.2 Capabilities (Pro Only)

- **Target scope:** right-click a host → **Add to scope**, and exclude out-of-scope or dangerous paths (for example `/logout`).
- **Crawler:** maps the application by following links and forms.
- **Passive scanner:** analyses traffic already captured, without sending new requests.
- **Active scanner:** sends crafted requests for SQLi, XSS, command injection, path traversal and more.
- **Scan configurations:** presets such as *Crawl strategy – fastest* and *Audit checks – critical issues only*.
- **Reporting:** **Target → Site map → Issue → Report selected issues**, exported as HTML.

### 12.3 Recorded Outcome

Burp Community was used during the session, so the Pro scanner was not run. This section is documented conceptually.

---

## Section 13 — ZAP Scanner

### 13.1 Objective

Use ZAP's free scanner to discover directories and vulnerabilities, then exploit a high-risk finding.

### 13.2 Scanner Components

| Component | Purpose |
|---|---|
| Spider / AJAX Spider | Discover pages, including JavaScript-driven ones |
| Passive Scanner | Flags issues seen in existing traffic (missing headers, cookie flags) |
| Active Scanner | Sends attack payloads to every discovered parameter |
| Alerts | Findings grouped by risk: High, Medium, Low, Informational |
| Reports | **Report → Generate HTML Report** |

### 13.3 Passive Results Are Not Enough

After the spider, the Alerts tab showed only passive findings (High: 0). These included *Cookie No HttpOnly Flag*, *Absence of Anti-CSRF Tokens* and missing security headers.

![E03: ZAP Alerts after spidering show only passive findings](/writeups/evidence/htb-using-web-proxies/e03-zap-passive-alerts.png "Passive alerts only (Cookie No HttpOnly Flag on wp-comments-post.php); the status bar shows zero High alerts before the active scan")

### 13.4 Active Scan Findings

Running the **Active Scan** produced two High alerts.

**SQL Injection** — `POST /wp-comments-post.php`, parameter `comment_parent`, attack `4/2`, confidence Medium. The page was replicated when the value was replaced by an arithmetic expression, which indicates numeric injection.

![E04: ZAP High alert for SQL injection in comment_parent](/writeups/evidence/htb-using-web-proxies/e04-zap-sqli-alert.png "SQL Injection alert on wp-comments-post.php, parameter comment_parent, attack 4/2, confidence Medium")

**Remote OS Command Injection** — `GET /devtools/ping.php`, parameter `ip`. ZAP sent `127.0.0.1&cat /etc/passwd&` and the response contained `/etc/passwd`.

![E05: ZAP Remote OS Command Injection alert with /etc/passwd in the response](/writeups/evidence/htb-using-web-proxies/e05-zap-command-injection-alert.png "Remote OS Command Injection on /devtools/ping.php; the payload 127.0.0.1&cat /etc/passwd& returned the passwd file")

The command injection was selected because it gives direct, visible command output, while the SQL injection would require extra work (file-read privileges or UNION enumeration).

### 13.5 Exploitation

**Failed attempt:** the modified parameter was typed into the body of a `GET` request in the Request Editor. The request line still carried the original payload, so the server ignored the change.

**Working request:** edit the parameter in the request line and URL-encode `&` and the space.

```http
GET /devtools/ping.php?ip=127.0.0.1%26cat%20/flag.txt%26 HTTP/1.1
Host: <TARGET>
```

![E06: Response body containing the flag after the command injection](/writeups/evidence/htb-using-web-proxies/e06-command-injection-flag.png "Manual Request Editor response with a 156-byte body containing the flag read from /flag.txt")

**Verified flag:** `HTB{5c4nn3r5_f1nd_vuln5_w3_m155}`

### 13.6 Defensive Note

The vulnerable endpoint passes user input to a shell. The fix is to call the system API directly, or to strictly validate the IP address server-side and pass it as an argument without a shell.

---

## Section 14 — Extensions

### 14.1 Objective

Extend both tools with community add-ons.

### 14.2 Burp BApp Store

**Extender → BApp Store** (or **Extensions → BApp Store** in newer versions). Some extensions require Jython or JRuby; others are Pro-only. Commonly used examples:

| Extension | Use |
|---|---|
| Decoder Improved | More encodings and hashing in one place |
| Logger++ | Advanced, filterable logging of all tools |
| Autorize | Authorization testing between two sessions |
| JS Link Finder | Extracts endpoints from JavaScript |
| Retire.JS | Flags vulnerable JavaScript libraries |
| Param Miner | Discovers hidden parameters and headers |

### 14.3 ZAP Marketplace

**Manage Add-ons → Marketplace.** For example, installing **FuzzDB Files** and **FuzzDB Offensive** adds wordlists to *File Fuzzers*, including web backdoors and command-execution lists. Add-ons are marked Release, Beta or Alpha.

---

## Section 15 — Skills Assessment: Using Web Proxies

The assessment combines the module's techniques against a single target with four questions.

### Q1 — Enable a Disabled Button on /lucky.php

The page contains a form whose submit button is disabled on the client:

```html
<form name='getflag' class='form' method='post' id='form1'>
  <button ... type='submit' formmethod='post' name='getflag' value='true' disabled>
```

![E07: lucky.php button with the disabled attribute in Firefox Inspector](/writeups/evidence/htb-using-web-proxies/e07-lucky-disabled-button.png "The submit button posts getflag=true but is shipped with disabled; the form method is POST")

**Approach:** removing `disabled` in the Inspector (or with Burp's *Enable disabled form fields*) re-enables the button. However, a single click does not always return the flag; the result is random. Repeating the request is faster than re-editing the HTML after every reload, so the form submission was replayed with `curl`:

```bash
for i in $(seq 1 300); do
  curl -s -X POST -d 'getflag=true' http://<TARGET>/lucky.php | grep -o 'HTB{[^}]*}' && break
done
```

**Verified flag:** `HTB{d154bl3d_bu770n5_w0n7_570p_m3}`

**Lesson:** a disabled button is a display state, not an access control. The server accepted `getflag=true` from any client.

### Q2 — Decode the /admin.php Cookie

```bash
curl -si http://<TARGET>/admin.php | grep -i set-cookie
```

```text
Set-Cookie: cookie=4d325268597a6b7a596a686a5a4449314d4746684f474d7859544d325a6d5a6a6d597a63355954453359513d3d
```

The value contains only hex characters and ends in `3d3d`, which is `==` in ASCII. That suggests **ASCII Hex wrapping Base64**:

| Layer | Operation | Result |
|---|---|---|
| 1 | From Hex | `M2RhYzkzYjhjZDI1MGFhOGMxYTM2ZmZmYzc5YTE3YQ==` |
| 2 | From Base64 | 31-character hex string |

```bash
echo -n '<COOKIE>' | xxd -r -p | base64 -d
```

![E10: CyberChef From Hex then From Base64 decodes the cookie](/writeups/evidence/htb-using-web-proxies/e10-cyberchef-cookie-decode.jpg "CyberChef recipe From Hex → From Base64 produces the 31-character value")

**Answer:** `3dac93b8cd250aa8c1a36fffc79a17a`

**Note:** an earlier hand-transcribed value differed by one character. The answer was taken from the decoded output itself, not from a copy of a screenshot.

### Q3 — Fuzz the Missing md5 Character

A valid MD5 is 32 characters, so one character is missing. The valid cookie is the reverse of the decoding chain:

```text
cookie = hex( base64( <31 characters> + <candidate> ) )
```

**Failed run:** the first loop was started while `PREFIX` still contained a literal placeholder (`<chuỗi_31_ký_tự>`). Every candidate returned the same length (1901 bytes), which is the expected signature of an invalid cookie.

![E09: Terminal showing the Q1 flag, the admin cookie and a failed fuzz with an unset prefix](/writeups/evidence/htb-using-web-proxies/e09-terminal-lucky-cookie-prefix-error.png "The Q1 loop returns the flag; the first Q3 loop used a placeholder prefix and every candidate returned 1901 bytes")

**Working run:** the script retrieves and decodes the live cookie before fuzzing, so the prefix cannot be mistyped:

```bash
URL='http://<TARGET>/admin.php'
COOKIE=$(curl -si "$URL" | grep -i '^set-cookie: cookie=' | sed 's/.*cookie=\([0-9a-fA-F]*\).*/\1/' | tr -d '\r\n')
PREFIX=$(echo -n "$COOKIE" | xxd -r -p | base64 -d)

for c in $(cat /opt/useful/seclists/Fuzzing/alphanum-case.txt); do
  val=$(echo -n "${PREFIX}${c}" | base64 -w0 | xxd -p -c 1000 | tr -d '\n')
  out=$(curl -s -b "cookie=$val" "$URL")
  echo "$c -> ${#out}"
  echo "$out" | grep -o 'HTB{[^}]*}' && break
done
```

The candidate `d` changed the response length from 1901 to 947 bytes.

![E11: Fuzz loop finds the missing character d and prints the flag](/writeups/evidence/htb-using-web-proxies/e11-cookie-fuzz-success.png "With the decoded 31-character prefix, candidate d returns 947 bytes instead of 1901 and the flag is printed")

**Verified flag:** `HTB{burp_1n7rud3r_n1nj4!}`

**Equivalent in the proxies:** Intruder/ZAP Fuzzer with the payload `alphanum-case.txt` and processors in this order — *Add prefix* (31 characters) → *Base64-encode* → *ASCII Hex-encode*. The order matters: the encodings must be applied in reverse of the decoding order.

### Q4 — Capture the Metasploit Request

The ColdFusion locale traversal module was routed through the proxy:

```text
msf6 > use auxiliary/scanner/http/coldfusion_locale_traversal
msf6 > set RHOSTS <TARGET_IP>
msf6 > set RPORT <PORT>
msf6 > set PROXIES HTTP:127.0.0.1:<PROXY_PORT>
msf6 > run
```

The captured traffic appeared in the ZAP site tree under `/CFIDE/administrator/index.cfm`.

![E12: ZAP Sites tree showing CFIDE/administrator/index.cfm](/writeups/evidence/htb-using-web-proxies/e12-zap-sites-cfide.png "The proxied Metasploit request appears under CFIDE → administrator → index.cfm on the assessment target")

**Answer:** `CFIDE`

### Assessment Summary

| Question | Technique | Result |
|---|---|---|
| Q1 | Client-side control bypass and repeated POST | Flag recovered |
| Q2 | Multi-layer decoding (Hex → Base64) | `3dac93b8cd250aa8c1a36fffc79a17a` |
| Q3 | Encoded fuzzing of the last MD5 character | Flag recovered (`d`) |
| Q4 | Proxying Metasploit | `CFIDE` |

---

## Key Takeaways

1. **The proxy sees what the server sees.** Browser-side restrictions (disabled buttons, input types, JavaScript checks) are suggestions, not controls.
2. **Passive findings are not the scan.** The High-risk command injection appeared only after the active scan.
3. **Edit the parameter where it actually lives.** GET parameters are in the request line; a GET body is ignored.
4. **Valid HTTP matters.** Duplicate headers and a missing blank line produce `400 Bad Request`, not a test result.
5. **Encoding order is reversed for fuzzing.** Decode Hex → Base64, then encode Base64 → Hex.
6. **Response length is the fastest signal.** In every fuzzing exercise the valid result was the one whose length differed from the baseline.
7. **Use the right tool for volume.** Burp Community is throttled; ZAP or a short script is faster for large wordlists.
8. **Proxy your tools as well as your browser.** Proxying Metasploit revealed exactly what the module requested.

---

## Conclusion

The Using Web Proxies module establishes the workflow used throughout web application testing: route traffic through a proxy, observe, modify, replay, fuzz and scan.

The documented session demonstrates practical use of both Burp Suite and OWASP ZAP. It includes an MD5-processed cookie fuzz, an active scan that led to OS command injection and file read, and a Skills Assessment that combined client-side bypass, layered decoding, encoded fuzzing and tool proxying. Failed attempts and their corrections are retained because they show the most common real-world mistakes: malformed requests, wrong header names, edits in the wrong part of a request and placeholder values in scripts.

Sections without captured evidence are documented as procedures and are not claimed as completed exercises.

---

## References

1. Hack The Box Academy — Using Web Proxies  
   https://academy.hackthebox.com/app/module/110

2. PortSwigger — Burp Suite Documentation  
   https://portswigger.net/burp/documentation

3. OWASP ZAP — Documentation  
   https://www.zaproxy.org/docs/

4. SecLists  
   https://github.com/danielmiessler/SecLists

5. CyberChef  
   https://gchq.github.io/CyberChef/

6. OWASP — OS Command Injection Defense Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html

7. OWASP — SQL Injection Prevention Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html

---

**End of Technical Write-up**

**NERO.SEC | HTB Academy — Using Web Proxies | 15/15 Sections Documented**

*Documentation coverage does not imply verified completion of every laboratory exercise.*
