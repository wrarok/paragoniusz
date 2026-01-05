Jasne, oto przeformatowany tekst do formatu Markdown (.MD).

---

# Dokument wymagań produktu (PRD) - Paragoniusz

## 1. Przegląd produktu

Paragoniusz to responsywna aplikacja webowa (mobile-first) zaprojektowana w celu uproszczenia procesu śledzenia wydatków osobistych. Głównym celem aplikacji jest zminimalizowanie wysiłku wymaganego do rejestrowania codziennych zakupów, a tym samym pomoc użytkownikom w utrzymaniu kontroli nad domowym budżetem.

Kluczową funkcją, która wyróżnia Paragoniusza, jest asystent AI, który automatyzuje proces wprowadzania danych. Użytkownik może zrobić zdjęcie paragonu i przesłać je do aplikacji. System, wykorzystując technologie OCR i LLM, automatycznie odczyta pozycje, przypisze je do odpowiednich kategorii i zsumuje kwoty, a następnie zaproponuje gotowy wpis do zatwierdzenia. Oczywiście, podstawowa funkcja manualnego dodawania wydatków pozostaje w pełni dostępna jako domyślna ścieżka.

Produkt skierowany jest do osób, które chcą świadomie zarządzać swoimi finansami, ale czują się zniechęcone czasochłonnością i monotonią tradycyjnych metod śledzenia wydatków.

## 2. Problem użytkownika

Główny problem, który rozwiązuje Paragoniusz, można opisać następująco:

> "Chcę kontrolować swoje finanse i wiedzieć, na co wydaję pieniądze, ale ręczne wpisywanie każdego paragonu jest zbyt uciążliwe i czasochłonne. Z tego powodu szybko tracę motywację do regularnego śledzenia wydatków i w konsekwencji tracę kontrolę nad domowym budżetem. Potrzebuję narzędzia, które maksymalnie uprości i przyspieszy ten proces, aby prowadzenie budżetu stało się nawykiem, a nie przykrym obowiązkiem."

## 3. Wymagania funkcjonalne

### 3.1. Uwierzytelnianie i Zarządzanie Kontem

- Rejestracja nowego użytkownika za pomocą adresu e-mail i hasła.
- Logowanie do istniejącego konta.
- Opcja "Zapamiętaj mnie" w formularzu logowania w celu utrzymania sesji.
- Bezpieczne wylogowywanie z aplikacji.
- Możliwość zmiany hasła przez zalogowanego użytkownika w ustawieniach konta.
- Możliwość trwałego usunięcia konta i wszystkich powiązanych z nim danych.
- Hasła użytkowników muszą być przechowywane w formie zahaszowanej.

### 3.2. Panel Główny (Dashboard)

- Wyświetlanie sumarycznej kwoty wydatków poniesionych w bieżącym miesiącu kalendarzowym.
- Prezentacja wykresu kołowego przedstawiającego podział wydatków na 5 najpopularniejszych kategorii oraz kategorię zbiorczą "Inne".
- Wyświetlanie chronologicznej, przewijalnej listy ostatnio dodanych wydatków.
- Dla nowych użytkowników, których konto nie zawiera żadnych wydatków, panel główny powinien wyświetlać czytelny komunikat ("pusty stan") zachęcający do dodania pierwszego wpisu.

### 3.3. Zarządzanie Wydatkami

- Dodawanie wydatku poprzez formularz manualny zawierający pola: kwota, kategoria (wybierana z predefiniowanej listy) oraz data.
- Możliwość edycji istniejącego wydatku (kwota, kategoria, data).
- Możliwość usunięcia istniejącego wydatku.

### 3.4. Asystent AI do Przetwarzania Paragonów

- W formularzu dodawania wydatku musi znajdować się przycisk ("Wypełnij ze zdjęcia") umożliwiający przesłanie pliku graficznego z galerii urządzenia.
- Po przesłaniu zdjęcia, system AI analizuje obraz, rozpoznaje poszczególne pozycje, sugeruje dla nich kategorie i agreguje kwoty w ramach tych samych kategorii.
- Użytkownik jest prezentowany z listą rozpoznanych wydatków (zagregowanych per kategoria) do weryfikacji i ewentualnej korekty przed finalnym zapisem.
- W przypadku, gdy AI nie jest w stanie zidentyfikować kategorii dla danej pozycji, domyślnie przypisuje ją do kategorii "Inne".
- System powinien informować użytkownika o statusie przetwarzania. Maksymalny czas oczekiwania na odpowiedź AI (timeout) wynosi 20 sekund.
- Przed pierwszym użyciem funkcji skanowania, użytkownik musi zostać poinformowany, że zdjęcie zostanie przesłane do zewnętrznych usług w celu analizy i musi wyrazić na to zgodę.
- Zdjęcia paragonów nie są przechowywane na serwerze po zakończeniu procesu przetwarzania.

### 3.5. Kategorie Wydatków

- Aplikacja korzysta z predefiniowanej, zarządzanej po stronie serwera listy kategorii.
- Użytkownicy w wersji MVP nie mają możliwości dodawania, edytowania ani usuwania kategorii.

### 3.6. Obsługa Błędów i Komunikacja

Aplikacja musi w sposób jasny i zrozumiały komunikować błędy, takie jak:

- Przekroczenie limitu czasu przetwarzania paragonu przez AI.
- Niemożność odczytania danych ze zdjęcia.
- Błędy połączenia z serwerem.
- Nieprawidłowe dane logowania.

## 4. Granice produktu

Następujące funkcjonalności świadomie znajdują się poza zakresem wersji MVP:

- Funkcja odzyskiwania zapomnianego hasła.
- Funkcje społecznościowe (np. współdzielenie budżetów, grupy, rodziny).
- Zaawansowane narzędzia do planowania i budżetowania (np. definiowanie limitów na kategorie).
- Rozbudowane filtrowanie, sortowanie i wyszukiwanie wydatków (np. według niestandardowych zakresów dat).
- Integracja z aparatem urządzenia w celu robienia zdjęć paragonów bezpośrednio w aplikacji.
- Możliwość tworzenia i zarządzania własnymi kategoriami przez użytkownika.
- Dedykowany, wieloetapowy proces onboardingu dla nowych użytkowników.
- Wymóg akceptacji regulaminu i polityki prywatności podczas rejestracji (jest to świadome ryzyko projektowe).

## 5. Historyjki użytkowników

### Sekcja 1: Uwierzytelnianie i Zarządzanie Kontem

---

**ID:** `US-001`

**Tytuł:** Rejestracja nowego konta

**Opis:** Jako nowy użytkownik, chcę móc założyć konto w aplikacji przy użyciu mojego adresu e-mail i hasła, aby móc bezpiecznie przechowywać moje dane o wydatkach.

**Kryteria akceptacji:**

- Formularz rejestracji zawiera pola na adres e-mail, hasło i potwierdzenie hasła.
- System waliduje poprawność formatu adresu e-mail.
- System sprawdza, czy hasła w obu polach są identyczne.
- System sprawdza, czy podany adres e-mail nie jest już zarejestrowany.
- Po pomyślnej rejestracji, użytkownik jest automatycznie zalogowany i przekierowany do panelu głównego.

---

**ID:** `US-002`

**Tytuł:** Logowanie do aplikacji

**Opis:** Jako zarejestrowany użytkownik, chcę móc zalogować się do aplikacji przy użyciu mojego e-maila i hasła, aby uzyskać dostęp do moich danych.

**Kryteria akceptacji:**

- Formularz logowania zawiera pola na adres e-mail i hasło.
- W przypadku podania błędnych danych, wyświetlany jest stosowny komunikat o błędzie.
- Po pomyślnym zalogowaniu, użytkownik jest przekierowany do panelu głównego.

---

**ID:** `US-003`

**Tytuł:** Utrzymanie sesji użytkownika

**Opis:** Jako zalogowany użytkownik, chcę, aby aplikacja zapamiętała moją sesję, jeśli zaznaczę opcję "Zapamiętaj mnie", abym nie musiał logować się przy każdej wizycie.

**Kryteria akceptacji:**

- W formularzu logowania znajduje się checkbox "Zapamiętaj mnie".
- Jeśli opcja jest zaznaczona, po zamknięciu i ponownym otwarciu przeglądarki użytkownik pozostaje zalogowany.
- Sesja wygasa po określonym czasie nieaktywności.

---

**ID:** `US-004`

**Tytuł:** Wylogowanie z aplikacji

**Opis:** Jako zalogowany użytkownik, chcę móc się wylogować, aby zabezpieczyć dostęp do mojego konta na współdzielonym urządzeniu.

**Kryteria akceptacji:**

- W interfejsie aplikacji znajduje się przycisk "Wyloguj".
- Po kliknięciu przycisku sesja użytkownika jest kończona, a on sam jest przekierowany na stronę logowania.

---

**ID:** `US-005`

**Tytuł:** Zmiana hasła

**Opis:** Jako zalogowany użytkownik, chcę mieć możliwość zmiany mojego hasła w ustawieniach konta dla celów bezpieczeństwa.

**Kryteria akceptacji:**

- W ustawieniach konta znajduje się formularz zmiany hasła.
- Formularz wymaga podania starego hasła, nowego hasła i jego potwierdzenia.
- Po pomyślnej zmianie hasła, użytkownik otrzymuje komunikat potwierdzający.

---

**ID:** `US-006`

**Tytuł:** Usunięcie konta

**Opis:** Jako użytkownik, chcę mieć możliwość trwałego usunięcia mojego konta i wszystkich moich danych, jeśli zdecyduję się przestać korzystać z aplikacji.

**Kryteria akceptacji:**

- W ustawieniach konta znajduje się opcja "Usuń konto".
- Przed ostatecznym usunięciem, system prosi o potwierdzenie tej operacji.
- Po potwierdzeniu, konto użytkownika i wszystkie jego dane (wydatki) są trwale usuwane z bazy danych.

### Sekcja 2: Panel Główny i Przeglądanie Wydatków

---

**ID:** `US-007`

**Tytuł:** Widok panelu głównego z danymi

**Opis:** Jako użytkownik, po zalogowaniu chcę widzieć na panelu głównym podsumowanie moich wydatków z bieżącego miesiąca, abym mógł szybko ocenić swoją sytuację finansową.

**Kryteria akceptacji:**

- Panel wyświetla całkowitą sumę wydatków z bieżącego miesiąca.
- Panel wyświetla wykres kołowy z podziałem na top 5 kategorii + "Inne".
- Panel wyświetla listę ostatnich wydatków w porządku chronologicznym (od najnowszego).

---

**ID:** `US-008`

**Tytuł:** Widok pustego panelu głównego

**Opis:** Jako nowy użytkownik, który nie dodał jeszcze żadnego wydatku, chcę zobaczyć na panelu głównym zachętę do działania, abym wiedział, co dalej robić.

**Kryteria akceptacji:**

- Jeśli użytkownik nie ma żadnych wydatków, zamiast podsumowania i listy wyświetlany jest komunikat, np. "Nie dodałeś jeszcze żadnych wydatków. Kliknij +, aby zacząć!".
- Wykres i suma wydatków pokazują wartości zerowe.

### Sekcja 3: Zarządzanie Wydatkami

---

**ID:** `US-009`

**Tytuł:** Ręczne dodawanie nowego wydatku

**Opis:** Jako użytkownik, chcę móc szybko i łatwo dodać nowy wydatek ręcznie, podając kwotę, kategorię i datę.

**Kryteria akceptacji:**

- Przycisk `+` jest widoczny w głównym interfejsie.
- Po kliknięciu otwiera się prosty formularz.
- Pola kwoty i daty są wymagane.
- Kategoria jest wybierana z predefiniowanej listy.
- Po zapisaniu, nowy wydatek pojawia się na liście w panelu głównym.

---

**ID:** `US-010`

**Tytuł:** Dodawanie wydatku za pomocą skanu paragonu (wiele pozycji)

**Opis:** Jako użytkownik, chcę przesłać zdjęcie paragonu z wieloma pozycjami z różnych kategorii (np. jedzenie i chemia), aby system automatycznie je rozpoznał, pogrupował i przygotował do zapisu, oszczędzając mój czas.

**Kryteria akceptacji:**

- W formularzu dodawania wydatku jest opcja "Wypełnij ze zdjęcia".
- Użytkownik może wybrać plik graficzny z urządzenia.
- Po przetworzeniu, aplikacja wyświetla listę zagregowanych wydatków (np. Jedzenie: 35.50 zł, Chemia: 15.20 zł).
- Użytkownik może zweryfikować i poprawić kategorie oraz kwoty przed zapisaniem.
- Po zatwierdzeniu, system tworzy osobne rekordy wydatków dla każdej zagregowanej kategorii.

---

**ID:** `US-011`

**Tytuł:** Edycja istniejącego wydatku

**Opis:** Jako użytkownik, chcę móc edytować wcześniej dodany wydatek, jeśli popełniłem błąd podczas jego wprowadzania.

**Kryteria akceptacji:**

- Na liście wydatków każdy element ma opcję edycji (np. po geście "swipe" lub przez menu kontekstowe).
- Opcja edycji otwiera formularz wypełniony danymi wybranego wydatku.
- Po zapisaniu zmian, lista wydatków oraz podsumowanie w panelu głównym są aktualizowane.

---

**ID:** `US-012`

**Tytuł:** Usuwanie istniejącego wydatku

**Opis:** Jako użytkownik, chcę móc usunąć wydatek, który został dodany przez pomyłkę.

**Kryteria akceptacji:**

- Na liście wydatków każdy element ma opcję usunięcia.
- System prosi o potwierdzenie operacji usunięcia.
- Po usunięciu, wydatek znika z listy, a podsumowanie w panelu głównym jest aktualizowane.

---

**ID:** `US-013`

**Tytuł:** Obsługa błędu przetwarzania paragonu

**Opis:** Jako użytkownik, próbując dodać wydatek ze zdjęcia, chcę otrzymać jasny komunikat, jeśli proces się nie powiedzie (np. z powodu nieczytelnego obrazu lub przekroczenia limitu czasu).

**Kryteria akceptacji:**

- Jeśli AI nie zwróci wyniku w ciągu 20 sekund, użytkownikowi wyświetlany jest komunikat o błędzie i sugestia, aby spróbować ponownie lub dodać wydatek ręcznie.
- Podobny komunikat jest wyświetlany, gdy AI nie jest w stanie zinterpretować obrazu.

---

**ID:** `US-014`

**Tytuł:** Zgoda na przetwarzanie danych przez AI

**Opis:** Jako użytkownik dbający o prywatność, przed pierwszym użyciem funkcji skanowania paragonu chcę zostać poinformowany o przetwarzaniu danych i wyrazić na to zgodę.

**Kryteria akceptacji:**

- Przy próbie pierwszego użycia funkcji "Wypełnij ze zdjęcia", pojawia się komunikat informacyjny.
- Dalsze użycie funkcji jest możliwe po zaakceptowaniu zgody (np. przez jednorazowe kliknięcie przycisku "Rozumiem i akceptuję").

## 6. Metryki sukcesu

### 6.1. Cel Funkcjonalny

- **Wskaźnik:** Aplikacja wdrożona i działająca w środowisku produkcyjnym.
- **Miernik:** 100% kluczowych ścieżek użytkownika (rejestracja, logowanie, dodawanie manualne, dodawanie przez AI, edycja, usuwanie) jest w pełni funkcjonalnych i przetestowanych.

### 6.2. Cel Techniczny (Skuteczność AI)

- **Wskaźnik:** Jakość sugestii generowanych przez mechanizm AI.
- **Miernik:** Stosunek liczby pól (kwota, kategoria) skorygowanych przez użytkownika do całkowitej liczby pól zasugerowanych przez AI. Dane będą zbierane anonimowo w backendzie. Celem jest osiągnięcie <20% wskaźnika korekt dla typowych paragonów ze sklepów spożywczych.

### 6.3. Cel Biznesowy/Produktowy (Adopcja funkcji)

- **Wskaźnik:** Użyteczność funkcji skanowania paragonów.
- **Miernik:** Procentowy udział wydatków dodanych za pomocą asystenta AI w stosunku do wszystkich dodanych wydatków. Celem jest osiągnięcie wskaźnika na poziomie >40% w ciągu pierwszych 3 miesięcy po wdrożeniu.

### 6.4. Cel Projektowy

- **Wskaźnik:** Realizacja projektu w założonym czasie.
- **Miernik:** Wdrożenie MVP zgodnie z opisanym zakresem w ciągu 6 tygodni od rozpoczęcia prac deweloperskich.
