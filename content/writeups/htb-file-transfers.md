**Platform:** Hack The Box Academy  
**Module:** File Transfers (Module 24)  
**Difficulty:** Medium  
**Category:** Offensive Security / Penetration Testing  
**Coverage:** 10 Sections  
**Documentation Status:** Practiced — full module completion not independently verified  
**Publication Status:** Evidence Pending  
**Official Module:** https://academy.hackthebox.com/course/preview/file-transfers

---

## Executive Summary

File transfers are an essential part of penetration testing, system administration, incident response, and post-exploitation activities. During a security assessment, an operator may need to transfer diagnostic utilities to a remote host, retrieve application artifacts for analysis, or exchange data between Windows and Linux systems.

However, file transfers are not always straightforward. Host-based security controls, restrictive firewall policies, application allowlisting, network segmentation, authentication requirements, and endpoint monitoring may limit the available methods.

The Hack The Box Academy File Transfers module explores multiple approaches for transferring files between systems, including native operating system utilities, HTTP/HTTPS clients, SMB, FTP, SSH, scripting languages, remote administration protocols, and Living-off-the-Land binaries.

The module also examines the protection of transferred data, the forensic traces left by transfer operations, and the limitations of simplistic detection mechanisms.

This write-up documents all ten module sections, including practical commands, technical explanations, troubleshooting procedures, and available laboratory evidence.

---

## Section 01 — File Transfers

### 1.1 Objective

Understand why file transfers are necessary during security assessments and identify the primary factors that influence the selection of an appropriate transfer mechanism.

### 1.2 Background

File transfer operations generally involve two endpoints:

- **Source:** The system containing the original file.
- **Destination:** The system receiving the file.

During an authorized penetration test, the attack workstation is often a Linux machine such as Kali or HTB Pwnbox. The target may be a Windows workstation, Windows Server, or Linux host.

Transfers may occur in either direction.

**Download to target:**

```text
Kali Linux
    |
    | HTTP / SMB / FTP / SCP
    v
Target System
```

**Retrieve from target:**

```text
Target System
    |
    | SSH / HTTPS / SMB / RDP
    v
Kali Linux
```

The direction of the data transfer does not necessarily indicate which host initiates the connection.

For instance, a Windows target can initiate an outbound HTTP connection to download a file hosted on Kali, while a Kali client can initiate an SSH connection to retrieve a file from a Linux target.

### 1.3 Common Constraints

Several environmental conditions can prevent a transfer from succeeding.

| Constraint | Potential Impact |
|---|---|
| Firewall restrictions | Blocked destination ports |
| Application control | PowerShell or other utilities unavailable |
| Authentication | Missing or invalid credentials |
| File permissions | Unable to read or write files |
| Proxy restrictions | HTTP requests denied |
| Endpoint security | Suspicious operations blocked or logged |
| Network segmentation | No direct route between systems |
| Protocol compatibility | Client/server negotiation fails |

### 1.4 Methodology

A reliable transfer workflow involves:

1. Identifying the source and destination.
2. Verifying network connectivity.
3. Checking available commands and protocols.
4. Selecting an authorized transfer method.
5. Performing the transfer.
6. Confirming file integrity.
7. Recording evidence and cleaning up temporary resources.

**Key takeaway:** File transfers are not defined by a single command. They require an understanding of operating systems, networking, permissions, and security controls.

---

## Section 02 — Windows File Transfer Methods

### 2.1 Objective

Explore ways to download and upload files on Windows using PowerShell, SMB, FTP, WebDAV, and Base64 encoding.

### 2.2 PowerShell Web Transfers

PowerShell provides access to HTTP and HTTPS functionality through native cmdlets and .NET classes.

Two widely used mechanisms are `Invoke-WebRequest` and `System.Net.WebClient`.

#### Method A — Invoke-WebRequest

Start a web server on Kali:

```bash
mkdir -p ~/transfer
cd ~/transfer

echo "HTB File Transfer Test" > test.txt

python3 -m http.server 8000
```

On Windows:

```powershell
Invoke-WebRequest `
  -Uri "http://KALI_IP:8000/test.txt" `
  -OutFile "$env:TEMP\test.txt"
```

Verify the download:

```powershell
Get-Content "$env:TEMP\test.txt"
```

Expected output:

```text
HTB File Transfer Test
```

`Invoke-WebRequest` sends an HTTP request and can save its response directly to disk.

The destination directory must be writable by the current user.

#### Method B — WebClient.DownloadFile()

```powershell
(New-Object Net.WebClient).DownloadFile(
    "http://KALI_IP:8000/test.txt",
    "$env:TEMP\test.txt"
)
```

This method uses the .NET `WebClient` class.

The first argument specifies the remote URL, while the second specifies the local destination.

#### Method C — DownloadString()

```powershell
$content = (New-Object Net.WebClient).DownloadString(
    "http://KALI_IP:8000/test.txt"
)

Write-Output $content
```

Unlike `DownloadFile()`, this method retrieves the remote content as a string.

PowerShell's `Invoke-Expression` can interpret text as PowerShell commands, which creates a risk when combined with content from untrusted URLs.

Remote script execution does not necessarily require saving a script file first, but it may still generate PowerShell, network, and endpoint telemetry.

### 2.3 Manual Transfer with Base64

Base64 converts binary data into a text representation.

This can be useful when a shell permits text input but conventional file transfers are unavailable.

#### Encode on Kali

```bash
printf 'Hello from Kali' > test.txt

base64 -w 0 test.txt
```

Copy the resulting Base64 string.

#### Decode on Windows

```powershell
$b64 = "PASTE_BASE64_HERE"

[IO.File]::WriteAllBytes(
    "$env:TEMP\test.txt",
    [Convert]::FromBase64String($b64)
)
```

Verify the file:

```powershell
Get-Content "$env:TEMP\test.txt"
```

#### Integrity Verification

On Kali:

```bash
sha256sum test.txt
```

On Windows:

```powershell
Get-FileHash "$env:TEMP\test.txt" -Algorithm SHA256
```

The hashes should match when the transferred content is identical.

Base64 is an encoding mechanism, not encryption. It does not provide confidentiality.

### 2.4 SMB File Transfers

Server Message Block is commonly used for network file sharing in Windows environments.

Its modern direct-hosted implementation generally uses TCP port 445.

#### Start an SMB Server on Kali

```bash
mkdir -p ~/transfer

sudo impacket-smbserver transfer ~/transfer \
  -smb2support \
  -username labuser \
  -password 'LAB_ONLY_PASSWORD'
```

This creates a shared directory named `transfer`.

#### Connect from Windows

```cmd
net use \\KALI_IP\transfer /user:labuser *
```

After authentication, list the share:

```cmd
dir \\KALI_IP\transfer
```

Copy a file:

```cmd
copy \\KALI_IP\transfer\test.txt C:\Users\Public\test.txt
```

#### Technical Explanation

SMB transfers require a reachable server, compatible protocol versions, and suitable permissions.

Authentication may be necessary even when the share only contains harmless laboratory files.

Potential failure conditions include blocked TCP 445 traffic, invalid credentials, disabled SMB versions, and insufficient share permissions.

### 2.5 FTP Transfers

File Transfer Protocol separates command communication from file data transmission.

FTP normally uses TCP 21 for its control connection. Data connections depend on whether active or passive mode is used.

#### Connect from Windows

```cmd
ftp
```

Example interactive session:

```text
ftp> open FTP_SERVER_IP 21
User: labuser
Password: ********
ftp> binary
ftp> get test.txt
ftp> bye
```

The `binary` command prevents inappropriate text-mode transformations when transferring binary files.

#### Non-Interactive FTP

Windows `ftp.exe` supports command files.

Example `ftp-commands.txt`:

```text
open FTP_SERVER_IP 21
labuser
LAB_PASSWORD
binary
get test.txt
bye
```

Execute:

```cmd
ftp -s:ftp-commands.txt
```

FTP does not encrypt credentials or transferred data by default.

Use secure alternatives such as SFTP or HTTPS for sensitive information.

### 2.6 WebDAV Transfers

Web Distributed Authoring and Versioning extends HTTP to support remote file management operations.

WebDAV can operate over HTTP or HTTPS and provides an alternative to direct SMB access when an appropriate WebDAV server and client are available.

Windows can access compatible WebDAV shares through its WebClient functionality.

A WebDAV UNC path may resemble:

```text
\\SERVER_IP@8080\DavWWWRoot\
```

Successful access depends on the Windows WebClient service, server configuration, authentication, and network policy.

WebDAV traffic is not automatically indistinguishable from ordinary browsing traffic; HTTP methods and request patterns can reveal file operations.

### 2.7 Practical Exercise — Windows File Transfers

#### Challenge Requirements

The Windows exercise involved:

- Downloading `flag.txt` from the target web root using `wget`.
- Transferring `upload_win.zip` to the Windows target.
- Extracting the archive.
- Running `hasher upload_win.txt`.
- Submitting the generated hash.

**Observed Windows target:** `10.129.141.73`  
**Target identifier:** ACADEMY-MISC-MS02  
**Username:** `htb-student`

#### Task A — Download flag.txt

On Pwnbox:

```bash
wget http://WINDOWS_TARGET_IP/flag.txt -O flag.txt

cat flag.txt
```

The output should be the file contents provided by the target.

**Evidence status:** Pending — no actual flag output captured in the supplied conversation.

#### Task B — Transfer upload_win.zip

One supported approach is RDP drive redirection using FreeRDP.

From the Pwnbox directory containing the ZIP:

```bash
xfreerdp \
  /v:10.129.141.73 \
  /u:htb-student \
  /p:'<LAB_PASSWORD>' \
  /drive:transfer,$PWD \
  /cert:ignore
```

After connecting to Windows, open:

```text
\\tsclient\transfer
```

This exposes the selected Pwnbox directory through RDP drive redirection.

Copy `upload_win.zip` to a writable local directory.

#### Troubleshooting — RDP Authentication Failure

During the actual laboratory session, the initial FreeRDP command contained a missing space:

```bash
/p:'<LAB_PASSWORD>'/drive:transfer,$PWD
```

Because the password and `/drive` argument were concatenated, authentication failed.

The observed error was:

```text
ERRCONNECT_LOGON_FAILURE [0x00020014]
```

Additional Kerberos diagnostics referenced an unreachable KDC for the realm `ATHENA.MIT.EDU`.

Correcting the command argument separation resolved the immediate login issue.

#### Confirmed RDP Connection

A subsequent screenshot showed a successful FreeRDP session connected to:

```text
10.129.141.73
```

The Windows Desktop was visible, including a file labeled `upload_win`.

This confirms successful remote desktop access. The screenshot alone does not prove that the correct ZIP was extracted or that the hashing task was completed.

**Evidence status:** RDP connection confirmed; extraction and hash verification pending.

#### Task C — Extract and Hash

If the ZIP has been copied to the Windows Desktop:

```powershell
Expand-Archive `
  -Path "$env:USERPROFILE\Desktop\upload_win.zip" `
  -DestinationPath "$env:TEMP\upload_win" `
  -Force
```

Inspect the extracted files:

```powershell
Get-ChildItem "$env:TEMP\upload_win" -Recurse
```

Then:

```powershell
hasher "$env:TEMP\upload_win\upload_win.txt"
```

Record the actual output as the answer.

**Hash result:** Evidence Pending.

---

## Section 03 — Linux File Transfer Methods

### 3.1 Objective

Understand how standard Linux utilities and shell features can perform file downloads, uploads, and integrity verification.

Linux environments often contain several built-in or commonly installed tools suitable for file transfers.

### 3.2 Downloading with wget

`wget` is a command-line HTTP, HTTPS, and FTP retrieval utility.

Example:

```bash
wget http://SERVER_IP:8000/test.txt
```

Save using a custom filename:

```bash
wget http://SERVER_IP:8000/test.txt -O downloaded.txt
```

Verify:

```bash
cat downloaded.txt
```

### 3.3 Downloading with cURL

`curl` is another common network transfer utility.

```bash
curl -o downloaded.txt \
  http://SERVER_IP:8000/test.txt
```

The `-o` option selects the local output filename.

Use `-O` when the remote filename should be retained.

```bash
curl -O http://SERVER_IP:8000/test.txt
```

For HTTP error handling:

```bash
curl -fL -o downloaded.txt \
  http://SERVER_IP:8000/test.txt
```

Here, `-f` causes HTTP error responses to produce failure status and `-L` follows redirects.

### 3.4 Python-Based File Download

When Python is installed, its standard library can retrieve HTTP resources.

```bash
python3 -c '
import urllib.request
urllib.request.urlretrieve(
    "http://SERVER_IP:8000/test.txt",
    "downloaded.txt"
)
'
```

This is useful when conventional command-line download clients are unavailable.

However, the network and endpoint controls still apply.

### 3.5 Temporary HTTP Server

A Python web server can expose files from a local directory.

```bash
cd ~/transfer

python3 -m http.server 8000
```

A client can retrieve the file using:

```bash
wget http://SERVER_IP:8000/test.txt
```

Python's basic HTTP server supports file retrieval but does not provide a general-purpose authenticated upload service.

For uploads, a separate receiver implementation is required.

### 3.6 SSH and SCP

Secure Shell is commonly used for remote administration.

SCP enables copying files through an SSH-based transport.

#### Upload to Target

```bash
scp test.txt htb-student@TARGET_IP:/tmp/
```

#### Download from Target

```bash
scp htb-student@TARGET_IP:/tmp/response.txt .
```

The dot in the download command represents the current local directory.

#### Verification

On the target:

```bash
sha256sum /tmp/test.txt
```

On Pwnbox:

```bash
sha256sum test.txt
```

Compare both outputs.

### 3.7 SFTP

SFTP offers interactive file management over SSH.

Connect:

```bash
sftp htb-student@TARGET_IP
```

Inside the session:

```text
sftp> ls
sftp> put test.txt
sftp> get response.txt
sftp> bye
```

SFTP provides encrypted transport when properly configured.

### 3.8 Linux Base64 Transfers

Encode a file:

```bash
base64 -w 0 test.txt
```

Decode copied content:

```bash
printf '%s' 'BASE64_CONTENT' | base64 -d > restored.txt
```

Verify:

```bash
sha256sum test.txt restored.txt
```

This technique is useful for small files, but large files create long encoded strings that are difficult to transfer reliably through terminal sessions.

### 3.9 Practical Exercise — Linux File Transfers

The Linux portion of the module includes practice with remote file operations and SSH-based connectivity.

For the supplied optional exercise, the task was to connect to the target with SSH and practice uploading and downloading files.

#### SSH Connection

```bash
ssh htb-student@LINUX_TARGET_IP
```

#### Upload Test

On Pwnbox:

```bash
echo "Hello from Pwnbox" > test.txt

scp test.txt htb-student@LINUX_TARGET_IP:/tmp/
```

On Linux target:

```bash
cat /tmp/test.txt
```

#### Download Test

On target:

```bash
echo "Hello from Target" > /tmp/response.txt
```

On Pwnbox:

```bash
scp htb-student@LINUX_TARGET_IP:/tmp/response.txt .
```

Verify:

```bash
cat response.txt
```

Once the required operations have been performed successfully, the optional exercise instructs the learner to submit:

```text
DONE
```

**Evidence status:** Pending — no completed SSH/SCP terminal session was supplied.

---

## Section 04 — Transferring Files with Code

### 4.1 Objective

Use installed programming languages to perform file transfers when dedicated transfer utilities are unavailable or unsuitable.

A file transfer typically requires three operations:

1. Establish a connection to the source.
2. Read the transferred data.
3. Write the data to the destination.

Programming languages can implement these operations using standard libraries.

### 4.2 Python

Python provides the `urllib.request` module.

```python
import urllib.request

url = "http://SERVER_IP:8000/test.txt"
destination = "test.txt"

urllib.request.urlretrieve(url, destination)
```

This approach supports HTTP and HTTPS retrieval.

A safe implementation should also handle connection errors, timeouts, and unexpected response sizes.

### 4.3 PHP

PHP can retrieve content from HTTP resources when the required extensions and configuration settings are available.

Example using cURL:

```php
<?php
$ch = curl_init("http://SERVER_IP:8000/test.txt");

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$data = curl_exec($ch);

if ($data !== false) {
    file_put_contents("test.txt", $data);
}

curl_close($ch);
?>
```

This method requires the PHP cURL extension.

### 4.4 Ruby

Ruby includes HTTP functionality in its standard library.

```ruby
require 'net/http'
require 'uri'

url = URI('http://SERVER_IP:8000/test.txt')

content = Net::HTTP.get(url)

File.binwrite('test.txt', content)
```

For production use, HTTP status, timeouts, redirects, and TLS verification should be handled explicitly.

### 4.5 Perl

Perl installations may include HTTP client modules such as `HTTP::Tiny`.

```perl
use HTTP::Tiny;

my $response = HTTP::Tiny->new->get(
    'http://SERVER_IP:8000/test.txt'
);

if ($response->{success}) {
    open my $fh, '>', 'test.txt' or die $!;
    binmode $fh;
    print $fh $response->{content};
    close $fh;
}
```

Availability depends on the Perl version and installed modules.

### 4.6 Windows Script Hosts

Windows also includes script execution capabilities through components such as Windows Script Host.

Historically, JavaScript and VBScript executed with `cscript.exe` or `wscript.exe` could interact with HTTP client components.

Their availability and permitted functionality depend on host configuration and application-control policy.

### 4.7 Key Observations

Code-based transfer methods provide flexibility, but they introduce additional dependencies.

A successful transfer requires:

- A functioning interpreter or runtime.
- Suitable network connectivity.
- Correct library availability.
- A writable destination.
- Proper HTTP and TLS handling.

**Section conclusion:** A programming language can replace a missing transfer utility, but it does not eliminate network or endpoint restrictions.

---

## Section 05 — Miscellaneous File Transfer Methods

### 5.1 Objective

Explore alternative transfer approaches using Netcat, PowerShell Remoting, and RDP drive redirection.

### 5.2 Netcat

Netcat supports raw TCP communication and can be used to transfer files in a controlled laboratory.

#### Receiver

On one machine:

```bash
nc -lvnp 9001 > received.txt
```

#### Sender

On the other machine:

```bash
nc RECEIVER_IP 9001 < test.txt
```

The receiver writes incoming bytes to `received.txt`.

The exact Netcat arguments and connection-closing behavior may vary between implementations.

Netcat transfers generally provide no built-in authentication or encryption.

Therefore, they are suitable for isolated laboratory demonstrations rather than confidential transfers over untrusted networks.

### 5.3 PowerShell Remoting

Windows PowerShell Remoting uses Windows Remote Management.

When configured and authorized, PowerShell sessions can support remote administrative operations and file copying.

Example:

```powershell
$session = New-PSSession -ComputerName TARGET_HOST -Credential (Get-Credential)
```

Copy a file to the remote system:

```powershell
Copy-Item `
  -Path ".\test.txt" `
  -Destination "C:\Users\Public\test.txt" `
  -ToSession $session
```

Retrieve a file:

```powershell
Copy-Item `
  -Path "C:\Users\Public\response.txt" `
  -Destination ".\response.txt" `
  -FromSession $session
```

Close the session:

```powershell
Remove-PSSession $session
```

PowerShell Remoting commonly uses TCP 5985 for HTTP and TCP 5986 for HTTPS.

Successful use requires properly configured WinRM endpoints, authentication, authorization, and network access.

### 5.4 RDP Drive Redirection

Remote Desktop Protocol can redirect local directories or drives into a Windows session.

Example from Pwnbox:

```bash
xfreerdp \
  /v:TARGET_IP \
  /u:htb-student \
  /p:'<LAB_PASSWORD>' \
  /drive:transfer,$PWD \
  /cert:ignore
```

On Windows:

```text
\\tsclient\transfer
```

This approach is particularly useful when an interactive Windows Desktop is available.

The operator can transfer files using File Explorer without configuring a separate web or FTP server.

#### Observed Laboratory Result

During the actual exercise, an RDP session to `10.129.141.73` was established successfully after correcting a command formatting error.

The Windows Desktop became accessible.

**Evidence available:** Screenshot of the FreeRDP session.

### 5.5 Method Comparison

| Method | Main Requirement | Advantage | Limitation |
|---|---|---|---|
| Netcat | TCP connectivity | Minimal setup | No inherent encryption |
| PowerShell Remoting | WinRM configuration | Integrated Windows administration | Authentication and policy requirements |
| RDP Redirection | Working RDP session | Convenient GUI-based file transfer | Interactive desktop dependency |
| SCP | SSH service | Encrypted transfer | Requires SSH access |
| HTTP | Web server/client | Broad compatibility | Authentication and security vary |

---

## Section 06 — Protected File Transfers

### 6.1 Objective

Understand how to protect files containing sensitive data during transfer and storage.

### 6.2 Why Protection Matters

Files involved in incident response and penetration testing may contain:

- Configuration files.
- Application artifacts.
- Test credentials.
- System logs.
- Evidence collected during authorized assessments.

Such information should be handled according to the engagement's scope and data-handling requirements.

### 6.3 Transport Encryption

Secure transfer protocols include:

- HTTPS with valid TLS configuration.
- SSH.
- SCP.
- SFTP.

Transport encryption helps protect data in transit against passive interception and tampering, subject to protocol and authentication configuration.

### 6.4 File-Level Encryption with OpenSSL

Encrypt a harmless sample file before transfer:

```bash
openssl enc -aes-256-cbc \
  -salt \
  -pbkdf2 \
  -iter 100000 \
  -in test.txt \
  -out test.txt.enc
```

OpenSSL prompts for an encryption password.

To decrypt:

```bash
openssl enc -d -aes-256-cbc \
  -pbkdf2 \
  -iter 100000 \
  -in test.txt.enc \
  -out restored.txt
```

The same password is required.

This demonstrates password-based file encryption.

Important: CBC encryption in this form does not provide authenticated encryption. For higher-assurance workflows, use an authenticated encryption format or a well-maintained encrypted archive solution.

### 6.5 Integrity Verification

Calculate a SHA256 hash:

```bash
sha256sum test.txt
```

After transfer:

```bash
sha256sum restored.txt
```

Matching hashes provide evidence that file contents remain unchanged.

Integrity checking and encryption solve different problems.

- **Encryption:** Protects confidentiality.
- **Hashing:** Helps detect modifications.
- **Authentication:** Establishes the identity or authorization of communicating parties.

### 6.6 Data Minimization

A professional assessment should limit the collection and transfer of sensitive material.

When possible, demonstrate a vulnerability using harmless sample content or narrowly scoped evidence instead of copying unnecessary personal or confidential data.

**Section conclusion:** Secure transfer requires appropriate protocols, careful storage, integrity checking, and adherence to the assessment's authorization boundaries.

---

## Section 07 — Catching Files over HTTP/S

### 7.1 Objective

Configure a receiving endpoint capable of accepting file uploads over HTTP or HTTPS.

A standard Python HTTP server is useful for downloads, but it does not provide general upload functionality.

A dedicated upload receiver can support transfers from a remote host to an authorized testing workstation.

### 7.2 Basic HTTP Upload Server

Install a laboratory upload server on Kali:

```bash
python3 -m pip install --user uploadserver
```

Depending on the Kali Python environment, a virtual environment may be needed instead.

Start the receiver:

```bash
mkdir -p ~/uploads
cd ~/uploads

python3 -m uploadserver 8000
```

The server accepts uploads through its designated upload endpoint.

### 7.3 Upload a File with cURL

From another Linux machine:

```bash
curl -F "files=@test.txt" \
  http://KALI_IP:8000/upload
```

The `-F` option creates a multipart/form-data request.

On Kali, inspect the destination directory:

```bash
ls -lah ~/uploads
```

Check the uploaded file:

```bash
sha256sum ~/uploads/test.txt
```

Compare the result with the source hash.

### 7.4 Windows Upload Alternative

If `curl.exe` is available on Windows:

```powershell
curl.exe -F "files=@C:\Users\Public\test.txt" `
  "http://KALI_IP:8000/upload"
```

This requires a reachable upload receiver.

### 7.5 Nginx and WebDAV

For more persistent environments, a properly configured Nginx server with WebDAV support can provide upload functionality.

Important configuration considerations include:

- Explicitly allowed HTTP methods.
- A dedicated upload directory.
- Filesystem write permissions.
- Authentication.
- TLS configuration.
- Maximum upload size.
- Access logging.
- Preventing public directory listing.
- Restricting access to authorized sources.

An upload directory should not be exposed as a publicly browsable repository without a clear requirement.

### 7.6 Troubleshooting

#### Port Already in Use

Inspect listening sockets:

```bash
ss -lntp
```

A server cannot normally bind the same address and port already occupied by another incompatible listener.

#### Permission Denied

Check directory permissions:

```bash
ls -ld ~/uploads
```

Ensure the server process can write to the intended directory.

#### Connection Refused

Verify that the service is listening and that the destination IP and port are correct.

#### HTTP 404

Confirm the client is using the upload endpoint, not just the website root.

#### HTTP 413

The server or reverse proxy may be rejecting files exceeding the configured request-size limit.

### 7.7 Security Considerations

An upload receiver should be temporary or appropriately secured.

Unauthenticated file upload endpoints can introduce significant security risks if exposed to untrusted networks.

Disable temporary receivers after completing the authorized assessment.

---

## Section 08 — Living off The Land

### 8.1 Objective

Understand how legitimate operating system tools can provide additional file-transfer capabilities.

### 8.2 Living-off-the-Land Techniques

Living off the Land refers to leveraging functionality that already exists on a system instead of introducing separate tools for every operation.

These mechanisms are valuable for legitimate administration, but they can also be abused by threat actors.

Two relevant reference projects are:

**LOLBAS:** https://lolbas-project.github.io/

**GTFOBins:** https://gtfobins.github.io/

LOLBAS documents Windows utilities that may support alternate operations such as downloading, executing, or reading files.

GTFOBins documents useful behaviors of Unix and Linux binaries under various permission conditions.

### 8.3 Windows Examples

#### Certutil

`certutil.exe` is a legitimate Windows certificate utility.

It can also retrieve files in configurations that permit URL-based operations.

Example within an authorized lab:

```cmd
certutil.exe -urlcache -split -f ^
  http://KALI_IP:8000/test.txt ^
  C:\Users\Public\test.txt
```

This behavior is well known and may be monitored by endpoint-security products.

#### Bitsadmin

BITS provides background transfer functionality.

`bitsadmin.exe` is a legacy command-line interface for BITS administration.

Historically, it has been used to configure file downloads, although modern Windows administration generally favors supported BITS PowerShell interfaces.

#### PowerShell

PowerShell supports downloads, uploads, file manipulation, encoding, and remote administration.

Its availability makes it flexible, but its behavior is also commonly monitored through endpoint security and PowerShell logging.

### 8.4 Linux Examples

Linux systems commonly contain utilities such as:

```bash
which curl
which wget
which python3
which openssl
which nc
which ssh
```

These commands can help determine which transfer-capable tools are available.

Not every binary is installed on every distribution.

### 8.5 Security Implications

The presence of a legitimate executable is not evidence of malicious activity by itself.

Security teams must consider:

- The parent process.
- Command-line arguments.
- Destination addresses.
- Files written or modified.
- User context.
- Execution frequency.
- Historical behavior.

**Section conclusion:** Living-off-the-Land capabilities increase operational flexibility, but they do not guarantee stealth or immunity from detection.

---

## Section 09 — Detection

### 9.1 Objective

Understand how file-transfer activity can be observed through endpoint logs, process telemetry, and network monitoring.

### 9.2 Process Execution Monitoring

Windows process creation events can reveal utilities used for file transfers.

Relevant examples include:

- `powershell.exe`
- `certutil.exe`
- `bitsadmin.exe`
- `curl.exe`
- `ftp.exe`

Windows Security Event ID 4688 can record process creation when appropriate auditing is enabled.

Sysmon Event ID 1 can provide additional process creation details when Sysmon is deployed and configured.

### 9.3 PowerShell Logging

PowerShell Script Block Logging can record executed script content.

Relevant telemetry may include Event ID 4104, depending on system configuration.

For instance, a defender may investigate unexpected combinations of:

```text
DownloadString
Invoke-WebRequest
Invoke-Expression
```

These strings should not be treated as automatically malicious. Context is essential.

### 9.4 Network Monitoring

HTTP-based transfer operations may generate:

- HTTP request logs.
- Destination URLs.
- Source and destination IP addresses.
- HTTP methods.
- User-Agent headers.
- Response sizes.
- Proxy logs.

SMB transfers may produce authentication and file-access telemetry when the relevant auditing is enabled.

SSH and SFTP activity may appear in SSH server logs and network-flow records.

### 9.5 User-Agent Analysis

Different HTTP clients may identify themselves differently.

This can provide useful context for investigating unusual traffic.

However, User-Agent values are client-controlled and should not be trusted as definitive proof of the originating application.

### 9.6 Detection Engineering Example

A defender investigating unexpected file transfers could correlate:

```text
Process creation
      |
      v
Network connection
      |
      v
HTTP or SMB operation
      |
      v
File creation
      |
      v
Execution or access event
```

This sequence is generally more meaningful than a single suspicious command or header.

### 9.7 Relevant Windows Telemetry

| Source | Example Event | Purpose |
|---|---|---|
| Security Log | 4688 | Process creation |
| PowerShell Operational | 4104 | Script block logging |
| Sysmon | 1 | Process creation |
| Sysmon | 3 | Network connection |
| Sysmon | 11 | File creation |

Event visibility depends on logging configuration. Some Sysmon events require explicit inclusion rules.

### 9.8 Detection Limitations

False positives can occur because administrators, software deployment systems, developers, and legitimate applications perform file transfers routinely.

Effective detection requires behavioral baselines, environmental context, and appropriate tuning.

---

## Section 10 — Evading Detection

### 10.1 Objective

Study the limitations of simplistic security detections and understand why file-transfer activity should be assessed using multiple telemetry sources.

### 10.2 Limitations of Static Indicators

Security tools may initially rely on simple indicators such as:

- Executable filenames.
- Specific command-line arguments.
- HTTP User-Agent values.
- Known URLs.
- Destination ports.

However, individual indicators do not fully establish whether an action is legitimate or malicious.

### 10.3 User-Agent Limitations

Many HTTP clients support customizable request headers.

Because User-Agent values are not cryptographically authenticated, a monitoring system cannot reliably identify a process using the User-Agent alone.

A stronger defensive approach correlates HTTP metadata with process execution, user identity, device context, and destination reputation.

### 10.4 Legitimate Binary Abuse

Application allowlisting can reduce exposure to unapproved programs.

However, an allowlisted executable may still support functionality that should be restricted or monitored.

For example, a binary intended for administration may also be capable of retrieving remote content.

Therefore, security controls should consider both executable identity and actual behavior.

### 10.5 Defense-in-Depth

A resilient defensive architecture combines several layers:

| Layer | Example Control |
|---|---|
| Application | Application control policies |
| Endpoint | EDR behavior monitoring |
| PowerShell | Script Block Logging |
| Network | Firewall and egress filtering |
| Proxy | URL and content inspection |
| Filesystem | File creation monitoring |
| Identity | Least privilege and access controls |

No single layer provides complete visibility.

### 10.6 Practical Defensive Validation

A controlled laboratory can compare telemetry produced by benign downloads using different Windows clients.

For example:

```powershell
Invoke-WebRequest `
  -Uri "http://LAB_SERVER:8000/test.txt" `
  -OutFile "$env:TEMP\test.txt"
```

The security analyst can review the process, network, and file events associated with this transfer.

Repeating the test with other approved clients can reveal which activities are visible and which logging gaps remain.

### 10.7 Section Conclusion

Detection evasion research helps defenders understand why signatures and isolated indicators may fail.

The primary defensive lesson is to correlate events across several data sources instead of relying exclusively on command names, process names, or HTTP headers.

---

## Laboratory Evidence and Results

### Evidence 01 — RDP Authentication Failure

**System:** HTB Pwnbox  
**Target:** `10.129.141.73`  
**Tool:** FreeRDP

#### Observed Error

```text
ERRCONNECT_LOGON_FAILURE [0x00020014]
```

#### Root Cause

The original command lacked a space between its password and drive-redirection arguments.

#### Resolution

Separate the FreeRDP arguments correctly:

```bash
xfreerdp /v:10.129.141.73 \
  /u:htb-student \
  /p:'<LAB_PASSWORD>' \
  /drive:transfer,$PWD \
  /cert:ignore
```

#### Result

A subsequent screenshot confirmed that the Windows Desktop was accessible.

**Status: Confirmed**

### Evidence 02 — Windows Desktop Access

The submitted screenshot shows:

- An active FreeRDP window.
- A remote Windows Desktop.
- The remote target IP `10.129.141.73`.
- A Desktop file named `upload_win`.

This demonstrates successful RDP access but does not independently verify ZIP extraction or hashing.

**Status: Confirmed for RDP access only**

**Evidence source:** Screenshot provided in the conversation, October 26, 2026.

### Evidence 03 — Windows File Hash

Required operation:

```cmd
hasher upload_win.txt
```

**Observed hash:** Evidence Pending

No actual `hasher` output was provided.

### Evidence 04 — Linux SSH File Transfer

Required activities:

```bash
ssh htb-student@LINUX_TARGET_IP
```

```bash
scp test.txt htb-student@LINUX_TARGET_IP:/tmp/
```

```bash
scp htb-student@LINUX_TARGET_IP:/tmp/response.txt .
```

**Terminal output:** Evidence Pending

The commands are documented as reproducible procedures, not independently verified execution results.

---

## Troubleshooting Reference

| Error | Likely Cause | Recommended Check |
|---|---|---|
| Connection refused | Service not listening | Check port and listener |
| Connection timed out | Routing or firewall | Check reachability |
| Permission denied | Incorrect permissions | Check ownership and ACLs |
| 404 Not Found | Incorrect URL/path | Check server directory |
| 403 Forbidden | Server access restrictions | Review authorization |
| Authentication failure | Invalid arguments or credentials | Review login syntax |
| Hash mismatch | Corrupted or altered transfer | Re-transfer and compare |
| Command not found | Utility unavailable | Check installed tools |
| Port already in use | Listener conflict | Check `ss -lntp` |

---

## Operational Cheat Sheet

| Task | Linux / Windows Command |
|---|---|
| HTTP download on Linux | `wget URL -O file` |
| HTTP download with cURL | `curl -fL -o file URL` |
| HTTP server on Linux | `python3 -m http.server 8000` |
| Windows web download | `Invoke-WebRequest -Uri URL -OutFile file` |
| Upload via SCP | `scp file user@host:/tmp/` |
| Download via SCP | `scp user@host:/tmp/file .` |
| Interactive file transfer | `sftp user@host` |
| Windows SMB file copy | `copy \\SERVER\share\file C:\dest\` |
| Base64 encode | `base64 -w 0 file` |
| Base64 decode | `base64 -d encoded.txt > file` |
| Linux SHA256 | `sha256sum file` |
| Windows SHA256 | `Get-FileHash file -Algorithm SHA256` |
| Windows ZIP extraction | `Expand-Archive -Path file.zip -DestinationPath output` |

---

## Lessons Learned

The module demonstrates that file transfer methods are strongly influenced by operating system capabilities, network connectivity, authentication, and security controls.

Several practical lessons emerge:

1. **Transfer direction matters.** A download may be easier than an upload because of firewall rules or available services.

2. **Built-in utilities are valuable.** Windows and Linux provide several capabilities that can support transfers without requiring additional software.

3. **Protocol selection matters.** HTTP, SMB, FTP, SSH, and RDP have different requirements and security properties.

4. **Integrity must be verified.** Successful command execution does not necessarily prove that the destination contains an intact copy of the original file.

5. **Troubleshooting is essential.** Small command-formatting errors, such as concatenated FreeRDP arguments, can cause authentication failures that initially resemble more complex networking issues.

6. **Encrypted transport is preferable.** Sensitive files should be transferred using secure, authenticated channels and handled according to the assessment scope.

7. **Legitimate tools remain observable.** Living-off-the-Land techniques can reduce dependencies on third-party utilities but still produce detectable activity.

8. **Evidence should support completion claims.** Screenshots and terminal logs must demonstrate the actual activity described in the report.

---

## Conclusion

The Hack The Box Academy File Transfers module provides a practical foundation for moving files between Windows and Linux systems during authorized security assessments.

Across its ten sections, the module covers fundamental file transfer concepts, native Windows and Linux utilities, programmatic transfers, alternative communication channels, file protection, HTTP upload receivers, Living-off-the-Land techniques, and security monitoring.

The documented hands-on activity demonstrates a successful Windows RDP connection after resolving a FreeRDP argument-formatting issue. The remaining file hashing and SSH transfer operations are documented as reproducible procedures, with their execution evidence pending.

The central lesson of the module is that successful file transfers depend not only on knowing commands but also on understanding network direction, authentication, permissions, protocol capabilities, data integrity, and security monitoring.

These skills support legitimate penetration testing, system administration, incident response, and defensive investigation.

---

## References

1. Hack The Box Academy — File Transfers  
   https://academy.hackthebox.com/course/preview/file-transfers

2. Microsoft Learn — PowerShell Documentation  
   https://learn.microsoft.com/powershell/

3. Python Documentation — HTTP Server  
   https://docs.python.org/3/library/http.server.html

4. Python Documentation — urllib.request  
   https://docs.python.org/3/library/urllib.request.html

5. OpenSSH Manual Pages  
   https://www.openssh.com/manual.html

6. Impacket Project  
   https://github.com/fortra/impacket

7. LOLBAS Project  
   https://lolbas-project.github.io/

8. GTFOBins Project  
   https://gtfobins.github.io/

9. Microsoft Sysmon Documentation  
   https://learn.microsoft.com/sysinternals/downloads/sysmon

10. OpenSSL Documentation  
    https://docs.openssl.org/

---

**End of Technical Write-up**

**NERO.SEC | HTB Academy — File Transfers | 10/10 Sections Documented**

*Documentation coverage does not imply verified completion of every laboratory exercise.*
