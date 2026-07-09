# Custom Wordle

A word-guessing game built as a 3-tier application.

```
Angular (nginx)  ->  Spring Boot REST API  ->  PostgreSQL
  presentation         application               data
```

## Tiers

- **Database (PostgreSQL):** one table, `words`, with two columns: `word` and `hint`.
- **Backend (Spring Boot, MVC):** `model` (the `Word` entity), `repository`, `service`, `controller`, plus a `dto` and CORS `config`. Exposes a single endpoint that returns a random word and its hint.
- **Frontend (Angular):** a start screen and the game board. Each component is split into separate `.ts`, `.html` and `.css` files. In containers it is served by nginx, which also proxies `/api` requests to the backend.

## Option 1: Run everything with Docker Compose

```bash
docker compose up --build
```

Open `http://localhost:4200`.

## Option 2: Run on Kubernetes

```bash
kubectl apply -f wordle-stack.yaml
```

## API

| Method | Path        | Returns                                    |
|--------|-------------|--------------------------------------------|
| GET    | `/api/word` | `{ "word": "crane", "hint": "A tall..." }` |

## How to play

Press **Start game**, then type a 5-letter guess and press Enter. Tiles turn green (right letter, right place), yellow (right letter, wrong place) or grey (not in the word). You get six guesses. Press **Show hint** at any time to reveal the clue.

