# Shadowskyy — portfolio Minecraft & Discord developera

Statyczna, responsywna strona portfolio przygotowana pod hosting na GitHub Pages. Strona używa czerwono-czarnej kolorystyki, danych kontaktowych Shadowskyy i automatycznie pobiera pluginy oraz serwery z katalogów w publicznym repozytorium GitHub.

## Publikacja na GitHub Pages

1. Wypchnij repozytorium na GitHuba.
2. Wejdź w **Settings → Pages**.
3. Wybierz gałąź `main` oraz katalog główny `/(root)`.
4. Zapisz ustawienia i poczekaj na wygenerowanie adresu strony.

## Avatar

Strona korzysta teraz z Twojego avatara dodanego do głównego katalogu repozytorium:

```text
60628633-03D8-419A-97EE-05950940D86E.png
```

Jeżeli kiedyś zmienisz nazwę pliku z avatarem, podmień ścieżkę w `index.html` w dwóch miejscach: w logo nawigacji oraz w karcie profilu. Zostawiłem też awaryjny fallback do `assets/avatar.svg`, więc jeśli obraz z repo nie załaduje się od razu, strona nadal pokaże zastępczą grafikę.

## Dodawanie pluginu bez edycji kodu strony

Utwórz katalog w `projekty/`, np.:

```text
projekty/BossPlugin/
```

Do środka wrzuć:

- `info.json` — wymagany plik z informacjami o pluginie,
- dowolny plik `.jar` — opcjonalny plik do pobrania, np. `BossPlugin-1.0.0.jar`.

Minimalny `projekty/BossPlugin/info.json`:

```json
{
  "nazwa": "BossPlugin",
  "opis": "Plugin dodający bossy, areny i nagrody dla graczy."
}
```

Pełniejszy przykład `projekty/BossPlugin/info.json`:

```json
{
  "nazwa": "BossPlugin",
  "opis": "Plugin dodający bossy, areny, dropy, cooldowny i nagrody za walkę.",
  "wersja": "1.0.0",
  "technologie": ["Java", "Paper API", "MySQL"]
}
```

Obsługiwane pola dla pluginu:

| Pole | Wymagane | Co robi |
| --- | --- | --- |
| `nazwa` | Tak | Nazwa wyświetlana na kafelku. |
| `opis` | Tak | Krótki opis pluginu. |
| `wersja` | Nie | Pokazuje wersję, np. `v1.0.0`. |
| `technologie` | Nie | Lista technologii/tagów, np. `Java`, `Paper API`, `MySQL`. |

Możesz też użyć angielskich nazw pól: `name`, `description`, `version`, `technologies`.

## Dodawanie serwera bez edycji kodu strony

Utwórz katalog w `serwery/`, np.:

```text
serwery/SerwerMinecraft/
```

Do środka wrzuć:

- `info.json` — wymagany plik z informacjami o serwerze,
- logo serwera — opcjonalnie `logo.png`, `logo.jpg`, `logo.jpeg`, `logo.webp` albo `logo.svg`.

Minimalny `serwery/SerwerMinecraft/info.json`:

```json
{
  "nazwa": "SerwerMinecraft",
  "opis": "Autorski serwer survival z elementami RPG."
}
```

Pełniejszy przykład `serwery/SerwerMinecraft/info.json`:

```json
{
  "nazwa": "SerwerMinecraft",
  "opis": "Autorski serwer survival z questami, ekonomią i eventami sezonowymi.",
  "tryb": "Survival + RPG",
  "adres": "play.example.pl",
  "status": "W produkcji",
  "tagi": ["Survival", "RPG", "Eventy"],
  "strona": "https://example.pl"
}
```

Obsługiwane pola dla serwera:

| Pole | Wymagane | Co robi |
| --- | --- | --- |
| `nazwa` | Tak | Nazwa wyświetlana na kafelku. |
| `opis` | Tak | Krótki opis serwera. |
| `tryb` | Nie | Tryb serwera, np. `Survival + RPG`. |
| `adres` | Nie | Adres IP/domena serwera, np. `play.example.pl`. |
| `status` | Nie | Status projektu, np. `Online`, `W produkcji`, `Beta`. |
| `tagi` | Nie | Lista tagów, np. `Survival`, `RPG`, `Eventy`. |
| `strona` | Nie | Link do strony serwera; jeśli istnieje, pojawi się przycisk. |

Możesz też użyć angielskich nazw pól: `name`, `description`, `mode`, `address`, `tags`, `website`.

## Przykładowa struktura repo

```text
Portfolio/
├─ index.html
├─ styles.css
├─ script.js
├─ 60628633-03D8-419A-97EE-05950940D86E.png
├─ projekty/
│  └─ BossPlugin/
│     ├─ info.json
│     └─ BossPlugin-1.0.0.jar
└─ serwery/
   └─ SerwerMinecraft/
      ├─ info.json
      └─ logo.png
```

## Ważne informacje techniczne

- Strona działa statycznie na GitHub Pages.
- Lista pluginów i serwerów jest pobierana przez publiczne GitHub API z repozytorium `shadowskyy/Portfolio`.
- Jeżeli zmienisz nazwę repozytorium, właściciela albo gałąź, zaktualizuj obiekt `REPOSITORY` w `script.js`.
- Foldery projektów i serwerów muszą być w publicznym repozytorium na gałęzi `main`, bo właśnie tę gałąź odczytuje obecna konfiguracja strony.
