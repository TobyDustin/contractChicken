

<p align="center">
  <img src="./resources/logo.png" alt="Logo" width="150px"/>
</p>

<h1 align="center">🐔 Protochicken</h1>
<h3 align="center">Quickly Mock RESTful APIs</h3>

---

## What is Protochicken?

Protochicken is a powerful command-line tool designed to expedite the process of mocking RESTful APIs effortlessly. It seamlessly integrates OpenAPI schemas, enhancing the speed and efficiency of API development.

## What Can Protochicken Do?

Protochicken empowers developers to:

- **Mock RESTful APIs**: Quickly create mock APIs from OpenAPI schemas.
- **Customize HTTP Status Codes**: Return different HTTP status codes for any endpoint in your contract using the `status=` query parameter.
- **Introduce Delays**: Simulate slow network conditions by adding artificial delays to responses with the `delay=` query parameter.

## Installing Protochicken

You can easily install Protochicken by running the following command:

```bash
npm install -g protochicken
```

## Using Protochicken

Get started with Protochicken by running the following command, replacing [OPENAPI_CONTRACT_LOCATION] with the location of your OpenAPI contract:
```bash
protochicken [OPENAPI_CONTRACT_LOCATION]
```
### Returning Different HTTP Status Codes

You can customize the HTTP status code returned from any endpoint in your contract. Simply include the `status=` query parameter in your request with the desired status code.

### Returning with Delays

Protochicken allows you to introduce delays to your responses, simulating slow network conditions. To add a delay, include the `delay=` query parameter in your request, specifying the delay time in milliseconds. This feature is particularly useful for testing under adverse network conditions.

Feel free to explore Protochicken's capabilities and make your API development process more efficient and flexible. 🚀