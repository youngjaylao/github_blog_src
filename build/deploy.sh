#!/usr/bin/env sh

set -e

npm run build

cd dist

git init
git config user.name 'youngjaylao'
git config user.email '1597374034@qq.com'
git add -A
git commit -m 'deploy'

git push -f git@github.com:youngjaylao/github_blog_src.git master:gh-pages

cd -
