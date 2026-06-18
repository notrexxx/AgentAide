# 🏡 AgentAide: Premium Real Estate Workspace

![Platform](https://img.shields.io/badge/Platform-iOS_%7C_Android-000000?style=for-the-badge&logo=apple&logoColor=white)
![Expo](https://img.shields.io/badge/Framework-Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/UI-React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

<div align="center">
  <img src="https://raw.githubusercontent.com/notrexxx/AgentAide/main/assets/images/hero-image.png" alt="AgentAide Mobile Dashboard" width="400" />
</div>
<br />

A hyper-modern, offline-first mobile application designed specifically for real estate agents. It allows professionals to completely manage physical property assets, track upcoming guest itineraries, and automate client communication using a highly optimized native interface. Powered by a decoupled local architecture, it features an on-device relational SQLite database, automated regex clipboard parsing, and native OS media sharing.

## ✨ Features Achieved

- **100% Offline-First Architecture:** Complete operational capacity without an internet connection. Relational data is instantly persisted using Expo SQLite configured in synchronous WAL (Write-Ahead Logging) mode for zero-latency queries.
- **Local Media Engine:** Advanced on-device file system management. Bypasses volatile OS cache directories to securely copy, store, and relationally map infinite un-cropped, high-resolution photos directly to the app's isolated sandbox. Includes an interactive "Cover Photo" star engine.
- **Regex Parsing Engine:** Instantly extracts flight numbers, arrival dates, and passenger counts from messy airline emails via direct native clipboard integration.
- **Advanced WhatsApp Dispatch:** Context-aware communication. Features dual-action Deep Linking to dispatch logistical data to drivers and hospitality details to clients natively. Includes Expo Sharing integration to securely export local property photos and text dossiers to native OS Share Sheets.
- **Hyper-Modern UI/UX:** Built with React Native and Expo Router. Features dynamic Hero components, safe-area boundary contexts, absolute-positioned geometric accents, seamless native stack transitions, and a dark/light minimalist color palette.
- **Dynamic Status Derivation:** Eliminates data-sync bugs by dynamically deriving property occupancy statuses (Booked vs. Vacant) via relational `LEFT JOIN` queries instead of static database columns.

## ⚙️ Runtimes, Engines, and Tools

To run this project locally, the following environment is required:

### Runtimes & Package Managers
- **Node.js:** `v24.14.0`
- **npm:** `v11.16.0`
- **OS**: Windows, macOS, or Linux

### Core Dependencies & Native Modules
- **Framework:** React Native `v0.81.5`, Expo SDK `v54.0.0` (CLI `v54.0.25`), React `v19.1.0`
- **Navigation:** Expo Router `v6.0.24`
- **Database Engine:** Expo SQLite `v16.0.10`
- **Native APIs:** Expo File System `v19.0.23`, Expo Image Picker `v17.0.11`, Expo Clipboard, Expo Sharing

## 🚀 How to Run Locally

### 1. Clone the repository
```bash
git clone [https://github.com/notrexxx/AgentAide.git](https://github.com/notrexxx/AgentAide.git)
cd AgentAide
```

### 2. Install Dependencies
Open a terminal and install the Node modules:
```bash
npm install
```

### 3. Launch the Mobile Bundler
Start the Expo Metro Bundler (clearing the cache is recommended for fresh native module links):
```bash
npx expo start --clear
```
*Note: Scan the generated QR code using the **Expo Go** app on your physical iOS or Android device to experience the native file system and WhatsApp deep linking features properly.*

## 🗄️ Local Database Schema

The application utilizes a custom synchronous SQLite initialization script to automatically generate and migrate three core relational tables:

* `properties`: The root asset entity, storing locations, max capacities, and descriptions.
* `property_media`: The native file sandbox registry. Tracks local device URIs and maintains a Many-to-One relationship with properties, featuring an `isMain` boolean for dynamic UI dashboard banners.
* `stays`: The atomic itinerary entity. Tracks flight logs, arrival dates, and guest counts, executing `ON DELETE CASCADE` foreign keys tied to the parent property.

## Author

👤 **Andres Leon**

- GitHub: [@notrexxx](https://github.com/notrexxx)
- LinkedIn: [Emigdio Leon](https://linkedin.com/in/emigdio-leon-689109195)