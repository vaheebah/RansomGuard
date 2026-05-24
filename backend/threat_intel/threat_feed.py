
"""
threat_feed.py  —  Local threat intelligence: known ransomware signatures,
                   file hash reputation, and IOC (Indicator of Compromise) database.
"""

import json
import hashlib
import os
from datetime import datetime

# Known ransomware extension IOCs
KNOWN_RANSOMWARE_EXTENSIONS = {
    ".locked", ".crypt", ".encrypted", ".enc", ".crypto",
    ".cerber", ".locky", ".wnry", ".wncry", ".wcry", ".zepto",
    ".darkness", ".kimcilware", ".cryptolocker", ".cryp1", ".crypz",
    ".zzzzz", ".ezz", ".exx", ".ecc", ".aaa", ".abc", ".xyz",
    ".micro", ".vvv", ".ttt", ".mp3", ".xxx",
}

RANSOMWARE_FAMILIES_INFO = {
    "WannaCry": {
        "year": 2017,
        "vector": "SMB exploit (EternalBlue)",
        "ransom": "$300-600 BTC",
        "affected": "150+ countries",
        "extensions": [".wnry", ".wncry", ".wcry"],
        "severity": "CRITICAL",
    },
    "LockBit": {
        "year": 2019,
        "vector": "RDP brute force / phishing",
        "ransom": "$1M+ avg",
        "affected": "Ongoing (LockBit 3.0 active)",
        "extensions": [".lockbit"],
        "severity": "CRITICAL",
    },
    "Ryuk": {
        "year": 2018,
        "vector": "TrickBot/Emotet dropper",
        "ransom": "$100K-500K",
        "affected": "Hospitals, enterprises",
        "extensions": [".ryuk"],
        "severity": "CRITICAL",
    },
    "Cerber": {
        "year": 2016,
        "vector": "Email spam, exploit kits",
        "ransom": "1.24 BTC",
        "affected": "Enterprise & consumer",
        "extensions": [".cerber", ".cerber2", ".cerber3"],
        "severity": "HIGH",
    },
    "Conti": {
        "year": 2020,
        "vector": "Phishing, RDP",
        "ransom": "$500K-25M",
        "affected": "Healthcare, govt",
        "extensions": [".conti"],
        "severity": "CRITICAL",
    },
}

IOCS = [
    {
        "type": "process",
        "value": "vssadmin.exe delete shadows",
        "severity": "CRITICAL",
        "desc": "Shadow copy deletion — common ransomware pre-step",
    },
    {
        "type": "process",
        "value": "bcdedit /set recoveryenabled No",
        "severity": "CRITICAL",
        "desc": "Disables Windows recovery",
    },
    {
        "type": "network",
        "value": "Tor C2 connection",
        "severity": "HIGH",
        "desc": "Ransomware command & control",
    },
    {
        "type": "file",
        "value": "README_DECRYPT.txt",
        "severity": "HIGH",
        "desc": "Ransom note filename",
    },
    {
        "type": "file",
        "value": "HOW_TO_DECRYPT.html",
        "severity": "HIGH",
        "desc": "Ransom note filename",
    },
    {
        "type": "registry",
        "value": r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
        "severity": "MEDIUM",
        "desc": "Persistence mechanism",
    },
]


def check_extension(ext: str) -> dict:
    is_known = ext.lower() in KNOWN_RANSOMWARE_EXTENSIONS

    return {
        "extension": ext,
        "is_ransomware_ioc": is_known,
        "severity": "CRITICAL" if is_known else "CLEAN",
        "description": (
            "Known ransomware extension"
            if is_known
            else "No match in IOC database"
        ),
    }


def get_threat_summary() -> dict:
    return {
        "total_families": len(RANSOMWARE_FAMILIES_INFO),
        "total_iocs": len(IOCS),
        "known_extensions": len(KNOWN_RANSOMWARE_EXTENSIONS),
        "families": RANSOMWARE_FAMILIES_INFO,
        "iocs": IOCS,
        "last_updated": "2024-12-01",
        "feed_version": "3.1.0",
    }


