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
const { printLogo, log, printPath } = require("./src/logger");
const uppercase = require("./src/utils/uppercase");
const { GET } = require("./src/constants");
const chain = require("./src/actions/chain");
const redirect = require("./src/actions/redirect");
const fileSend = require("./src/actions/fileSend");
const transformValue = require("./src/utils/transformValue");
const router = express.Router()
app.use(bodyParser.json())
app.use(cors())
if (process.argv.length === 2) {
  log('NO_FILE_PROVIDED: Please provide a file to load!')
  exit()
}
const loadFilename = process.argv[2]

printLogo()

const loadFromFile = (loadFilename) => {
  const apiSpecPath = path.join(process.cwd(), loadFilename);
  if (!fs.existsSync(apiSpecPath)) {
    log(`FILE_NOT_FOUND: File: ${loadFilename} was not found in this directory.`)
    exit()
  }
  return YAML.load(apiSpecPath);
}

const switchLoadStrategy = (loadFilename) => {
  return loadFromFile(loadFilename)
}

// Load your OpenAPI YAML document
const apiSpec = switchLoadStrategy(loadFilename)

const getServerURL = (url) => new URL(url);



const validator = new OpenApiValidator(apiSpec);

const sendHtmlImage = (status) =>
  `<html><body><img src="https://http.cat/${status}"/></body></html`;

const sendStatusCode = (code, res) => {
  const statusCodeInt = parseInt(code);
  if (Number.isInteger(statusCodeInt)) {
    res.status(statusCodeInt).send(sendHtmlImage(statusCodeInt));
    return;
  }
  res.status(500).send(sendHtmlImage(500));
  return;
};

const sendDelayedResponse = (value, delay, res, type) => {
  return res.setTimeout(parseInt(delay), () => {
    if (type === 'FILE') {
      return res.sendFile(value);

    }
    if (type === 'REDIRECT') {
      return res.redirect(value);
    }
    return res.send(value);
  });
};

const sendDelayedStatusCode = (code, delay, req, res) => {
  return res.setTimeout(parseInt(delay), () => {
    return sendStatusCode(code, res)
  });
};

const actions = (req, res, example) => {
  switch (example.action) {
    case 'STATUS':
      return res.sendStatusCode(example.payload)
    case 'RETRIEVE_FILE':
      return fileSend(req, res, example);
    case 'REDIRECT':
      return redirect(req, res, example);
    case 'CHAIN':
      return chain(req, res, example);
    default:
      res.send(example)
  }
}

const handleSingleExample = (example, req, res, type = GET) => {
  if (example.action) {
    return actions(req, res, example)
  }
  if (type !== 'GET') {
    example = transformValue(example, req.body);
  }
  return res.send(example);
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
    if (req[location][param] === query) {
      return handleSingleExample(examples[key].value, req, res, type);
    }
  });
  return handleSingleExample(defaultExample.value, req, res, type);
};

const buildResponse = (request, response) => {
  const { delay = false, status = false } = request.query;

  if (delay && status) {
    return {
      send: () => sendDelayedStatusCode(status, delay, request, response),
      sendFile: () => sendDelayedStatusCode(status, delay, request, response),
      redirect: () => sendDelayedStatusCode(status, delay, request, response),
      sendStatusCode: (status) => sendStatusCode(status, response),
    }
  }
  if (delay) {
    return {
      send: (payload) => sendDelayedResponse(payload, delay, response),
      sendFile: (payload) => sendDelayedResponse(payload, delay, response, 'FILE'),
      redirect: () => sendDelayedResponse(payload, delay, response, 'REDIRECT'),
      sendStatusCode: (status) => sendStatusCode(status, response),
    }
  }
  if (status) {
    return {
      send: () => sendStatusCode(status, response),
      sendFile: () => sendStatusCode(status, response),
      redirect: () => sendStatusCode(status, response),
      sendStatusCode: (status) => sendStatusCode(status, response),
    }
  }
  return {
    send: (payload) => response.send(payload),
    sendFile: (payload) => response.sendFile(payload),
    redirect: (payload) => response.redirect(payload),
    sendStatusCode: (status) => sendStatusCode(status, response)
  }
}

const request = (req, res, operation, httpHeader) => {
  const resp = buildResponse(req, res);
  const example =
    operation.responses["200"].content["application/json"].example || false;
  const examples =
    operation.responses["200"].content["application/json"].examples || false;

  if (examples) {
    handleMultipleExamples(examples, req, resp, httpHeader);
  }
  if (example) {
    return handleSingleExample(example, req, resp, httpHeader);
  }
}

// Generate routes and handlers dynamically from the OpenAPI specification
for (const [path, pathItem] of Object.entries(apiSpec.paths)) {
  for (const [httpMethod, operation] of Object.entries(pathItem)) {
    printPath(uppercase(httpMethod), path)
    router[httpMethod](path, validator.validate(httpMethod, path), (req, res) => {
      return request(req, res, operation, uppercase(httpMethod));
    });
  }
}

// Handle errors
router.use((err, req, res, next) => {
  if (err.status) {
    res.status(err.status).json({ error: err.message });
  } else {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

apiSpec.servers.forEach((server) => {
  const url = getServerURL(server.url);
  const port = url.port || 3000;
  app.use(url.pathname, router)
  app.listen(port, () => {
    console.log(`Server running @ ${url.toString()}`);
  });
})