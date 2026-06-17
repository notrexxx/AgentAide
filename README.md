# Agent Aide

An enterprise-grade, offline-first mobile application designed specifically for real estate agents to manage properties, track guest stays, and parse flight itineraries locally.

## Architecture & Tech Stack

* **Framework:** React Native / Expo Router
* **Language:** TypeScript
* **Local Storage Engine:** Expo SQLite (Synchronous WAL Mode)
* **Target Platforms:** iOS & Android (Offline First)

## Database Schema Highlights

The application relies on a strictly typed, relational SQLite database running locally on the device to ensure absolute privacy and zero-latency reads. 
* **Properties Table:** Stores Airbnb and standard rental assets.
* **Stays Table:** Relational table linked via Foreign Keys (`ON DELETE CASCADE`) to track incoming guests, flight information, and specific property assignments.