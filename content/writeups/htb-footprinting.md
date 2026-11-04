## Objective and methodology

Footprinting focuses on discovering accessible services, identifying their protocols and configurations, and extracting useful information during an authorized assessment. Service enumeration is not equivalent to vulnerability exploitation.

## Sections covered in my practice

The documented exercises and discussions involved FTP, SMB, NFS, DNS, SMTP, IMAP/POP3, SNMP, MySQL, MSSQL, Oracle TNS, IPMI, SSH, RDP and WinRM. The historical conversations support practical exposure to these topics but do not establish completion of the entire HTB Academy module.

## Hard lab — Mail services

Recovered notes describe a training host exposing SSH and several mail-related ports, including POP3/IMAP and their TLS variants. The investigation began with service identification and then focused on the behavior of the identified mail protocols. A final verified flag was not recovered.

## Technical observations

Protocol-specific enumeration is more informative than relying on port numbers alone. SMTP may disclose mail configuration or supported extensions; SMB may reveal shares and access policies; SNMP may expose management information; and database services may reveal version and authentication characteristics.

## Security takeaway

A useful assessment finding includes the service, the observed evidence, the potential security implication and any limitations. Negative results should also be documented; an unsuccessful enumeration attempt does not prove that the service is secure.
