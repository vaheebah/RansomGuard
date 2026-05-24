# RansomGuard

## Overview

RansomGuard is an advanced detection platform that identifies threats based on their actions rather than relying on traditional, signature-based lists of known malware. Because it focuses on behavior, the system can successfully catch brand-new or constantly changing ransomware strains that older antivirus software would typically miss.  

To achieve this, RansomGuard brings together several powerful tools into a single, unified platform. This comprehensive setup includes:

* Five different machine learning models working together.


* Live monitoring of folder activity.


* Mathematical (entropy-based) checks on files.


* A database of known threat intelligence.


* Decoy files (honeypots) designed to trap attackers.


* A secure quarantine vault to isolate dangerous files.


* A sleek React dashboard to easily manage and view everything.


## Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Frontend** | React 18 + Tailwind CSS | 6-page dashboard with live data 

 |
| **Charts** | Recharts | AreaChart, BarChart, RadarChart, PieChart, LineChart 

 |
| **Backend** | Flask + Flask-CORS | REST API, 12 endpoints, threaded 

 |
| **Monitoring** | Watchdog + psutil | Real-time file events + system metrics 

 |
| **ML Models** | Scikit-learn | Decision Tree, Random Forest, Gradient Boosting, SVM, MLP 

 |
| **Balancing** | SMOTE (imbalanced-learn) | Handles class imbalance in training data 

 |

## Key Features

* 
**Machine Learning Engine**: Five models trained and compared, using ensemble majority voting across all 5 models for the final prediction. 


* 
**Real-Time Monitoring**: Watchdog monitors any folder recursively for file system events. 


* 
**Entropy Analysis**: Shannon entropy is calculated per file, and values above 7.2/8.0 are flagged as encrypted. 


* 
**Honeypot System**: Bait files are auto-deployed on monitor start, and any access results in an immediate alert. 


* 
**Threat Intelligence**: Features 5 ransomware family profiles and checks suspicious extensions against an IOC database. 


* 
**Quarantine & Response**: Suspicious files are moved to an isolated vault directory, SHA-256 hashed, and obfuscated via XOR to prevent accidental execution. 


* 
**Safe Simulation**: Includes a safe 4-stage attack simulator mimicking reconnaissance, encryption, rename, and ransom note drops without using real malware. 



## Quick Start

### Step 1 — Backend Setup

1. Navigate to the backend directory: `cd ransomware-detector/backend` 


2. Create your virtual environment: `python -m venv venv` 


3. Install dependencies: `pip install -r requirements.txt` 


4. Navigate to the ML folder: `cd ml` 


5. Generate the dataset (one-time): `python generate_dataset.py` 


6. Train all 5 models (one-time): `python train_model.py` 


7. Return to the backend root and start Flask: `cd ..` followed by `python app.py` 



### Step 2 — Frontend Setup

1. Open a new terminal and navigate to the frontend directory: `cd ransomware-detector/frontend` 


2. Install Node packages: `npm install` 


3. Start the React dashboard: `npm start` (opens `http://localhost:3000`) 



### Step 3 — Run the Demo

1. Open a third terminal and navigate to the simulation folder: `cd ransomware-detector/simulation` 


2. Run the simulator: `python simulate_ransomware.py --intensity high` 


3. Watch the RansomGuard dashboard detect and alert in real time! 



---

**Disclaimer**: The simulation script provided (`simulate_ransomware.py`) is completely safe and mimics what ransomware does WITHOUT being actual malware. Never use real ransomware samples with this environment.

