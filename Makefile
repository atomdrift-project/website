.PHONY: run build clean install deploy deploy-cf

CODEBERG_REMOTE ?= git@codeberg.org:atomdrift/pages.git

install:
	npm install

run: node_modules
	npx eleventy --serve

build: node_modules
	rm -rf _site
	npx eleventy
	npx pagefind --site _site

clean:
	rm -rf _site node_modules package-lock.json

deploy: build
	cd _site && \
	rm -rf .git && \
	git init -q && \
	git add -A && \
	git commit -q -m "Deploy $$(date -u +%Y-%m-%dT%H:%M:%SZ)" && \
	git push -f $(CODEBERG_REMOTE) HEAD:pages

deploy-cf: build
	npx wrangler pages deploy _site --project-name atomdrift

node_modules: package.json
	npm install
	touch node_modules
