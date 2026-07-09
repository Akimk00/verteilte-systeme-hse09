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

## Repository layout

```
wordle-app/
├── docker-compose.yml            # starts all three tiers with one command
├── k8s/                          # Kubernetes manifest
│   ├── wordle-stack.yaml         
├── backend/
│   ├── Dockerfile                # multi-stage: Maven build -> JRE runtime
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/example/wordle/
│       │   ├── WordleApplication.java
│       │   ├── model/Word.java
│       │   ├── repository/WordRepository.java
│       │   ├── service/WordService.java
│       │   ├── controller/WordController.java
│       │   ├── dto/WordResponse.java
│       │   └── config/WebConfig.java
│       └── resources/
│           ├── application.properties    # datasource overridable via env vars
│           ├── schema.sql
│           └── data.sql
└── frontend/
    ├── Dockerfile                # multi-stage: Node build -> nginx runtime
    ├── nginx.conf                # serves Angular, proxies /api to the backend
    ├── proxy.conf.json           # dev-server proxy for local development
    ├── package.json
    ├── angular.json
    ├── tsconfig.app.json
    ├── tsconfig.json
    └── src/
        ├── index.html
        ├── styles.css
        ├── main.ts
        └── app/
            ├── app.config.ts
            ├── app.routes.ts
            ├── app.component.ts / .html
            ├── game.service.ts
            ├── start/start.component.ts / .html / .css
            ├── game/game.component.ts / .html / .css
            ├── game/
                └── game.component.ts /.html / .css
            └── start/
                └── start.component.ts /.html / .css
```

## Option 1: Run everything with Docker Compose

Requires only Docker. One command builds and starts all three tiers:

```bash
docker compose up --build
```

Open `http://localhost:4200`.

**What happens**: Compose starts PostgreSQL first and waits until its healthcheck (`pg_isready`) 
passes. Then it starts the backend (which creates and seeds the `words` table on startup) and 
lastly the frontend. The backend reaches the database at `db:5432` through env variables injected 
by Compose. The browser only ever talks to nginx on port 4200; nginx serves the Angular build 
and forwards every `/api` request internally to `backend:8080`, so no CORS is involved.

Stop with `Ctrl+C`, remove containers with `docker compose down` (add `-v` to also delete the 
database volume).

## Option 2: Run on Kubernetes

Requires a local cluster (Minikube, kind, or the Kubernetes built into Docker Desktop) and `kubectl`.

**Step 1: build the images.** Kubernetes does not build images, it only runs them, 
so build them first. The Compose file tags them with exactly the names the manifests expect:

```bash
docker compose build
```

This produces `wordle-backend:1.0` and `wordle-frontend:1.0`.

**Step 2: make the images visible to the cluster.** A local cluster usually has its own image 
store and cannot see images from your local Docker daemon. Load them in:

```bash
# Minikube
minikube image load wordle-backend:1.0
minikube image load wordle-frontend:1.0

# kind
kind load docker-image wordle-backend:1.0
kind load docker-image wordle-frontend:1.0
```

With Docker Desktop Kubernetes you can skip this step, it shares the Docker daemon. The manifests 
set `imagePullPolicy: IfNotPresent`, so Kubernetes uses the loaded image instead of trying to 
pull it from Docker Hub (where it does not exist).

**Step 3: deploy.**

```bash
kubectl apply -f k8s/
```

The files are number-prefixed so the namespace is created before the resources inside it.

**Step 4: wait until everything is ready.**

```bash
kubectl get pods -n wordle --watch
```

Expected: one `db` pod, two `backend` pod and two `frontend` pods, all `Running` and `READY 1/1`. 
The backend takes the longest because it waits for the database and then boots Spring.

**Step 5: open the app.** The simplest way, works on every cluster type:

```bash
kubectl port-forward -n wordle service/frontend 4200:80
```

Then open `http://localhost:4200`. Alternatives: with Docker Desktop the NodePort is directly 
reachable at `http://localhost:30080`; with Minikube run `minikube service frontend -n wordle`.

**Cleanup:**

```bash
kubectl delete namespace wordle
```

### How the Kubernetes setup works

Everything lives in one **Namespace** called `wordle`, which groups the resources and lets you 
delete the whole application with a single command.

Each tier consists of a **Deployment** and a **Service**. A Deployment describes the desired state: 
which image to run, how many replicas, which environment variables, how much CPU and memory. 
Kubernetes then creates the pods and keeps reality matching that description, so if a pod crashes 
or a node dies, a replacement is started automatically. A Service gives a set of pods one stable, 
cluster-internal DNS name and load-balances across them, which matters because pods are disposable 
and their IPs change.

Service discovery is what wires the three tiers together, and it deliberately mirrors the Compose 
setup. The nginx config inside the frontend image proxies `/api` to `http://backend:8080`, and in 
the cluster `backend` resolves via Kubernetes DNS to the backend Service. The backend connects to
`jdbc:postgresql://db:5432/wordle`, where `db` resolves to the database Service. Because the 
Services are named identically to the Compose services, the very same images run unchanged in 
both environments.

The request path for one guess-word round trip: browser -> frontend Service (NodePort 30080 or 
port-forward) -> one of the two nginx pods -> backend Service -> backend pod -> db Service -> 
PostgreSQL pod.

The remaining pieces in the manifests:

- **Secret (`db-credentials`):** holds the database username and password once. Both the PostgreSQL 
pod and the backend pod read their credentials from it via `secretKeyRef`, so the values are 
defined in exactly one place and are not baked into images.

- **PersistentVolumeClaim (`db-data`):** requests 1 Gi of storage from the cluster and mounts it 
into the PostgreSQL pod. Without it, the word table would be wiped every time the database pod 
restarts. The database Deployment uses `strategy: Recreate` because this volume can only be 
mounted by one pod at a time.

- **initContainer (`wait-for-db`):** a tiny busybox container inside the backend pod that polls 
`db:5432` and only exits once the port answers. Only then does the Spring Boot container start, 
which avoids crash-restarts during the first deployment while PostgreSQL is still initializing.

- **Probes:** the backend's readiness probe calls `GET /api/word`, so the pod only receives 
traffic when it can genuinely serve a word from the database. The liveness probe restarts the 
container if the port stops answering. PostgreSQL uses `pg_isready`, the frontend a simple HTTP check.

- **NodePort:** the frontend Service uses `type: NodePort` with fixed port 30080, which exposes it
on the cluster node without needing an Ingress controller. The db and backend Services are ClusterIP
(the default) and stay unreachable from outside, which is exactly right for internal tiers.

Frontend and backend are stateless (no sessions, no local files), so they can be scaled freely. 
The frontend already runs 2 replicas as a demonstration and the Service load-balances between them:

```bash
kubectl scale deployment wordle-frontend -n wordle --replicas=2
kubectl scale deployment wordle-backend -n wordle --replicas=2
```

Useful commands while experimenting: 
- `kubectl get all -n wordle` for an overview, 
- `kubectl logs -n wordle deployment/wordle-backend` for the Spring log, 
- `kubectl describe pod <name> -n wordle` when a pod will not start.

## Option 3: Local development

Run the tiers individually when working on the code. Start only the database in Docker:

```bash
docker compose up -d db
```

Backend (uses the localhost defaults in `application.properties`):

```bash
cd backend
mvn spring-boot:run
```

Frontend with hot reload:

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200`. The dev server forwards `/api` calls to `localhost:8080` via 
`proxy.conf.json`, so the same relative URLs work in dev mode and in containers.

## API

| Method | Path        | Returns                                    |
|--------|-------------|--------------------------------------------|
| GET    | `/api/word` | `{ "word": "crane", "hint": "A tall..." }` |

## How to play

Press **Start game**, then type a 5-letter guess and press Enter. Tiles turn green (right letter, 
right place), yellow (right letter, wrong place) or grey (not in the word). You get six guesses.
Press **Show hint** at any time to reveal the clue.

## Design notes

- **No session handling, by request.** The backend is stateless: it picks a random row and returns
word plus hint, and the Angular client scores the guesses (including correct duplicate-letter 
handling). The word therefore reaches the browser and is visible in dev tools, which is fine for a
game without scoring or storage. Statelessness is also what makes horizontal scaling in Kubernetes
trivially safe.

- **Same images everywhere.** The frontend calls the API under the relative path `/api`. In dev mode
the Angular dev server proxies it, in Docker and Kubernetes nginx proxies it to the service named
`backend`. No environment-specific frontend builds are needed.

- **Guesses are not dictionary-checked.** Any 5-letter input is accepted, since the table only 
holds the playable answers.

- **Schema and seed** live in `backend/src/main/resources/schema.sql` and `data.sql`. Both are 
idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), so backend restarts and multiple replicas
are harmless. Add rows to `data.sql` to extend the word list (each word must be 5 letters).
