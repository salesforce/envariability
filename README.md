# envariability
Highly configurable environment based configuration library for Node.js

## Features

- **in-memory environment variable based configuration** - all configuration values are loaded from the environment 
variables
- **nested** - the configuration keys/values are organized in a tree structure
- **hierarchy driven** - the config schema tree defines how the environment variables should look like
- **schema driven** - a lightweight config schema defines how a value must be processed
- **validation** - the configuration is validated for key presence checking
- **documentation** - can generate markdown documentation for your schema
- minimal dependencies, configurable, extensive and testable

## How it works

The configuration definition needs to have elements which match [this schema](./lib/config-element-schema.json) as leaves. 
Each configuration element will be flattened to an environment variable name by concatenating a pre-configured prefix 
with all the names of the configuration nodes from the root descending to the leaf in that order. 

For example the following configuration:
```javascript
const configDefinition = {
  "app": {
    "hostname": {},
    "port": {},
    "external": {
      "endpoint": {
        "host": {},
        "port": {}
      },
      "timeout": {}
    }
  }
}
```

with the `MICRO_SERVICE` prefix, will be flattened to the following environment variables:

```bash
MICRO_SERVICE_APP_HOSTNAME
MICRO_SERVICE_APP_PORT
MICRO_SERVICE_APP_EXTERNAL
MICRO_SERVICE_APP_EXTERNAL_ENDPOINT_HOST
MICRO_SERVICE_APP_EXTERNAL_ENDPOINT_PORT
MICRO_SERVICE_APP_EXTERNAL_TIMEOUT
```

then read and processed. 

If the environment variable is defined, it will override the default specified in the configuration definition.

## How to use

```javascript
const environmentConfiguration = require('envariability');
const config = environmentConfiguration(
  // Application configuration definition
  {
      "app": {
        "endpoint": {
          "host": {
            "doc": "The hostname",
            "type": "string",
            "required": true
          },
          "port": {
            "doc": "The port",
            "type": "integer",
            "required": true
          },
          "protocol": {
            "doc": "The protocol",
            "type": "string",
            "default": "https",
            "required": true
          }
        }
      }
  },
  // Environment configuration options
  {
    "environmentVariablePrefix": "MY"
  });

// MY_APP_ENDPOINT_HOST=localhost
// MY_APP_ENDPOINT_PORT=443
// If the above environment variables are set,

assert.deepEqual(
  config,
  {
  "app": {
    "endpoint": {
      "host": "localhost",
      "port": 443,
      "protocol": "https"
    }
  }
});

assert.ok(Object.isFrozen(config))
```

## Supported types and their default transformations

Depending on the type specified in the configuration node, the value from the environment variable is processed as
following:

| Type    | Transformation                                                |
|---------|---------------------------------------------------------------|
| boolean | Transformed to uppercase and compared against "TRUE"          |
| integer | Parsed as an integer                                          |
| array   | Split by the `environmentVariableValueArraySeparator` option  |
| string  | none                                                          |
| other   | Must be provided by the user                                  |

## Custom transformations

If for example a configuration element needs some basic processing prior to being added to the actual configuration,
a custom value transformation can be supplied in the config schema.

Let's say there's a config url which may or may not have the protocol. To go around that, the following configuration 
element processes the value directly from the environment variable:

```javascript
const definition = { 
  "url": {
    "doc": "The url where requests go",
    "type": "other",
    "default": "http://some.url:8080",
    "required": true,
    "transform": (value) => value.match(/^http[s]?:\/\//) ? value : `http://${value}`
  }
}

```

this will ensure that the final config will have the right values. 

Additionally, the transformation is always called with a reference to **envariability**'s configuration as a parameter. So you can also do 
something like this:

```javascript
const config = environmentConfiguration(
  // Application configuration definition
  {
    "app": {
      "endpoint": {
        "url": {
          "doc": "The url where requests go",
          "type": "other",
          "default": "http://some.url:8080",
          "required": true,
          "transform": (value, configOptions) => value.match(/^http[s]?:\/\//) ? value : `${configOptions.protocolForUrls}://${value}`
          }
        }
      }
  },
  // Environment configuration options
  {
    "environmentVariablePrefix": "MY",
    "protocolForUrls": "https"
  });
```

and reuse the same configuration definition across configuration instances.

## Documenting your configuration automatically

**envariability** also supports generating documentation for the configuration definition in the form of a markdown table:

```javascript

const envariabilityDoc = require('envariability').doc;

const documentation = envariabilityDoc({
    "app": {
      "endpoint": {
        "url": {
          "doc": "The url where requests go",
          "type": "other",
          "default": "http://some.url:8080",
          "required": true,
          "transform": (value, configOptions) => value.match(/^http[s]?:\/\//) ? value : `${configOptions.protocolForUrls}://${value}`
        },
        "count": {
          "doc": "How many requests should be made",
          "type": "integer",
          "default": 100,
          "required": true
        }
      }
    }
  },
  {
    'environmentVariablePrefix': 'MY',
    'environmentVariables': {},
  });

```

will produce the markup for the following table:

| env | doc | type | default | required | transform |
| --- | --- | --- | --- | --- | --- |
| MY_APP_ENDPOINT_URL | The url where requests go | other | http://some.url:8080 | true | (value, configOptions) => value.match(/^http[s]?:\/\//) ? value : `${configOptions.protocolForUrls}://${value}` |
| MY_APP_ENDPOINT_COUNT | How many requests should be made | integer | 100 | true | --- |

The generator supports custom columns via the `docColumnMapping` property of the main **envariability** config object. The property is an array of arrays representing a mapping between the property names in the [config element schema](./lib/config-element-schema.json) and a custom name. The order of the column definitions will be reflected in the resulting table.

For example:

```javascript

const envariabilityDoc = require('envariability').doc;

const documentation = envariabilityDoc({
    "app": {
      "endpoint": {
        "url": {
          "doc": "The url where requests go",
          "type": "other",
          "default": "http://some.url:8080",
          "required": true,
          "transform": (value, configOptions) => value.match(/^http[s]?:\/\//) ? value : `${configOptions.protocolForUrls}://${value}`
        },
        "count": {
          "doc": "How many requests should be made",
          "type": "integer",
          "default": 100,
          "required": true
        }
      }
    }
  },
  {
    'environmentVariablePrefix': 'MY',
    'environmentVariables': {},
    'docColumnMapping': [
      ['doc', 'What'],
      ['required', 'Must be specified?'],
      ['type', 'Kind'],
      ['env', 'Environment variable'],
    ],
  });

```

will produce the markup for the following table:

| What | Must be specified? | Kind | Environment variable |
| --- | --- | --- | --- |
| The url where requests go | true | other | MY_APP_ENDPOINT_URL |
| How many requests should be made | true | integer | MY_APP_ENDPOINT_COUNT |

## Supported options

| Option                                     | Default                             | Description             |
|--------------------------------------------|-------------------------------------|-------------------------|
| environmentVariablePrefix                  | ""                                  | The prefix for the environment variable names to build and read, usually an abbreviation of the service name. <br> For example if set to `MYSERVICE`, environment variable names would be `MYSERVICE_LOGDIR`, `MYSERVICE_PIDFILE`, etc..  | 
| environmentVariableWordSeparator           | "_"                                 | The separator for the environment variable names to build and read. <br> When the environment variable names are flattened based on the config hierarchy, this is the separator used to concatenate the config names along the way.|
| environmentVariableTransform               | (word) => word.toUpperCase()        | A function to be used for processing the configuration name to convert to the environment variable name. By default it will be turned to all uppercase. For example `app : { config : { port }}` turns to `APP_CONFIG_PORT`
| environmentVariableValueArraySeparator     | "%"                                 | For the `array` configuration element type, this is the separator used to split the string value contained in the environment variable |
| immutable                                  | true                                | True to return a deep immutable object as the resulting configuration, false otherwise. |
| environmentVariables                       | process.env                         | The environment variable object read in order to populate the configuration. <br> This is mainly to be able to inject the dependency on `process.env` while writing unit tests |
| docColumnMapping                           | -                                   | An 2D array representing the custom column names to be used for generating the markdown documentation for the configuration schema | 