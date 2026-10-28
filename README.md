## Sugarcube Web Client

-   [Developing](#developing)
-   [Getting Started](#getting-started)
-   [Testing](#testing)
-   [Localization](#localization)
-   [Links](#links)

## Developing

### Branching model

#### To develop a new feature:

1. Create a new feature branch off of `main`, include the Jira ticket id when applicable (myFeature-WALL-123)
2. Commit your code and push the branch up to Github
3. Make a pull request (or draft pull request) pointed at `main`
4. Once tested, reviewed, and approved, you can merge your PR into `main`
5. In Buildkite, the release manager can hit the button to release `main` to production

#### To view your changes:

There are a number environments in which to view your changes:

-   Locally
    -   By building the project on your machine
    -   This points to the dev server environment
-   Cloudflare preview environments
    -   When a PR is created, a cloudflare preview build is automatically deployed and a link to it is added to the PR
    -   For example: <https://branching-wall-1868.sugarcube-client.pages.dev/>
    -   These builds point to the dev server environment
    -   These builds are not embedded on ikea.com via an iframe and therefore do not support some features
    -   Some parts of the application will work differently
    -   This is not a realistic representation of what users will experience
-   Ingka CTE
    -   This is a protected environment that Inkga uses for testing their upcoming releases and is a system that we tie into
    -   Ingka login is required (you must be an employee or long-term contractor to login)
    -   <https://www.cte.ikeadt.com/us/en/home-design/>
    -   This points to the dev server environment
    -   This does wrap Sugarcube in an iframe and enables all features
    -   Points to the dev build of Sugarcube (`main` branch, dev build, dev server environment)
-   CTE + preview branch (deprecated)
    -   To test your branch in CTE without merging to `main`, you can pass in your branch name as a url param
    -   For example: <https://www.cte.ikeadt.com/us/en/home-design/room/?branch=branching-wall-1868#12200/44674>
    -   Note that the branch name is not your Github branch name, but rather the potentially shortened name assigned to your preview environment by Cloudflare
-   Staging (deprecated)
    -   The last place to preview any changes before they hit production is to point ikea.com to the staged build of the `main` branch
    -   This can be accessed via <https://www.ikea.com/us/en/home-design/room/?staging=1#27091/44877> (note the url param)
    -   This loads a production build of `main` and includes everything that has been merged in since the last release
-   Production
    -   It is best practice to test your changes in production as well, just as a final sanity check
    -   <https://www.ikea.com/us/en/home-design/room/#27091/44877>

#### To release changes:

1. Every change should be made via a feature branch
2. Every feature branch should have a PR
3. Every PR must be tested and code reviewed
4. Once a PR is merged into `main`, dev and staging builds are started. The changes can be previewed in the above environments.
5. Once a small collection of changes has been verified, the release manager can promote the staging build to production via Buildkite.

A tool to facilitate writing release notes is provided. Provide the previously released branch and the new to-be-released branch. Example usage: `npm run releasetool -- HOTFIX_rc_20240425.4 HOTFIX_rc_20240509.0`

### Code submission processes and practices

In order to reduce the number of failures in product, below are some practices that the web and graphics team have aligned on:

1. In general, if the code submission is not to fix a critical failure in production, there should be no releases to production on friday, saturday or sunday.
2. In order to make sure there are more personnels around to take care of a critical failure in a submission made to production, devs from different timezone should merge to production in US California time zone.
3. Once a PR is merged to production, it is recommended that the dev waits until build kite finishes the build and the feature is live. Validate the feature on production.
4. If devs are working on the same file or function that could cause conflicts, it should be communicated during scrum/sprint meetings. The devs can create a separate branch which combines the work of one or more devs and resolve any conflicts there.
5. Devs need to run automatic pixel compare tests on their local machine and post images of test compares as a proof of dev due diligence when creating a PR for review.

## Web Frontend Team Codebase Guidelines and PR Review Checklist

To maintain consistency throughout the code written by the Frontend team, [this set](https://geomagical.atlassian.net/l/cp/5cXG0KVV) of guidelines should be observed when writing and reviewing code.

## Getting started

### Before you start

The following should be setup for you automatically (see `.npmrc`), but if you
are getting errors, then you can do so manually:

Run `npm set @ingka:registry https://npm.m2.blue.cdtapps.com` once to add Ingka's public npm registry. We use some of their components in Sugarcube.

Run `npm set @geomagical:registry=https://us-central1-npm.pkg.dev/geomagical-prod/geomagical-js/` once to add Geomagical's private npm registry. We use some of their components in Sugarcube.

### Headless GL setup on Apple Silicon

A transitive dependency we use for testing (`canvas`) doesn't ship a binary for Apple Silicon. You will need to install some dependencies so that `canvas` can build properly during the npm install step for. The package's npm page provides the relevant info in the Compiling section. <https://www.npmjs.com/package/canvas>

If you are using a Mac with Apple Silicon, here are the instructions for installing the `headlessgl` package with its dependencies:

1. Install homebrew
2. Run `brew install pyenv`
3. Add the following to your shell profile:
    - `export PYENV_ROOT="$HOME/.pyenv"`
    - `command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"`
    - `eval "$(pyenv init -)"`
4. Open a new shell to uptake the profile changes.
5. Run `pyenv install 3.8.13`
6. Run `npm install gl`

<details>
<summary>Troubleshooting</summary>

Watch out for the following error when installing `canvas` dependencieson Mac with Apple Silicon:

```sh
npm ERR! code 1
npm ERR! path /Users/juliano.farias/code/ikea/sugarcube-client/node_modules/canvas
npm ERR! command failed
# long info logs
# ...
npm ERR! Package pixman-1 was not found in the pkg-config search path.
npm ERR! Perhaps you should add the directory containing 'pixman-1.pc'
npm ERR! to the PKG_CONFIG_PATH environment variable
npm ERR! No package 'pixman-1' found
# more long info logs
```

It can happen with any of canvas dependencies and some more. Note that these lines will be burried inside the error message, so you will need to carefully scan the entire error message to find them.

To fix this, make sure all brew binaries are in your path, specially the ones in `/opt/homebrew/bin`:

```sh
# add this to your .zshrc or .bashrc
export PATH="/opt/homebrew/bin:$PATH"
```

then reinstall the brew dependencies for canvas again as in the canvas installation instructions above.

</details>

### Authenticating our private npm repo

Before you can install packages from the private repo, you will need to
authenticate with our npm repository. For this you will need to download the
gcloud cli tool [here](https://cloud.google.com/sdk/docs/install).

Once installed, you can run:
`gcloud auth login`

_NOTE_: You must authenticate with your Ingka email account, not your geomagical
email account.

Once you have authenticated with gcloud, authenticate with npm using:
`npm run auth`

This will give you an access token to allow downloads from our private npm repo.

_NOTE_: the access tokens are short-lived. If in the future you see 403 errors,
you may need to re-auth using `npm run auth`.

### Local client, remote server

All api calls will be proxied to <https://develop.mysugarcube.com>

1. Navigate to the root directory
2. Run `npm install`
3. Run `npm start`
4. Visit <http://localhost:1080/>

<details>
<summary>Troubleshooting</summary>

Watch out for the following error when `npm install` on Mac with Apple Silicon:

```sh
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: react-server-dom-webpack@0.0.0-experimental-c8b778b7f-20220825
npm warn Found: react@18.2.0
npm warn node_modules/react
npm warn   react@"^18.1.0" from the root project
npm warn   51 more (@floating-ui/react-dom, @gatsbyjs/reach-router, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"0.0.0-experimental-c8b778b7f-20220825" from react-server-dom-webpack@0.0.0-experimental-c8b778b7f-20220825
npm warn node_modules/react-server-dom-webpack
npm warn   react-server-dom-webpack@"0.0.0-experimental-c8b778b7f-20220825" from gatsby@5.7.0
npm warn   node_modules/gatsby
npm warn
npm warn Conflicting peer dependency: react@0.0.0-experimental-c8b778b7f-20220825
npm warn node_modules/react
npm warn   peer react@"0.0.0-experimental-c8b778b7f-20220825" from react-server-dom-webpack@0.0.0-experimental-c8b778b7f-20220825
npm warn   node_modules/react-server-dom-webpack
npm warn     react-server-dom-webpack@"0.0.0-experimental-c8b778b7f-20220825" from gatsby@5.7.0
npm warn     node_modules/gatsby
npm warn cleanup Failed to remove some directories [
npm warn cleanup   [
npm warn cleanup     '/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/sharp',
npm warn cleanup     [Error: ENOTEMPTY: directory not empty, rmdir '/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/sharp'] {
npm warn cleanup       errno: -66,
npm warn cleanup       code: 'ENOTEMPTY',
npm warn cleanup       syscall: 'rmdir',
npm warn cleanup       path: '/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/sharp'
npm warn cleanup     }
npm warn cleanup   ],
npm warn cleanup   [
npm warn cleanup     '/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/sharp',
npm warn cleanup     [Error: ENOTEMPTY: directory not empty, rmdir '/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/sharp'] {
npm warn cleanup       errno: -66,
npm warn cleanup       code: 'ENOTEMPTY',
npm warn cleanup       syscall: 'rmdir',
npm warn cleanup       path: '/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/sharp'
npm warn cleanup     }
npm warn cleanup   ]
npm warn cleanup ]
npm error code 1
npm error path /Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas
npm error command failed
npm error command sh -c node-pre-gyp install --fallback-to-build --update-binary
npm error Failed to execute '/Users/Willian.Lemann/.nvm/versions/node/v18.20.8/bin/node /Users/Willian.Lemann/.nvm/versions/node/v18.20.8/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js configure --fallback-to-build --update-binary --module=/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas/build/Release/canvas.node --module_name=canvas --module_path=/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas/build/Release --napi_version=9 --node_abi_napi=napi --napi_build_version=0 --node_napi_label=node-v108' (1)
npm error node-pre-gyp info it worked if it ends with ok
npm error node-pre-gyp info using node-pre-gyp@1.0.10
npm error node-pre-gyp info using node@18.20.8 | darwin | arm64
npm error node-pre-gyp http GET https://github.com/Automattic/node-canvas/releases/download/v2.11.0/canvas-v2.11.0-node-v108-darwin-unknown-arm64.tar.gz
npm error node-pre-gyp ERR! install response status 404 Not Found on https://github.com/Automattic/node-canvas/releases/download/v2.11.0/canvas-v2.11.0-node-v108-darwin-unknown-arm64.tar.gz
npm error node-pre-gyp WARN Pre-built binaries not installable for canvas@2.11.0 and node@18.20.8 (node-v108 ABI, unknown) (falling back to source compile with node-gyp)
npm error node-pre-gyp WARN Hit error response status 404 Not Found on https://github.com/Automattic/node-canvas/releases/download/v2.11.0/canvas-v2.11.0-node-v108-darwin-unknown-arm64.tar.gz
npm error gyp info it worked if it ends with ok
npm error gyp info using node-gyp@10.1.0
npm error gyp info using node@18.20.8 | darwin | arm64
npm error gyp info ok
npm error gyp info it worked if it ends with ok
npm error gyp info using node-gyp@10.1.0
npm error gyp info using node@18.20.8 | darwin | arm64
npm error gyp info find Python using Python version 3.13.7 found at "/usr/local/bin/python3"
npm error gyp info spawn /usr/local/bin/python3
npm error gyp info spawn args [
npm error gyp info spawn args '/Users/Willian.Lemann/.nvm/versions/node/v18.20.8/lib/node_modules/npm/node_modules/node-gyp/gyp/gyp_main.py',
npm error gyp info spawn args 'binding.gyp',
npm error gyp info spawn args '-f',
npm error gyp info spawn args 'make',
npm error gyp info spawn args '-I',
npm error gyp info spawn args '/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas/build/config.gypi',
npm error gyp info spawn args '-I',
npm error gyp info spawn args '/Users/Willian.Lemann/.nvm/versions/node/v18.20.8/lib/node_modules/npm/node_modules/node-gyp/addon.gypi',
npm error gyp info spawn args '-I',
npm error gyp info spawn args '/Users/Willian.Lemann/Library/Caches/node-gyp/18.20.8/include/node/common.gypi',
npm error gyp info spawn args '-Dlibrary=shared_library',
npm error gyp info spawn args '-Dvisibility=default',
npm error gyp info spawn args '-Dnode_root_dir=/Users/Willian.Lemann/Library/Caches/node-gyp/18.20.8',
npm error gyp info spawn args '-Dnode_gyp_dir=/Users/Willian.Lemann/.nvm/versions/node/v18.20.8/lib/node_modules/npm/node_modules/node-gyp',
npm error gyp info spawn args '-Dnode_lib_file=/Users/Willian.Lemann/Library/Caches/node-gyp/18.20.8/<(target_arch)/node.lib',
npm error gyp info spawn args '-Dmodule_root_dir=/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas',
npm error gyp info spawn args '-Dnode_engine=v8',
npm error gyp info spawn args '--depth=.',
npm error gyp info spawn args '--no-parallel',
npm error gyp info spawn args '--generator-output',
npm error gyp info spawn args 'build',
npm error gyp info spawn args '-Goutput_dir=.'
npm error gyp info spawn args ]
npm error Package pixman-1 was not found in the pkg-config search path.
npm error Perhaps you should add the directory containing `pixman-1.pc'
npm error to the PKG_CONFIG_PATH environment variable
npm error Package 'pixman-1' not found
npm error gyp: Call to 'pkg-config pixman-1 --libs' returned exit status 1 while in binding.gyp. while trying to load binding.gyp
npm error gyp ERR! configure error
npm error gyp ERR! stack Error: `gyp` failed with exit code: 1
npm error gyp ERR! stack at ChildProcess.<anonymous> (/Users/Willian.Lemann/.nvm/versions/node/v18.20.8/lib/node_modules/npm/node_modules/node-gyp/lib/configure.js:297:18)
npm error gyp ERR! stack at ChildProcess.emit (node:events:517:28)
npm error gyp ERR! stack at ChildProcess._handle.onexit (node:internal/child_process:292:12)
npm error gyp ERR! System Darwin 24.6.0
npm error gyp ERR! command "/Users/Willian.Lemann/.nvm/versions/node/v18.20.8/bin/node" "/Users/Willian.Lemann/.nvm/versions/node/v18.20.8/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js" "configure" "--fallback-to-build" "--update-binary" "--module=/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas/build/Release/canvas.node" "--module_name=canvas" "--module_path=/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas/build/Release" "--napi_version=9" "--node_abi_napi=napi" "--napi_build_version=0" "--node_napi_label=node-v108"
npm error gyp ERR! cwd /Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas
npm error gyp ERR! node -v v18.20.8
npm error gyp ERR! node-gyp -v v10.1.0
npm error gyp ERR! not ok
npm error node-pre-gyp ERR! build error
npm error node-pre-gyp ERR! stack Error: Failed to execute '/Users/Willian.Lemann/.nvm/versions/node/v18.20.8/bin/node /Users/Willian.Lemann/.nvm/versions/node/v18.20.8/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js configure --fallback-to-build --update-binary --module=/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas/build/Release/canvas.node --module_name=canvas --module_path=/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas/build/Release --napi_version=9 --node_abi_napi=napi --napi_build_version=0 --node_napi_label=node-v108' (1)
npm error node-pre-gyp ERR! stack     at ChildProcess.<anonymous> (/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/@mapbox/node-pre-gyp/lib/util/compile.js:89:23)
npm error node-pre-gyp ERR! stack     at ChildProcess.emit (node:events:517:28)
npm error node-pre-gyp ERR! stack     at maybeClose (node:internal/child_process:1098:16)
npm error node-pre-gyp ERR! stack     at ChildProcess._handle.onexit (node:internal/child_process:303:5)
npm error node-pre-gyp ERR! System Darwin 24.6.0
npm error node-pre-gyp ERR! command "/Users/Willian.Lemann/.nvm/versions/node/v18.20.8/bin/node" "/Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/.bin/node-pre-gyp" "install" "--fallback-to-build" "--update-binary"
npm error node-pre-gyp ERR! cwd /Users/Willian.Lemann/dev/geomagical/sugarcube-client/node_modules/canvas
npm error node-pre-gyp ERR! node -v v18.20.8
npm error node-pre-gyp ERR! node-pre-gyp -v v1.0.10
npm error node-pre-gyp ERR! not ok
npm error A complete log of this run can be found in: /Users/Willian.Lemann/.npm/_logs/2026-03-25T18_09_47_179Z-debug-0.log
# more long info logs
```

To fix this, make sure to run `brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman`

and then open a new terminal and run `npm install` again.

</details>

<details>
<summary>Blank screen issue in local dev server</summary>

If you added a recent component or lib to the project that might be causing the localhost:1080 to be in a blank screen, if you face a blank screen in localhost do the steps:

> delete node_modules

> delete .cache

> npm install

> npm run clean

> npm start

</details>

### Create a dev account for development

1. Create an account on cte with the geomagical email (for staff access).
2. Visit /home-design on cte and see you are logged in.
3. You should be able login with the same credentials with the /login in main or other cloudflare links through this link here:  https://main.sugarcube-client.pages.dev/us/en/home-design/login/
4. If you need to change password, you can do it through https://backend.develop.mysugarcube.com/admin/self_password_change/

### Build for production

Output will be written to the `dist` folder

1. Run `npm run build`

### Build for dev

Output will be written to the `dist` folder

1. Run `npm run build`
2. Run `npm run develop:serve`

### I need to reset a branch

1. `git branch -f <BRANCH NAME>` while on `main`
2. `git push -f origin <BRANCH NAME>`

### I need to rollback the most recent release

1. Go to <https://github.com/geomagical/sugarcube-client/commits/main>
2. Find the most recent CI commit (something like `Update Prod to ... [skip ci]`)
3. Take that commit hash
4. Make a new branch for your rollback
5. Run `git revert <that hash>` to revert the update
6. Push your changes to your branch and make a PR for review

### My merges were deployed out of order

Avoid batching merges to avoid this problem in the first place. If it happens to you anyways, push an empty commit to prod to trigger a new build `git commit --allow-empty --no-verify`. Buildkite will not let you "rebuild" because it does not (and should not) have permission to overwrite existing builds.

## Testing

### Unit and Integration Testing with Jest

1. To run tests: Run `npm run test`
2. To run tests in watch mode: Run `npm run test:watch`
3. To see test coverage: Run `npm run test:coverage`. The coverage files are built at the top level in the coverage directory and can be viewed by opening: `coverage/lcov-report/index.html`.

### End to end tests

[Playwright](https://playwright.dev/) is used for running end-to-end tests on Chromium(default). We have several suites of Playwright based tests in the `e2eTests` folder.

**Smoke Tests**

To run just the smoke tests, use `npm run test:e2e`. To run a single test only, use `npm run test:e2e -- -g test_to_run`. The `-g` argument uses regular expressions to pick the test(s) to be run. For example, to run just composition related tests, use `npm run test:e2e -- composition`.

Functional tests can be run on different environments, and must be configured with user account credentials to use and other misc settings. This configuration can be done either through environmental variables, or via an environment-specific config file in `/e2eTests/config/{env}.json`. Configuration values provided via environmental variables takes precedence over values from configuration files when both are present. When providing environmental variable configuration, all config keys are expected as SCREAMING_SNAKE_CASE (e.g. `userCredentials` becomes `USER_CREDENTIALS`). Config values which are arrays or objects are expected as JSON-encoded strings (e.g. `USER_CREDENTIALS='[{"username":"geo","password":"test"}]'`). Configuration file templates can be found at https://drive.google.com/drive/folders/1i_1s90Fj0RRlGv_3sg1syeQKe2XaNsgb?usp=drive_link, simply download them to `/e2eTests/config/` and customize with your own user credentials if necessary.

The following configuration settings are available:

-   `environment: 'local' | 'pr' | 'main' | 'cte' | 'prod'`: which environment the tests should run upon. This is the only configuration value that MUST be provided via an environmental variable. If 'local' is specified, the tests will spin up a web server to serve the latest build on your computer. If 'pr' is specified, you must also provide a `baseUrl` configuration value to tell the tests what URL the PR environment is being hosted at. Defaults to 'local' if unspecified.
-   `userCredentials: Array<{ username: string, password: string }>`: the credentials for the user accounts to log in as for running the tests. At least one user account credential is required, and more tests can be run in parallel when more accounts are provided.
-   `tsfSkipToken?: string`: special token required on the 'cte' environment to bypass http authentication.
-   `baseUrl?: string`: required on any 'pr' environments. The base URL where the Kreativ applicaton is being hosted (e.g. full URL to the dashboard page).

To run tests on your local dev branch:

```sh
npm run build && npm run test:e2e -- --ui
```

If you're doing test development and not changing application source code then the `npm run build` command is optional after the first run, but note that tests will fail if no built sources are available and tests will be run on outdated code if you've edited the code since the last build, so it's a good habit to get into.

The `--ui` flag enables the visual test debugging application provided by Playwright (see https://playwright.dev/docs/running-tests#debug-tests-in-ui-mode) and is extremely useful when debugging failing or broken tests, and it is recommended to use it during local development.

To run tests on the main environment:

```sh
ENVIRONMENT=main npm run test:e2e
```

To run functional e2e tests on a PR environment, find the URL of the PR environment where your PR code is hosted (typically something like "https://{branch}.sugarcube-client.pages.dev" where "{branch}" is a URL-safe version of your PR's branch name). E.g., for the PR `WALL-3030_e2e-tests-with-auth`:

```sh
ENVIRONMENT=pr BASE_URL="https://wall-3030-e2e-tests-with-aut.sugarcube-client.pages.dev/" npm run test:e2e
```

Functional end-to-end testing is currently very light. These tests assert that the UI is primarily working as expected and that interactions create the right outcomes and flows.

**Test Authoring and debugging tips**

-   Use `await page.pause()` to pause a test and bring up the playwright debugging window during test execution
-   To confirm which element is being selector using your selectors, use `locator.highlight()` along with the pause
-   Almost all operations are async, and require an `await` statement. Missing one of these will lead to out of order execution and flaky test results
-   `page.locator()` will try multiple times when looking for a DOM element, so there is no need to add arbitrary wait/sleep statements

## Localization

Does your feature have strings? Follow this process for localization:

1. Create a new branch off of `main`, add the new and/or updated strings to `locales/en/translation.json` file. Please insert the strings so that the keys are in alphanumeric sorted order. If you are using VS code editor, you can use [this extension](https://marketplace.visualstudio.com/items?itemName=richie5um2.vscode-sort-json) to keep the json sorted.

    _Note: While developing, in order to see your changes locally, add your strings to the_ `locales/en-US/translation.json` _file on your feature branch._

2. Push your branch up and create a pull request.
3. Once your pr is approved and merged, run the [sync translations workflow](https://github.com/ingka-group-digital/sugarcube-client-xtm/actions/workflows/sync-translations.yml). This will ensure that automatic translations are created in each language in Phrase.
   ![Screenshot](https://github.com/user-attachments/assets/826986fa-e2bd-42b2-9e3b-924845618fb7)
4. Within a few minutes, a pr called "Updated translations from Phrase" will be automatically created. Review this pr for any errors, approve, and merge.
5. If there are any failures with the sync translation workflow run, you can re-run the jobs by clicking on the three dots to the right of the failed job, viewing the workflow file, and clicking on the re-run jobs button (images below).
   ![Screenshot 2024-08-29 at 12 35 06 PM](https://github.com/user-attachments/assets/2516f1d2-ff25-4334-bb0a-69b9997188ab)
   ![Screenshot 2024-08-29 at 12 35 18 PM](https://github.com/user-attachments/assets/d14830a9-aaca-43b7-89ce-bba5f63a0ca3)

## Missing localization strings check

We implemented a script to ensure translation keys in our code exist in our translation files. This script runs before each build and helps catch any missing keys.

-   **Typed Translation Keys**: Translation keys are now type-safe thanks to the i18next.d.ts file. This provides auto-completion and type checking in your code editor.

-   **Validation Script**: A script runs during the onPostBootstrap stage in Gatsby's build process to ensure all used translation keys exist. This helps catch errors early and maintains translation consistency.

-   **Dynamic interpolation**: There may be some interpolation cases that would make Typescript complains over it, the suggested approach to avoid this is creating constants and type of those constants, so i18n would be able to find its defined keys in the namespaces.

-   **Locales matching**: With the script `npm run lint:translation` we can detect if a given key in `./locales/en/*.json` is missing in one of the other locales. This is run only in main and fails the build if there are missing translations.

## Links

-   [Jira Web](https://geomagical.atlassian.net/jira/software/c/projects/WALL/boards/5/backlog?issueLimit=100)
-   [Jira Graphics](https://geomagical.atlassian.net/jira/software/c/projects/GFX/boards/34/backlog?issueLimit=100)
-   [Figma](https://www.figma.com/files/806572125471551324/project/28895429/Geomagical-Migration-Space?fuid=836650216932837064)
-   [BuildKite](https://buildkite.com/geomagical/sugarcube-client)
-   [GCP Assets](https://console.cloud.google.com/storage/browser/wallspice-assets;tab=objects?project=wallspice-storage&organizationId=409658823721&prefix=&forceOnObjectsSortingFiltering=false)
-   [Sentry](https://sentry.io/organizations/geomagical-labs/issues/?project=5339839)
