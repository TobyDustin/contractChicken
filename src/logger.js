const colors = require('colors')
const { POST, PUT, DELETE } = require('./constants')
const getColorFunction = (code) => {
  switch (code) {
    case POST:
      return colors.bold.yellow
    case PUT:
      return colors.bold.blue
    case DELETE:
      return colors.bold.magenta
    default:
      return colors.bold.green
  }
}

const log = (text) => console.log(text);



const printPath = (code, path) => log(`${getColorFunction(code)(`${code}`)} path found: ${path}`);

const printLogo = () => log(`
        PROTOCHICKEN
    ___________________
Thank you for using Protochicken!
`);

module.exports = {
  printLogo,
  printPath,
  log
}