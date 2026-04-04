# Moschee Vereinsverwaltung

SaaS-Lösung für die Verwaltung einer Moschee-Vereinigung in der Schweiz.

## Funktionen

- **Mitgliederverwaltung**: CRUD, CSV-Import, Suche
- **Zahlungen & Quittungen**: Barzahlung erfassen, PDF-Quittung drucken (80mm Thermaldrucker)
- **Kassenbuch**: Mehrere Bücher (Allgemein, Ramadan), automatische und manuelle Einträge
- **Jahresliste**: Mitglieder-Jahresübersicht mit A3-PDF-Export (Albanisch)
- **Bankimport**: CSV-Upload mit halbautomatischer Zuordnung (Fuzzy-Matching)
- **Dashboard**: Kennzahlen auf einen Blick
- **Benutzerverwaltung**: Rollen (Admin, Kassier, Vorstand, Nur Lesen)

## Tech-Stack

- **Backend**: Java 21 + Spring Boot 4 + Spring Security + JWT
- **Frontend**: Angular 19 + Angular Material
- **Datenbank**: PostgreSQL 16
- **PDF**: OpenPDF
- **Build**: Maven (Backend), npm (Frontend)
- **Deployment**: Docker Compose

## Schnellstart

### Voraussetzungen

- Java 21
- Node.js 20+
- Docker & Docker Compose (für PostgreSQL)

### Datenbank starten

```bash
docker compose up -d db
```

### Backend starten

```bash
cd backend
./mvnw spring-boot:run
```

Das Backend läuft auf http://localhost:8080.
Standard-Login: `admin` / `admin123`

### Frontend starten

```bash
cd frontend
npm install
npx ng serve
```

Das Frontend läuft auf http://localhost:4200 (Proxy auf Backend konfiguriert).

### Alles mit Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:4200
- Backend API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html

## Projektstruktur

```
moschee/
├── backend/                    Spring Boot REST API
│   ├── src/main/java/ch/moschee/
│   │   ├── config/             Security, CORS, Exception Handler
│   │   ├── controller/         REST-Controller
│   │   ├── model/
│   │   │   ├── dto/            Request/Response DTOs
│   │   │   ├── entity/         JPA Entities
│   │   │   └── enums/          Enums
│   │   ├── repository/         Spring Data JPA
│   │   ├── security/           JWT Filter, Token Provider
│   │   └── service/            Business-Logik
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/       Flyway SQL
├── frontend/                   Angular SPA
│   └── src/app/
│       ├── core/               Auth, Guards, Interceptors
│       ├── features/           Feature-Komponenten
│       └── layout/             Hauptlayout
├── docker-compose.yml
└── export.csv                  Mitglieder-CSV
```

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | /api/auth/login | Anmelden |
| GET | /api/members | Mitglieder auflisten |
| POST | /api/members/import | CSV-Import |
| POST | /api/payments | Zahlung erfassen |
| GET | /api/receipts/{id}/pdf | Quittung als PDF |
| GET | /api/cashbooks | Kassenbücher auflisten |
| GET | /api/annual-list | Jahresliste |
| GET | /api/annual-list/pdf | Jahresliste als PDF |
| POST | /api/bank-imports | Bankdatei importieren |
| GET | /api/dashboard | Kennzahlen |
