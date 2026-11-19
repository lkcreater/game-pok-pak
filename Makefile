.PHONY: help install dev build start test lint typecheck hook-test check clean

help: ## list targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-10s %s\n", $$1, $$2}'

install: ## install dependencies
	npm install

dev: ## dev server on http://localhost:3000
	npm run dev

build: ## production build
	npm run build

start: build ## serve the production build
	npm run start

test: ## unit tests (vitest)
	npm test

lint: ## eslint
	npm run lint

typecheck: ## tsc --noEmit
	npx tsc --noEmit

hook-test: ## self-test for the Claude docs Stop hook
	bash .claude/hooks/docs-check.test.sh

check: typecheck lint test hook-test ## everything CI would run

clean: ## remove build output
	rm -rf .next
