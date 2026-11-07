**A practical, command-line packet analysis walkthrough**

**Platform:** TryHackMe · **Difficulty:** Easy · **Tools:** TShark, Capinfos, Linux CLI · **Room:** [TShark: The Basics](https://tryhackme.com/room/tsharkthebasics)

> **Evidence note.** Screenshots in this article come from my lab session. Answers for Tasks 2–4 and 8 are supported by those screenshots and/or directly visible packet lines. Tasks 5–7 are explained from the room's concepts and independently cross-checked against public walkthroughs; I did not capture a separate Task 7 live-session screenshot. The sample packet counts in Task 7 are **lab reference values**, not guaranteed counts for every new capture.

## Overview

TShark is Wireshark's command-line network analyzer. It can read saved packet captures, sniff interfaces, filter packets, export protocol fields, and stream results into standard Unix utilities. Unlike a GUI-driven workflow, it is easy to script and integrate into repeatable incident-response and network-forensics tasks.

This room introduces the essential analysis workflow: first establish file context with `capinfos`, then inspect raw packets, isolate interesting traffic with display filters, and finally understand when to apply capture filters and file-rotation settings.

### Lab environment

The TryHackMe machine contains `demo.pcapng` in `~/Desktop/exercise-files`. The screenshots from this run show **TShark 3.2.3**, **12 listed capture interfaces**, and a capture of **43 packets** over approximately **30.39 seconds**.

```bash
cd ~/Desktop/exercise-files
ls -lh demo.pcapng
```

## Task 1 — Introduction

**Objective:** Understand what TShark does and start the lab machine.

TShark has two main modes. **Offline analysis** reads a file using `-r`; **live capture** listens on an interface using `-i`. Both modes can produce packet summaries or detailed protocol dissections, but capture-only controls should not be confused with offline filtering.

```bash
# Show the version and available command options.
tshark -v
tshark -h
```

**Completion:** Start the attached machine and proceed to the tools section. No flag is required for this introductory task.

## Task 2 — Command-Line Packet Analysis Hints and Supplemental CLI Tools

**Objective:** Inspect capture metadata and identify the RIPEMD160 hash.

Before opening individual packets, establish file identity and capture properties. `capinfos` reports metadata such as the number of packets, capture duration, network encapsulation, timestamps, and file hashes. The hash refers to the **capture file**, not to any individual network packet.

```bash
capinfos demo.pcapng
```

For a focused lookup on the lab VM:

```bash
capinfos demo.pcapng | grep -i RIPEMD160
```

In this exercise, the captured output shows 43 packets, roughly 25 kB of data, and a 30.393704-second interval. The required value is:

**Question — What is the RIPEMD160 value?**  
**Answer:** `6ef5f0c165a1db4a3cad3116b0c5bcc0cf6b9ab7`



![Capinfos output displaying capture statistics and the RIPEMD160 value](/writeups/evidence/thm-tshark-the-basics/01-capinfos-file-summary.jpg "File metadata and digest from capinfos demo.pcapng")



Other CLI utilities are useful when processing TShark output:

| Utility | Why it matters |
|---|---|
| `grep` | Match relevant output lines. |
| `wc -l` | Count output records or displayed packets. |
| `nl` | Number filtered output lines without changing original frame numbers. |
| `cut` | Split delimited fields. |
| `sort` / `uniq -c` | Group and count repeated values. |
| `awk` | Process tabular or field-oriented output. |
| `sed` | Select or transform output lines. |

**Analyst note:** Hashes are useful for evidence integrity. Record them before editing, re-exporting, or converting a capture file. Recent `capinfos` builds may expose a different set of hash algorithms, so the exact fields depend on the installed version.

## Task 3 — TShark Fundamentals I: Main Parameters I

**Objective:** Identify the installed TShark version and available capture interfaces.

### 3.1 — Verify the version

```bash
tshark -v
```

**Question — What is the installed TShark version?**  
**Answer:** `3.2.3`



![TShark command-line version details](/writeups/evidence/thm-tshark-the-basics/02-tshark-version.jpg "TShark version identification on the TryHackMe VM")



### 3.2 — List interfaces

```bash
tshark -D
```

**Question — How many interfaces are available?**  
**Answer:** `12`



![TShark interface enumeration listing twelve entries](/writeups/evidence/thm-tshark-the-basics/03-available-interfaces.jpg "Enumerating available capture interfaces with tshark -D")



The `-D` result is **not** a count of physical Ethernet adapters. It also includes logical entries such as `any`, `nflog`, and remote-capture helpers. If permissions prevent listing or capturing interfaces on another Linux host, try `sudo tshark -D` after checking local policy.

### Key parameters introduced

| Parameter | Purpose | Example |
|---|---|---|
| `-h` | Show help | `tshark -h` |
| `-v` | Print version | `tshark -v` |
| `-D` | List capture interfaces | `tshark -D` |
| `-i` | Select interface for live capture | `tshark -i ens5` |

## Task 4 — TShark Fundamentals I: Main Parameters II

**Objective:** Read a PCAP and extract specific packet fields.

### 4.1 — Read the entire capture

```bash
tshark -r demo.pcapng
```

This prints a one-line summary for each packet. The output shows a TCP three-way handshake, an HTTP `GET /download.html` request, HTTP responses, DNS traffic, and a duplicate ACK later in the capture.



![Beginning of the demo packet capture shown in TShark](/writeups/evidence/thm-tshark-the-basics/04-read-pcap-first-packets.jpg "Initial packet readout from demo.pcapng")





![Full 43-packet TShark readout](/writeups/evidence/thm-tshark-the-basics/05-read-pcap-complete.jpg "Complete 43-packet stream from demo.pcapng")



### 4.2 — Read individual frames

TShark counts packets using `frame.number`. Filtering for this field is more reliable than manually scrolling through a long terminal session.

```bash
# Read only frame 29.
tshark -r demo.pcapng -Y 'frame.number == 29'

# Read the first 29 packets and show only the final line.
tshark -r demo.pcapng -c 29 | tail -n 1
```

The frame 29 summary contains `[PSH, ACK]`.

**Question — What TCP flags are assigned to packet 29?**  
**Answer:** `PSH, ACK`

### 4.3 — Read the TCP acknowledgment number

```bash
tshark -r demo.pcapng -Y 'frame.number == 25'
```

Or extract the field directly:

```bash
tshark -r demo.pcapng -Y 'frame.number == 25' \
  -T fields -e frame.number -e tcp.ack
```

**Question — What is the ACK value in packet 25?**  
**Answer:** `12421`

This is the TCP acknowledgment number shown in the lab's standard relative sequence-number presentation. It should not be confused with the packet's own sequence number.

### 4.4 — Inspect the advertised TCP window

```bash
tshark -r demo.pcapng -Y 'frame.number == 9' \
  -T fields -e frame.number -e tcp.window_size_value
```

**Question — What is the Window size value of packet 9?**  
**Answer:** `9660`

The advertised window is part of TCP flow control: it tells the other endpoint how much data the receiver is prepared to accept, subject to window scaling where applicable.

### Other useful reading options

| Parameter | Purpose |
|---|---|
| `-r file` | Read a saved capture. |
| `-c N` | Process up to N packets. |
| `-V` | Show the verbose protocol tree. |
| `-x` | Show a hex/ASCII packet dump. |
| `-w file` | Save a live capture or selected packets. |
| `-T fields -e FIELD` | Output selected protocol fields. |

```bash
# Verbose description of the first packet.
tshark -r demo.pcapng -c 1 -V

# Show hexadecimal bytes from the first packet.
tshark -r demo.pcapng -c 1 -x
```

## Task 5 — TShark Fundamentals II: Capture Conditions

**Objective:** Configure capture stopping and file rotation.

The `-a` and `-b` options apply to **live capture**, not retrospective filtering of a saved PCAP.

- **Autostop (`-a`)** limits the run by duration, file size, or another supported stopping condition.
- **Ring buffer (`-b`)** rotates output files after a duration or file-size threshold, optionally overwriting old files after a fixed number of files.

For example, save a ten-second capture and then exit:

```bash
sudo tshark -i ens5 -w short-capture.pcapng -a duration:10
```

Rotate capture files every 30 seconds and keep at most three files, stopping after two minutes:

```bash
sudo tshark -i ens5 -w rolling.pcapng \
  -b duration:30 -b files:3 -a duration:120
```

Use rotation to prevent indefinitely growing capture files. Unlike an unbounded capture, this example has an explicit stop condition. Actual output filenames depend on TShark's file-rotation naming rules.

**Question — Which parameter enables continuous capture dumps / ring buffering?**  
**Answer:** `-b`

**Question — Can autostop and ring-buffer options be combined?**  
**Answer:** `y`

## Task 6 — TShark Fundamentals III: Capture vs. Display Filters

**Objective:** Understand the difference between filtering **before** a packet is recorded and filtering **after** it has been collected.

| Concept | Capture filter | Display filter |
|---|---|---|
| Parameter | `-f` | `-Y` |
| Syntax | BPF / libpcap filter syntax | Wireshark display-filter syntax |
| Typical use | Live capture | Live display or saved PCAP analysis |
| Example | `tcp port 80` | `tcp.port == 80` |
| Effect | Unmatched traffic is not saved by that capture | Unmatched traffic is omitted from the displayed result |

```bash
# Capture only TCP traffic on port 80 (live interface).
sudo tshark -i ens5 -f 'tcp port 80' -w http-only.pcapng

# Display only HTTP packets from a saved capture.
tshark -r demo.pcapng -Y 'http'
```

**Question — Which parameter specifies capture filters?**  
**Answer:** `-f`

**Question — Which parameter specifies display filters?**  
**Answer:** `-Y`

**Common mistake:** `-f 'tcp port 80'` is not the correct way to filter an already saved PCAP. For offline filtering, use `-Y 'tcp.port == 80'`.

## Task 7 — TShark Fundamentals IV: Capture Filters

**Objective:** Generate traffic and observe how a live BPF capture filter behaves.

The room's example uses `10.10.10.10` as the destination. On the machine used for the walkthrough, `ens5` was the interface listed by TShark. Run a controlled capture only inside your assigned lab or other authorized environment.

### 7.1 — Start the capture

In **Terminal A**:

```bash
sudo tshark -i ens5 -f 'host 10.10.10.10' \
  -w task7-live.pcapng
```

### 7.2 — Generate a connection attempt

In **Terminal B**:

```bash
curl -v --max-time 10 http://10.10.10.10/
```

Return to Terminal A, press `Ctrl+C` to stop the capture, and inspect the saved file. The capture filter accepts packets whose source or destination is `10.10.10.10`.

### 7.3 — Count packet properties

```bash
# SYN bit set (includes SYN-ACK).
tshark -r task7-live.pcapng -Y 'tcp.flags.syn == 1' | wc -l

# Packets destined for 10.10.10.10.
tshark -r task7-live.pcapng -Y 'ip.dst == 10.10.10.10' | wc -l

# ACK bit set.
tshark -r task7-live.pcapng -Y 'tcp.flags.ack == 1' | wc -l
```

**Room reference answers:**

| Question | Reference answer |
|---|---|
| How many packets have the SYN bit set? | `2` |
| How many packets are sent to `10.10.10.10`? | `7` |
| How many packets have the ACK bit set? | `8` |

**Reproducibility note:** These are the published exercise answers. Live counts can vary because of timing, retransmissions, interface selection, and whether the connection succeeds. No Task 7 screenshot was supplied with this session, so these figures should not be presented as measurements from my captured evidence.

## Task 8 — TShark Fundamentals V: Display Filters

**Objective:** Query the saved `demo.pcapng` file with Wireshark-style display filters.

The key distinction is that filtering changes the **displayed set** but does not change the original frame numbers. Pipe to `nl` to count and inspect matching output lines. For a count without the output, use `wc -l`.

### 8.1 — Traffic involving a particular IP address

```bash
tshark -r demo.pcapng -Y 'ip.addr == 65.208.228.223' | nl
```

This matches packets where the address appears either as the source or destination. The lab screenshot shows 34 filtered lines.

**Question — How many packets involve `65.208.228.223`?**  
**Answer:** `34`



![34 matching packets involving the requested IP address](/writeups/evidence/thm-tshark-the-basics/06-display-filter-ip-address.jpg "Filtering packets with ip.addr == 65.208.228.223")



### 8.2 — Traffic involving TCP port 3371

```bash
tshark -r demo.pcapng -Y 'tcp.port == 3371' | nl
```

The filter matches packets where port 3371 is either the source port or the destination port.

**Question — How many packets use TCP port `3371`?**  
**Answer:** `7`



![Seven TCP packets using port 3371](/writeups/evidence/thm-tshark-the-basics/07-display-filter-tcp-port.jpg "Filtering by TCP port with tcp.port == 3371")



### 8.3 — Traffic from a particular source IP

```bash
tshark -r demo.pcapng -Y 'ip.src == 145.254.160.237' | nl
```

Unlike `ip.addr`, `ip.src` restricts matching to the **source address**.

**Question — How many packets originate from `145.254.160.237`?**  
**Answer:** `20`



![Twenty frames sourced from 145.254.160.237; frame 37 carries a duplicate acknowledgment](/writeups/evidence/thm-tshark-the-basics/08-display-filter-source-and-duplicate-ack.jpg "Filtering by source IP and identifying duplicate ACK frame 37")



### 8.4 — Identify the duplicate acknowledgment

While reviewing the previous output, the relevant line identifies `TCP Dup ACK 28#1` in original frame 37.

```bash
# Isolate TShark's duplicate-ACK analysis markers.
tshark -r demo.pcapng \
  -Y 'ip.src == 145.254.160.237 && tcp.analysis.duplicate_ack'
```

**Question — Which packet is marked as a duplicate?**  
**Answer:** `37`

Do not confuse a **TCP duplicate ACK** with a **TCP spurious retransmission**. They are distinct TCP analysis indicators. Also note that the first column generated by `nl` is only the position in the filtered output; the frame number reported by TShark is the identifier to submit.

## Task 9 — Conclusion

The room establishes a reproducible CLI workflow for packet inspection:

1. **Validate the capture.** Use `capinfos` to record file metadata and digest values.
2. **Understand the environment.** Confirm the installed TShark version and available capture interfaces.
3. **Inspect packets.** Read the file, isolate frame numbers, and extract protocol fields.
4. **Choose the correct filtering stage.** Use `-f` while capturing and `-Y` to display or analyze selected packets.
5. **Automate repetitive checks.** Chain TShark with Unix utilities to count packets and identify anomalies.

### Final answer reference

| Task | Question / item | Answer |
|---|---|---|
| 2 | RIPEMD160 digest | `6ef5f0c165a1db4a3cad3116b0c5bcc0cf6b9ab7` |
| 3 | Installed version | `3.2.3` |
| 3 | Available interfaces | `12` |
| 4 | Packet 29 flags | `PSH, ACK` |
| 4 | Packet 25 acknowledgment number | `12421` |
| 4 | Packet 9 window size | `9660` |
| 5 | Continuous capture / ring buffer | `-b` |
| 5 | Combine autostop and ring buffer | `y` |
| 6 | Capture filter option | `-f` |
| 6 | Display filter option | `-Y` |
| 7 | SYN packets (reference capture) | `2` |
| 7 | Packets to `10.10.10.10` (reference capture) | `7` |
| 7 | ACK packets (reference capture) | `8` |
| 8 | IP address `65.208.228.223` | `34` |
| 8 | TCP port `3371` | `7` |
| 8 | Source IP `145.254.160.237` | `20` |
| 8 | Duplicate ACK packet number | `37` |

### Quick-reference cheatsheet

```bash
capinfos demo.pcapng
tshark -v
tshark -D
tshark -r demo.pcapng
tshark -r demo.pcapng -Y 'frame.number == 29'
tshark -r demo.pcapng -Y 'ip.addr == 65.208.228.223' | wc -l
tshark -r demo.pcapng -Y 'tcp.port == 3371' | wc -l
tshark -r demo.pcapng -Y 'ip.src == 145.254.160.237' | wc -l
```

### References and attribution

- [TryHackMe — TShark: The Basics](https://tryhackme.com/room/tsharkthebasics) — room task names and learning objectives.
- [Wireshark — TShark manual](https://www.wireshark.org/docs/man-pages/tshark.html) — authoritative CLI parameter documentation.
- [Wireshark — Capinfos manual](https://www.wireshark.org/docs/man-pages/capinfos.html) — metadata, statistics, and hashes.
- [Community answer cross-check](https://github.com/thmrevenant/tryhackme/blob/main/rooms/tshark%20the%20basics.txt) — independently published values for room answers not shown in my screenshots.

**Disclosure:** This write-up is an original technical explanation informed by my terminal screenshots, the official documentation, and the publicly available room-answer cross-check above. The Task 7 examples are presented as reproducible procedures plus reference answers, not as evidence from a capture performed during this session.
