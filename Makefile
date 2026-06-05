SCRIPTS := scripts

.DEFAULT_GOAL := help
.PHONY: help build open test clean certs release promote web web-deploy web-publish

help: ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} \
	  /^##@/ {printf "\n\033[1m%s\033[0m\n", substr($$0, 5)} \
	  /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

##@ Build

build: ## Build the macOS app (signed)
	pnpm build:mac

open: ## Open the Xcode project
	open GrabURL/GrabURL.xcodeproj

test: ## Run tests
	pnpm test

clean: ## Remove all build artifacts and unregister the Safari extension from PluginKit
	rm -rf build
	@pluginkit -m -v -i com.schmoli.graburl.Extension 2>/dev/null | awk -F'\t' 'NF > 1 {print $$NF}' | while IFS= read -r p; do \
	  pluginkit -r "$$p" && echo "unregistered: $$p"; \
	done

##@ Release

certs: ## Sync App Store signing certificates via match
	bundle exec fastlane certs

release: ## Build, upload to TestFlight, distribute to internal 'auto' group
	bundle exec fastlane release

promote: ## Promote latest TestFlight build to external 'beta' (CHANGELOG="<what to test>")
	bundle exec fastlane promote

##@ Web

web: ## Run Astro dev server for web/ and open browser
	@$(SCRIPTS)/web.sh

web-deploy: ## Deploy web/ to Vercel preview URL
	@$(SCRIPTS)/web-deploy.sh

web-publish: ## Deploy web/ to Vercel production
	@$(SCRIPTS)/web-deploy.sh --prod
