.PHONY: up up-dev down logs check api-test mongo-probe e2e migrate migrate-dev seed seed-dev

up:
	docker compose --env-file .env.example up --build --wait -d

up-dev:
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml up --wait -d db redis storage
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml exec -T db mongosh 'mongodb://local_root:local-root-password-change@127.0.0.1:27017/admin?authSource=admin&replicaSet=rs0' --quiet --file /bootstrap-local-mongo.js
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml build api worker web migrator
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml --profile migration run --rm --no-deps migrator
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml up --wait -d

down:
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml down

logs:
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml logs -f --tail=100

check:
	pnpm lint && pnpm typecheck && pnpm test && pnpm build && $(MAKE) api-test && $(MAKE) mongo-probe

api-test:
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml exec -T -e MONGODB_TEST_URI=mongodb://local_root:local-root-password-change@db:27017/crm_test?authSource=admin\&replicaSet=rs0 api pnpm --filter @franchise-crm/api test:integration

mongo-probe:
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml exec -T db mongosh 'mongodb://crm_app:local-app-password-change@127.0.0.1:27017/crm?authSource=admin&replicaSet=rs0' --quiet --file /probe-mongo-authorization.js

e2e:
	pnpm e2e

migrate:
	docker compose --env-file .env.example build migrator
	docker compose --env-file .env.example --profile migration run --rm --no-deps migrator

migrate-dev:
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml build migrator
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml --profile migration run --rm --no-deps migrator

seed:
	docker compose --env-file .env.example exec api node apps/api/dist/seed.js

seed-dev:
	docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml exec -T api pnpm --filter @franchise-crm/api seed
