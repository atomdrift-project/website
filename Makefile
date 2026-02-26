.PHONY: run build clean install deploy

install:
	npm install

run: node_modules
	npx eleventy --serve

build: node_modules
	npx eleventy

clean:
	rm -rf _site node_modules package-lock.json

deploy: build
	npx wrangler deploy

node_modules: package.json
	npm install
	touch node_modules
