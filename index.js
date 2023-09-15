#!/usr/bin/env node

const express = require("express");
const { OpenApiValidator } = require("express-openapi-validate");
const YAML = require("yamljs");
const path = require("path");
const { exit } = require("process");
const fs = require('fs');
const app = express();
const URL = require("url").URL;
const bodyParser = require('body-parser');
const cors = require('cors');
const { printLogo, print, printPath } = require("./src/logger");
const uppercase = require("./src/utils/uppercase");
const { POST, GET } = require("./src/constants");
app.use(bodyParser.json())
app.use(cors())
if (process.argv.length === 2) {
  print('NO_FILE_FOUND: Please provide a file to load!')
  exit()
}
const loadFilename = process.argv[2]


const downloadFile = (async (url, path) => {
  //TODO: impliment
})

const loadFromFile = (loadFilename) => {
  const apiSpecPath = path.join(process.cwd(), loadFilename);
  if (!fs.existsSync(apiSpecPath)) {
    print(`FILE_NOT_FOUND: File: ${loadFilename} was not found in this directory.`)
    exit()
  }
  return YAML.load(apiSpecPath);
}
printLogo()

const loadFromURL = (url) => {
  return downloadFile(url, 'contract.yaml')
}

const validateURL = (url) => {
  try {
    const url = new URL(loadFilename);
    return url.href;
  } catch {
    return false
  }
}

const transformRequestBody = (req, res, example) => {
  let body = req.body;
  let exampleString = JSON.stringify(example)
  Object.keys(body).forEach((key) => {
    exampleString = exampleString.replaceAll(`/{${key}}/`, body[key])
  })
  return JSON.parse(exampleString)
};

const switchLoadStrategy = (loadFilename) => {
  return loadFromFile(loadFilename)
}
// Load your OpenAPI YAML document
const apiSpec = switchLoadStrategy(loadFilename)

const getPort = (url) => new URL(url).port || 3000;

const port = getPort(apiSpec.servers[0].url)

const validator = new OpenApiValidator(apiSpec);

const sendHtmlImage = (status) =>
  `<html><body><img src="https://http.cat/${status}"/></body></html`;

const sendStatusCode = (code, req, res) => {
  const statusCodeInt = parseInt(code);
  if (Number.isInteger(statusCodeInt)) {
    res.status(statusCodeInt).send(sendHtmlImage(statusCodeInt));
    return;
  }
  res.status(500).send(sendHtmlImage(500));
  return;
};

const sendDelayedResponse = (response, delay, req, res) => {
  return res.setTimeout(parseInt(delay), () => {
    res.json(response);
  });
};
const sendDelayedStatusCode = (code, delay, req, res) => {
  return res.setTimeout(parseInt(delay), () => {
    return sendStatusCode(code, req, res)
  });
};

const sendFile = (req, res, example) => {
  const { path: filepath } = example.payload;
  const fileLocation = path.join(process.cwd(), filepath)
  if (fs.existsSync(fileLocation)) {
    return res.sendFile(fileLocation);
  }
  return res.send(example);
}
const redirect = (req, res, example) => {
  const { url: urlIn } = example.payload;
  const url = new URL(urlIn)
  return res.redirect(url.toString());
  // return res.send(example);
}

const actions = (req, res, example) => {
  switch (example.action) {
    case 'RETRIEVE_FILE':
      return sendFile(req, res, example)
    case 'REDIRECT':
      return redirect(req, res, example)
    default:
      res.send(example)
  }
}

const handleSingleExample = (example, req, res, type = GET) => {
  if (example.action) {
    return actions(req, res, example)
  }
  if (type !== 'GET') {
    example = transformRequestBody(req, res, example)
  }
  const { delay = false, status = false } = req.query;
  if (delay && status) {
    sendDelayedStatusCode(status, delay, req, res)
  }
  if (delay) {
    return sendDelayedResponse(example, delay, req, res);
  }
  if (status) {
    return sendStatusCode(status, req, res);
  }
  res.json(example);
  return;
};

const getLocationAndQueryString = (queryString) => {
  const splitQuery = queryString.split("=");
  const splitLocation = splitQuery[0].split("/");
  return {
    location: splitLocation[0],
    param: splitLocation[1],
    query: splitQuery[1],
  };
};

const handleMultipleExamples = (examples, req, res, type) => {
  const { defaultExample, ...examplesnotincluingdefault } = examples;
  Object.keys(examplesnotincluingdefault).forEach((key) => {
    const { location, param, query } = getLocationAndQueryString(key);
    console.log(location, param, query)
    if (req[location][param] === query) {
      return handleSingleExample(examples[key].value, req, res, type);
    } else {
      return handleSingleExample(defaultExample.value, req, res, type);
    }
  });
  return handleSingleExample(defaultExample.value, req, res, type);
};

const request = (req, res, operation, httpHeader) => {
  const example =
    operation.responses["200"].content["application/json"].example || false;
  const examples =
    operation.responses["200"].content["application/json"].examples || false;

  if (examples) {
    handleMultipleExamples(examples, req, res, httpHeader);
  }
  if (example) {
    return handleSingleExample(example, req, res, httpHeader);
  }
}

// Generate routes and handlers dynamically from the OpenAPI specification
for (const [path, pathItem] of Object.entries(apiSpec.paths)) {
  for (const [httpMethod, operation] of Object.entries(pathItem)) {
    printPath(uppercase(httpMethod), path)
    app[httpMethod](path, validator.validate(httpMethod, path), (req, res) => {
      return request(req, res, operation, uppercase(httpMethod));
    });
  }
}

// Handle errors
app.use((err, req, res, next) => {
  if (err.status) {
    res.status(err.status).json({ error: err.message });
  } else {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server running @ localhost:${port}/`);
});
// IF examples is a list then itterate through them
// examples as a list can give diffrent instructions to the app for instance: query/jurisdiction=ES,
// means look inside the request headers, find the jurisdiction property, if the jurisdition property is ES then return this example.
// This can also be applied to headers and body props.
