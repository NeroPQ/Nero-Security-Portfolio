"""
NERO.SEC — CTI Collector & PostgreSQL / Grafana Cloud Ingestion Pipeline (Stage 4)
Normalizes NVD (CVSS), FIRST EPSS (Exploit Prediction Scoring System), and CISA KEV
for tracked CVEs, upserts into PostgreSQL (for Grafana Cloud), and exports a static
JSON snapshot (`public/cti-telemetry.json`) for the Astro portfolio.
"""
from __future__ import annotations
import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

TRACKED_CVES = [
    "CVE-2021-44228",  # Log4Shell
    "CVE-2021-4034",   # PwnKit
    "CVE-2022-0847",   # Dirty Pipe
    "CVE-2022-22965",  # Spring4Shell
]

NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
EPSS_API_URL = "https://api.first.org/data/v1/epss"
CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

POSTGRES_DDL = """
CREATE TABLE IF NOT EXISTS cti_vulnerability_metrics (
    cve_id              VARCHAR(32) PRIMARY KEY,
    cwe_id              VARCHAR(32),
    cvss_v3_score       NUMERIC(3, 1),
    cvss_v3_severity    VARCHAR(16),
    cvss_vector         TEXT,
    epss_score          NUMERIC(7, 5),
    epss_percentile     NUMERIC(7, 5),
    in_cisa_kev         BOOLEAN NOT NULL DEFAULT FALSE,
    kev_date_added      DATE,
    kev_due_date        DATE,
    ransomware_use      VARCHAR(32),
    published_at        TIMESTAMPTZ,
    last_modified_at    TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cti_epss_history (
    id                  BIGSERIAL PRIMARY KEY,
    cve_id              VARCHAR(32) NOT NULL REFERENCES cti_vulnerability_metrics(cve_id) ON DELETE CASCADE,
    epss_score          NUMERIC(7, 5) NOT NULL,
    epss_percentile     NUMERIC(7, 5) NOT NULL,
    recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


def fetch_json(url: str, headers: dict[str, str] | None = None, timeout: int = 20) -> dict[str, Any]:
    req_headers = {"User-Agent": "NeroSec-CTI-Collector/1.0 (+https://nero-sec.pages.dev)"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_epss_scores(cve_ids: list[str]) -> dict[str, dict[str, float]]:
    query = urllib.parse.urlencode({"cve": ",".join(cve_ids)})
    data = fetch_json(f"{EPSS_API_URL}?{query}")
    result: dict[str, dict[str, float]] = {}
    for row in data.get("data", []):
        cve = row.get("cve")
        if cve:
            result[cve] = {
                "epss": float(row.get("epss", 0.0)),
                "percentile": float(row.get("percentile", 0.0)),
            }
    return result


def fetch_cisa_kev_catalog() -> dict[str, dict[str, Any]]:
    data = fetch_json(CISA_KEV_URL)
    catalog: dict[str, dict[str, Any]] = {}
    for item in data.get("vulnerabilities", []):
        cve = item.get("cveID")
        if cve:
            catalog[cve] = {
                "dateAdded": item.get("dateAdded"),
                "dueDate": item.get("dueDate"),
                "knownRansomwareCampaignUse": item.get("knownRansomwareCampaignUse", "Unknown"),
                "vulnerabilityName": item.get("vulnerabilityName"),
            }
    return catalog


def fetch_nvd_detail(cve_id: str, api_key: str | None = None) -> dict[str, Any]:
    headers = {"apiKey": api_key} if api_key else None
    url = f"{NVD_API_URL}?{urllib.parse.urlencode({'cveId': cve_id})}"
    data = fetch_json(url, headers=headers)
    vulns = data.get("vulnerabilities", [])
    if not vulns:
        return {}
    cve_obj = vulns[0].get("cve", {})
    metrics = cve_obj.get("metrics", {})
    cvss_list = metrics.get("cvssMetricV31") or metrics.get("cvssMetricV30") or []
    cvss_data = cvss_list[0].get("cvssData", {}) if cvss_list else {}

    weaknesses = cve_obj.get("weaknesses", [])
    cwe_id = None
    for w in weaknesses:
        for desc in w.get("description", []):
            if desc.get("value", "").startswith("CWE-"):
                cwe_id = desc["value"]
                break

    return {
        "cwe_id": cwe_id,
        "cvss_v3_score": cvss_data.get("baseScore"),
        "cvss_v3_severity": cvss_data.get("baseSeverity"),
        "cvss_vector": cvss_data.get("vectorString"),
        "published_at": cve_obj.get("published"),
        "last_modified_at": cve_obj.get("lastModified"),
    }


def upsert_to_postgresql(records: list[dict[str, Any]], database_url: str) -> None:
    """Upsert normalized CTI records into PostgreSQL (Neon / Supabase / RDS) for Grafana Cloud."""
    import psycopg  # pip install "psycopg[binary]"

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(POSTGRES_DDL)
            for r in records:
                cur.execute(
                    """
                    INSERT INTO cti_vulnerability_metrics (
                        cve_id, cwe_id, cvss_v3_score, cvss_v3_severity, cvss_vector,
                        epss_score, epss_percentile, in_cisa_kev, kev_date_added,
                        kev_due_date, ransomware_use, published_at, last_modified_at, synced_at
                    ) VALUES (
                        %(cve_id)s, %(cwe_id)s, %(cvss_v3_score)s, %(cvss_v3_severity)s, %(cvss_vector)s,
                        %(epss_score)s, %(epss_percentile)s, %(in_cisa_kev)s, %(kev_date_added)s,
                        %(kev_due_date)s, %(ransomware_use)s, %(published_at)s, %(last_modified_at)s, NOW()
                    )
                    ON CONFLICT (cve_id) DO UPDATE SET
                        cwe_id = EXCLUDED.cwe_id,
                        cvss_v3_score = EXCLUDED.cvss_v3_score,
                        cvss_v3_severity = EXCLUDED.cvss_v3_severity,
                        cvss_vector = EXCLUDED.cvss_vector,
                        epss_score = EXCLUDED.epss_score,
                        epss_percentile = EXCLUDED.epss_percentile,
                        in_cisa_kev = EXCLUDED.in_cisa_kev,
                        kev_date_added = EXCLUDED.kev_date_added,
                        kev_due_date = EXCLUDED.kev_due_date,
                        ransomware_use = EXCLUDED.ransomware_use,
                        last_modified_at = EXCLUDED.last_modified_at,
                        synced_at = NOW();
                    """,
                    r,
                )
                cur.execute(
                    """
                    INSERT INTO cti_epss_history (cve_id, epss_score, epss_percentile)
                    VALUES (%(cve_id)s, %(epss_score)s, %(epss_percentile)s);
                    """,
                    r,
                )
        conn.commit()


def collect_all(cve_ids: list[str]) -> list[dict[str, Any]]:
    nvd_api_key = os.getenv("NVD_API_KEY")
    epss_map = fetch_epss_scores(cve_ids)
    kev_map = fetch_cisa_kev_catalog()
    records: list[dict[str, Any]] = []

    for idx, cve_id in enumerate(cve_ids):
        if idx > 0 and not nvd_api_key:
            time.sleep(6.2)  # Respect NVD public rate limit (5 requests / 30s without API key)
        nvd = fetch_nvd_detail(cve_id, api_key=nvd_api_key)
        epss = epss_map.get(cve_id, {"epss": 0.0, "percentile": 0.0})
        kev = kev_map.get(cve_id)

        records.append({
            "cve_id": cve_id,
            "cwe_id": nvd.get("cwe_id"),
            "cvss_v3_score": nvd.get("cvss_v3_score"),
            "cvss_v3_severity": nvd.get("cvss_v3_severity"),
            "cvss_vector": nvd.get("cvss_vector"),
            "epss_score": epss["epss"],
            "epss_percentile": epss["percentile"],
            "in_cisa_kev": kev is not None,
            "kev_date_added": kev["dateAdded"] if kev else None,
            "kev_due_date": kev["dueDate"] if kev else None,
            "ransomware_use": kev["knownRansomwareCampaignUse"] if kev else "Unknown",
            "published_at": nvd.get("published_at"),
            "last_modified_at": nvd.get("last_modified_at"),
            "synced_at": datetime.now(timezone.utc).isoformat(),
        })
    return records


if __name__ == "__main__":
    records = collect_all(TRACKED_CVES)
    out_file = Path(__file__).resolve().parent.parent / "public" / "cti-telemetry.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(
        json.dumps({"updatedAt": datetime.now(timezone.utc).isoformat(), "items": records}, indent=2),
        encoding="utf-8",
    )
    print(f"[OK] Exported {len(records)} normalized CVE telemetry records to {out_file}")

    db_url = os.getenv("DATABASE_URL")
    if db_url:
        upsert_to_postgresql(records, db_url)
        print("[OK] Upserted CTI records + EPSS time-series history into PostgreSQL for Grafana Cloud.")
