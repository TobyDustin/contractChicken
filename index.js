#!/usr/bin/env node

const express = require("express");
const { OpenApiValidator } = require("express-openapi-validate");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");
const { exit } = require("process");
const fs =require('fs');

const app = express();
const port = process.env.PORT || 3000;
const URL = require("url").URL;
console.log(process.cwd())
if(process.argv.length === 2){
  console.log('NO_FILE_FOUND: Please provide a file to load!')
  exit()
}
const loadFilename = process.argv[2]


const downloadFile = (async (url, path) => {
  //TODO: impliment
})

const loadFromFile = (loadFilename)=>{
  const apiSpecPath = path.join(process.cwd(), loadFilename);
if (!fs.existsSync(apiSpecPath)) {
  console.log(`FILE_NOT_FOUND: File: ${loadFilename} was not found in this directory.`)
  exit()
}
return YAML.load(apiSpecPath);
}

const loadFromURL = (url)=>{
  console.log(url)
  return downloadFile(url, 'contract.yaml')
}

const validateURL = (url) => {
  try{
    const url = new URL(loadFilename);
    return url.href;
  } catch{
    return false
  }
}

const switchLoadStrategy = (loadFilename)=>{
  return loadFromFile(loadFilename)
}
// Load your OpenAPI YAML document

const apiSpec = switchLoadStrategy(loadFilename)

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

const handleSingleExample = (example, req, res) => {
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

const handleMultipleExamples = (examples, req, res) => {
  const { defaultExample, ...examplesnotincluingdefault } = examples;

  Object.keys(examplesnotincluingdefault).forEach((key) => {
    const { location, param, query } = getLocationAndQueryString(key);
    if (req[location][param] === query) {
      return handleSingleExample(examples[key].value, req, res);
    } else {
      return handleSingleExample(defaultExample.value, req, res);
    }
  });
};

const getRequest = (req, res, operation) => {

  const example =
    operation.responses["200"].content["application/json"].example || false;
  const examples =
    operation.responses["200"].content["application/json"].examples || false;
  if (examples) {
    handleMultipleExamples(examples, req, res);
  }
  if (example) {
    return handleSingleExample(example, req, res);
  }
};


const postRequest = (req, res, operation) =>{
  const example =
    operation.responses["200"].content["application/json"].example || false;
  const examples =
    operation.responses["200"].content["application/json"].examples || false;

  if (examples) {
    handleMultipleExamples(examples, req, res);
  }
  if (example) {
    return handleSingleExample(example, req, res);
  }
  
}

const switchHTTPHeaders = (httpHeader, req, res, operation) => {
  switch (httpHeader) {
    default:
      return getRequest(req, res, operation);
  }
};

// Serve the OpenAPI documentation using Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(apiSpec));
// Generate routes and handlers dynamically from the OpenAPI specification
for (const [path, pathItem] of Object.entries(apiSpec.paths)) {
  for (const [httpMethod, operation] of Object.entries(pathItem)) {
    console.log(`${httpMethod.toLocaleUpperCase()}: localhost:${port}${path}`);
    app[httpMethod](path, validator.validate(httpMethod, path), (req, res) => {
      return switchHTTPHeaders(httpMethod, req, res, operation);
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
  console.log(`Server is running on port ${port}`);
});
// IF examples is a list then itterate through them
// examples as a list can give diffrent instructions to the app for instance: query/jurisdiction=ES,
// means look inside the request headers, find the jurisdiction property, if the jurisdition property is ES then return this example.
// This can also be applied to headers and body props.
