# WhatAPlant 🌿

Application PWA d'analyse intelligente des plantes par photo.

## Stack
- **Frontend** : HTML/CSS/JS (PWA)
- **Backend** : Python Flask
- **Vision** : OpenCV + PlantNet API
- **IA** : Groq (LLaMA 3 70B)
- **Base de données** : SQLite

## Installation

### 1. Clés API
```bash
cp backend/.env.example backend/.env
# Remplir PLANTNET_API_KEY et GROQ_API_KEY dans .env
```
- PlantNet : https://my.plantnet.org/
- Groq : https://console.groq.com/

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Le serveur démarre sur http://localhost:5000

### 3. Frontend
Servir le dossier `frontend/` avec n'importe quel serveur statique :
```bash
cd frontend
python -m http.server 8080
```
Ouvrir http://localhost:8080

## Fonctionnalités
- 📷 Scan via caméra ou import galerie
- 🔬 Prétraitement OpenCV (CLAHE, redimensionnement)
- 🌱 Identification PlantNet (confiance, nom scientifique, famille)
- 🤖 Rapport IA complet (comestibilité, toxicité, médecine, environnement)
- 💬 Chat conversationnel avec l'agent IA
- 📋 Historique des scans avec recherche
- 📊 Dashboard avec graphiques (Chart.js)
