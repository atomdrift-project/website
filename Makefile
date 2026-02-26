.PHONY: run build clean install deploy

CODEBERG_REMOTE ?= git@codeberg.org:atomdrift/pages.git

install:
	npm install

run: node_modules
	npx eleventy --serve

build: node_modules
	rm -rf _site
	npx eleventy

clean:
	rm -rf _site node_modules package-lock.json

deploy: build
	cd _site && \
	rm -rf .git && \
	git init -q && \
	git add -A && \
	git commit -q -m "Deploy $$(date -u +%Y-%m-%dT%H:%M:%SZ)" && \
	git push -f $(CODEBERG_REMOTE) HEAD:pages

node_modules: package.json
	npm install
	touch node_modules
