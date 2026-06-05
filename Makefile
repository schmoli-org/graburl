SCRIPTS := scripts

.DEFAULT_GOAL := help
.PHONY: help build open test web web-deploy web-publish

# ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Build ─────────────────────────────────────────────────────────────────────

build: ## Build the macOS app (signed)
	pnpm build:mac

open: ## Open the Xcode project
	open GrabURL/GrabURL.xcodeproj

test: ## Run tests
	pnpm test

# ── Web ───────────────────────────────────────────────────────────────────────

web: ## Run Astro dev server for web/ and open browser
	@$(SCRIPTS)/web.sh

web-deploy: ## Deploy web/ to Vercel preview URL
	@$(SCRIPTS)/web-deploy.sh

web-publish: ## Deploy web/ to Vercel production
	@$(SCRIPTS)/web-deploy.sh --prod
