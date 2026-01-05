# Diagram Architektury UI - System Autentykacji

Ten diagram przedstawia kompleksową architekturę komponentów interfejsu użytkownika dla systemu autentykacji w aplikacji Paragoniusz.

```mermaid
flowchart TD
    %% Middleware i Routing
    MW[Middleware<br/>index.ts]

    %% Strony Astro SSR
    subgraph "Strony Publiczne"
        LP[Strona Logowania<br/>login.astro]
        RP[Strona Rejestracji<br/>register.astro]
        GP[Strona Pożegnania<br/>goodbye.astro]
    end

    subgraph "Strony Chronione"
        DP[Dashboard<br/>index.astro]
        SP[Ustawienia<br/>settings.astro]
        EP[Strony Wydatków<br/>expenses/*.astro]
    end

    %% React Islands - Logowanie
    subgraph "Moduł Logowania"
        LF[LoginForm<br/>LoginForm.tsx]
        LH[Hook<br/>useLoginForm]

        subgraph "Komponenty LoginForm"
            LEI[EmailInput]
            LPI[PasswordInput]
            LRM[RememberMeCheckbox]
            LSB[SubmitButton]
            LFE[FormErrorMessage]
            LRL[RegisterLink]
        end
    end

    %% React Islands - Rejestracja
    subgraph "Moduł Rejestracji"
        RF[RegisterForm<br/>RegisterForm.tsx]
        RH[Hook<br/>useRegisterForm]

        subgraph "Komponenty RegisterForm"
            REI[EmailInput]
            RPI[PasswordInput]
            RCPI[ConfirmPasswordInput]
            RPSI[PasswordStrengthIndicator]
            RSB[SubmitButton]
            RLL[LoginLink]
        end
    end

    %% React Islands - Ustawienia
    subgraph "Moduł Ustawień"
        SC[SettingsContainer<br/>SettingsContainer.tsx]

        subgraph "Sekcje Ustawień"
            ST[SettingsTabs]
            AIS[AccountInfoSection]

            subgraph "Zmiana Hasła"
                CPS[ChangePasswordSection]
                CPF[ChangePasswordForm]
                CPH[Hook<br/>useChangePassword]
            end

            subgraph "Usuwanie Konta"
                DZS[DangerZoneSection]
                DAB[DeleteAccountButton]
                DAM[DeleteAccountModal]
                DAH[Hook<br/>useDeleteAccount]
            end
        end

        PH[Hook<br/>useProfile]
    end

    %% Shared Components
    subgraph "Komponenty Współdzielone"
        NB[NavBar<br/>NavBar.tsx]
        UI[Komponenty UI<br/>Shadcn/ui]
    end

    %% Services Layer
    subgraph "Warstwa Serwisów"
        AS[AuthService<br/>auth.service.ts]
        PS[ProfileService<br/>profile.service.ts]
    end

    %% Validation Layer
    subgraph "Warstwa Walidacji"
        LV[login.validation.ts]
        RV[register.validation.ts]
        PV[password.validation.ts]
    end

    %% API Layer
    subgraph "Endpointy API"
        API1[GET /api/profiles/me]
        API2[DELETE /api/profiles/me]
    end

    %% Backend
    SB[(Supabase Auth)]
    DB[(PostgreSQL<br/>auth.users<br/>profiles<br/>expenses)]

    %% Przepływy - Middleware
    MW -->|Sprawdza sesję| DP
    MW -->|Sprawdza sesję| SP
    MW -->|Sprawdza sesję| EP
    MW -.->|Niezalogowany| LP

    %% Przepływy - Strony do komponentów
    LP -->|Renderuje island| LF
    RP -->|Renderuje island| RF
    SP -->|Renderuje island| SC
    DP -->|Zawiera| NB
    SP -->|Zawiera| NB

    %% Przepływy - LoginForm
    LF --> LH
    LF --> LEI
    LF --> LPI
    LF --> LRM
    LF --> LSB
    LF --> LFE
    LF --> LRL
    LH -->|Walidacja| LV
    LH -->|Wywołuje| AS
    LRL -.->|Nawigacja| RP

    %% Przepływy - RegisterForm
    RF --> RH
    RF --> REI
    RF --> RPI
    RF --> RCPI
    RF --> RPSI
    RF --> RSB
    RF --> RLL
    RH -->|Walidacja| RV
    RH -->|Wywołuje| AS
    RLL -.->|Nawigacja| LP

    %% Przepływy - Settings
    SC --> ST
    SC --> AIS
    SC --> CPS
    SC --> DZS
    SC --> PH

    CPS --> CPF
    CPF --> CPH
    CPH -->|Walidacja| PV
    CPH -->|updateUser| SB

    DZS --> DAB
    DAB --> DAM
    DAM --> DAH
    DAH -->|DELETE| API2

    PH -->|GET| API1

    %% Przepływy - NavBar
    NB -.->|Link| SP
    NB -->|Wylogowanie| AS

    %% Przepływy - Services do Backend
    AS -->|signUp| SB
    AS -->|signInWithPassword| SB
    AS -->|signOut| SB
    AS -->|getSession| SB

    PS -->|getProfile| DB
    PS -->|updateProfile| DB
    PS -->|deleteProfile Admin API| SB

    %% Przepływy - API do Services
    API1 --> PS
    API2 --> PS

    %% Przepływy - Backend
    SB -->|Trigger auto-create| DB
    SB -->|JWT tokens| LP
    SB -->|JWT tokens| RP
    SB -->|Weryfikacja| DB

    %% Przepływy sukcesu
    AS -.->|Sukces rejestracji| DP
    AS -.->|Sukces logowania| DP
    AS -.->|Sukces wylogowania| LP
    DAH -.->|Sukces usunięcia| GP

    %% Komponenty UI używane wszędzie
    LF --> UI
    RF --> UI
    SC --> UI
    NB --> UI

    %% Stylizacja węzłów
    classDef publicPage fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef protectedPage fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef reactIsland fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef hook fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef service fill:#fff9c4,stroke:#fbc02d,stroke-width:2px
    classDef validation fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef backend fill:#e0f2f1,stroke:#00796b,stroke-width:3px
    classDef api fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    classDef middleware fill:#f5f5f5,stroke:#616161,stroke-width:2px

    class LP,RP,GP publicPage
    class DP,SP,EP protectedPage
    class LF,RF,SC,CPF,DAM reactIsland
    class LH,RH,CPH,DAH,PH hook
    class AS,PS service
    class LV,RV,PV validation
    class SB,DB backend
    class API1,API2 api
    class MW middleware
```

## Legenda

### Kolory węzłów:

- **Niebieski** - Strony publiczne (dostępne bez logowania)
- **Pomarańczowy** - Strony chronione (wymagają autentykacji)
- **Fioletowy** - React Islands (komponenty interaktywne)
- **Zielony** - Custom Hooks (zarządzanie stanem)
- **Żółty** - Services (logika biznesowa)
- **Różowy** - Walidacja (schematy i funkcje)
- **Turkusowy** - Backend (Supabase + Database)
- **Czerwony** - API Endpoints
- **Szary** - Middleware

### Typy połączeń:

- `-->` Bezpośrednie wywołanie/renderowanie
- `-.->` Nawigacja/przekierowanie
- `==>` Przepływ danych

## Kluczowe przepływy użytkownika

### US-001: Rejestracja

1. User → `/register` → `RegisterForm`
2. `RegisterForm` → `useRegisterForm` → Walidacja (`register.validation.ts`)
3. Hook → `auth.service.ts` → Supabase Auth
4. Supabase → Database trigger → auto-create profile
5. Success → Redirect to `/` (Dashboard)

### US-002, US-003: Logowanie

1. User → `/login` → `LoginForm`
2. `LoginForm` → `useLoginForm` → Walidacja (`login.validation.ts`)
3. Hook → `auth.service.ts` → Supabase Auth
4. Supabase → JWT tokens → localStorage (if rememberMe)
5. Success → Redirect to `/`

### US-004: Wylogowanie

1. User → `NavBar` → button click
2. `NavBar` → `auth.service.ts.logoutUser()`
3. Supabase → Invalidate session → Clear localStorage
4. Success → Redirect to `/login`

### US-005: Zmiana hasła

1. User → `/settings` → `ChangePasswordForm`
2. Form → `useChangePassword` → Walidacja (`password.validation.ts`)
3. Hook → Supabase `auth.updateUser()`
4. Success → Success message

### US-006: Usunięcie konta

1. User → `/settings` → `DeleteAccountModal`
2. Modal → `useDeleteAccount` → `DELETE /api/profiles/me`
3. Endpoint → Supabase Admin API → Delete auth.users
4. Database CASCADE → Delete profile + expenses
5. Success → Logout → Redirect to `/goodbye`

## Aktualizacje wymagane

Zgodnie z specyfikacją autentykacji, następujące komponenty wymagają aktualizacji:

### 1. Middleware (`src/middleware/index.ts`)

- ✅ Obecnie: Dodaje Supabase client do context
- 🔄 Wymagane: Sprawdzanie autentykacji dla chronionych ścieżek

### 2. Dashboard (`src/pages/index.astro`)

- ✅ Obecnie: Sprawdzanie sesji wykomentowane
- 🔄 Wymagane: Odkomentowanie i aktywacja ochrony

### 3. NavBar (`src/components/NavBar.tsx`)

- ✅ Obecnie: Link do ustawień
- 🔄 Wymagane: Dodanie przycisku wylogowania

### 4. Settings (`src/pages/settings.astro`)

- ✅ Już implementowane: Sprawdzanie sesji aktywne

## Podział odpowiedzialności

### Server-Side (Astro Pages):

- Sprawdzanie sesji przed renderowaniem
- Przekierowania na podstawie stanu autentykacji
- Prefetchowanie danych użytkownika
- SEO i pierwsze renderowanie

### Client-Side (React Islands):

- Interaktywne formularze
- Walidacja w czasie rzeczywistym
- Zarządzanie stanem UI
- Obsługa błędów użytkownika

### Services:

- Komunikacja z Supabase Auth
- Mapowanie błędów
- Transformacja danych
- Business logic

### Hooks:

- Enkapsulacja logiki formularzy
- Zarządzanie stanem lokalnym
- Wywołania serwisów
- Obsługa cyklu życia komponentów
