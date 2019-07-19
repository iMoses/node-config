# Proposal: Improve library's architecture

This is my proposal for an improved `node-config` architecture.

**Disclaimer:**  


## Motivation

About half of today's open issues are related to immutability inconsistencies and 
sub-modules support. 

While looking for possible solutions I came to realize that the main issue with 
sub-modules is our lack of support for multiple instances, and the main issue with 
that is our reliance on environment variables to initialize the config instance.

The second major issue is that we initialize the main instance ourselves, which prevents 
us from introducing new features to manipulate the library's options before initialization.

These problems can only be solved by changing the initialization logic of the library, 
which wouldn't have been much of a problem if we were not expected to contain all loaded
configuration on the instance root from the initial require, for backwards compitability,
which beings us back to the immutability issues which are complex due to the same logic.

If we change the `Config` instance API and remove direct access to the configuration 
object we can enforce mutability and delay files loading until the first access to the
configuration object instead of the config instance as we do today.

It all comes down to that:
- Allow the creation of multiple instances
- Remove reliance on environmental variables
- Better enforce immutability
- Lazy-load configuration

Along with changes to the parser to support pre & post processors we can cover most of 
today's open issues in one fine swipe, which will require a major version with lots of 
breaking changes for advance users.

### Common Usage

Users who've been using the library according to the
[Common Usage](https://github.com/lorenwest/node-config/wiki/Common-Usage)
section recommendations **won't be affected** by these changes.

```js
const config = require('config');
console.log(config.get('some.key'));  // value
console.log(config.has('another.key'));  // boolean
```

### Immutability

All of the library's mutability issues are related to a legacy decision to locate 
configuration properties at the root of the `Config` instance for direct access,
which is now considered a bad-practice because it bypasses the freezing mechanism.

Changing the `Config` instance API will allow us to remedy this problem for good,
by locating the configuration object on top of the `Config` instance as a property.
We'll observe external access to it from the property's getter and freeze it on first
access.

#### Direct access

In current versions users an access configuration object's properties directly from the 
`config` instance, but this causes a problem with our immutability logic which locks
access on the first use of the `config.get` method.

```js
const config = require('config');
console.log(config.some.key);  // value
```

In this version we'll locate the configuration object as a property on top of the `config`
instance, this way we get monitor access to the object's getter an freeze it on first get,
without relaying on the `config.get` method. Calling the configuration object property
`config` enables the users to call the object directly through deconstruction.

```js
// we fetch the config property on 
// top of the default config instance
const { config } = require('config');
console.log(config.some.key);  // value
```

Which is equivalent to:

```js
const configInstance = require('config');
console.log(configInstance.get('some.key'));  // value
console.log(configInstance.config.some.key);  // value
```

### Sub-modules

I believe the main issue with initializing sub-module individual configs comes from:
- The inability to create multiple instances of `Config`
- The inability to pass initialization options programmatically

Without the ability to initiate multiple instances of `Config` we are potentially forcing 
sub-modules to share a configuration object with other modules. This isn't ideal at all, 
to say the least. 

Without the ability to set options programmatically prior to initialization is causing weird
and undesired use patterns of overriding and replacing environment variables. This should be
avoided at all cost as it has the potential of damaging hosting modules of our sub-modules
feature users.

```js
// create a completely new instance of `Config`
const config = require('config').create({
  configDir: __dirname + '/config',
  environment: process.platform,
});
console.log(config.get('some.key'));  // value
console.log(require('config') === config);  // false
```

```js
const config = require('config');
const subModule = config.subModule('MyModule');
subModule.extend({some: {key: 'value'}});
console.log(subModule.get('some.key'));  // value
console.log(config.get('MyModule.some.key') === subModule.get('some.key'));  // true
```

## Breaking changes

Logical changes:
- Remove support for `config.util`
- Remove support for `NODE_CONFIG`
- Remove support for `runtime.json`
- Remove support for `custom-environment-variables`
- Prevent direct access to the config object
- Do no attach methods to properties (e.g. no `get`, `has`)

## Reasons & alternative solutions

This section provides an explanation of the reasons for each change 
and possible alternative solutions.

#### config.util

We have many utilities which are exposed as part of our API and I claim that most 
of  these shouldn't be exposed at all. This isn't the library's purpose, no one 
installs  `node-config` so that they can use `config.util.extendDeep`, and exposing 
them as part  of our API is forcing us to keep supporting them or else why introduce 
a breaking change, which makes it a fragile API which is forced to carry legacy code.

My proposal is to remove `config.util` completely.

Internal utilities can be placed at `config/lib/utils` with a disclaimer that we will 
not  guarantee stability between major versions. Users can decide to use them at their 
own  risk. Anything worthwhile should be placed on top of the `config` instance, while 
we keep `utils` internal.

#### NODE_CONFIG

`NODE_CONFIG` was removed to in an effort to detach reliance on environment variables.

The new architecture allows the users to override the default file loading logic, in
which case it isn't clear at what stage, if at all, these configs should be merged in.

Support can be restored by calling `config.extend` manually.

```js
for (let source of [
  process.env.NODE_CONFIG,
  utils.getArgv('NODE_CONFIG'),
]) {
  if (source) {
    config.extend(JSON.parse(source));
  }  
}
```

#### runtime.json

`runtime.json` was removed in an effort to remove deprecated code.

Support can be restored by calling `config.parseFile` manually.

```js
config.parseFile(process.env.NODE_CONFIG_DIR + '/runtime.json');
```

#### custom-environment-variables

`custom-environment-variables` was removed in an effort to remove inconsistent logic.

The new architecture allows the use of post-processors which can be used to apply templating.
These can be used to apply the same logic in a consistent manner, remove an exceptional file
from the system and replace it with a cross-extension ability to set values from environment
variables.

Suggestion for templating logic:
```json5
{
  dbHost: 'db-name',
  dbPass: 'ENV::DB_PASSWORD',
  ssl: {
    key: 'FILE::/credentials/ssl.key',
    pem: 'FILE::/credentials/ssl.pem',
  },
}
```

## Open issues

Solved or no longer relevant due to new architecture:
- [#549](https://github.com/lorenwest/node-config/issues/549)
- [#546](https://github.com/lorenwest/node-config/issues/546)
- [#543](https://github.com/lorenwest/node-config/issues/543)
- [#517](https://github.com/lorenwest/node-config/issues/517)
- [#514](https://github.com/lorenwest/node-config/issues/514)
- [#478](https://github.com/lorenwest/node-config/issues/478)
- [#472](https://github.com/lorenwest/node-config/issues/472)
- [#471](https://github.com/lorenwest/node-config/issues/471)
- [#424](https://github.com/lorenwest/node-config/issues/424)
- [#412](https://github.com/lorenwest/node-config/issues/412)
- [#338](https://github.com/lorenwest/node-config/issues/338)
- [#329](https://github.com/lorenwest/node-config/issues/329)
- [#226](https://github.com/lorenwest/node-config/issues/226)
- [#225](https://github.com/lorenwest/node-config/issues/225)

We can provide a processor solution:
- [#539](https://github.com/lorenwest/node-config/issues/539)
- [#536](https://github.com/lorenwest/node-config/issues/536)
- [#521](https://github.com/lorenwest/node-config/issues/521)
- [#400](https://github.com/lorenwest/node-config/issues/400)
- [#372](https://github.com/lorenwest/node-config/issues/372)
- [#324](https://github.com/lorenwest/node-config/issues/324)

Should be closed anyhow:
- [#509](https://github.com/lorenwest/node-config/issues/509)
