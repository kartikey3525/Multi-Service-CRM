.PHONY: up up-dev down logs check api-test e2e migrate migrate-dev seed seed-dev

up:
	docker compose up --build --wait -d

up-dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --wait -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

check:
	pnpm lint && pnpm typecheck && pnpm test && pnpm build && $(MAKE) api-test

api-test:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T -e MONGODB_TEST_URI=mongodb://db:27017/franchise_crm_test?replicaSet=rs0 api pnpm --filter @franchise-crm/api test:integration

e2e:
	pnpm e2e

migrate:
	docker compose --profile migration run --rm --no-deps migrator

migrate-dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T api pnpm --filter @franchise-crm/api migrate

seed:
	docker compose exec api node apps/api/dist/seed.js

seed-dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T api pnpm --filter @franchise-crm/api seed
