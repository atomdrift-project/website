.PHONY: run build clean install deploy deploy-cf

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

deploy: deploy-cf

deploy-cf: build
	npx wrangler pages deploy _site --project-name atomdrift

node_modules: package.json
	npm install
	touch node_modules
