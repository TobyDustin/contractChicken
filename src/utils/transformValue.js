const transformValue = (object, data) =>{
    let stringifyedObject = JSON.stringify(object)
    Object.keys(data).forEach((key) => {
      const stringifyedData = JSON.stringify(data[key])
      stringifyedObject = stringifyedObject.replaceAll(`"/{${key}}/"`, stringifyedData)
    })
    return JSON.parse(stringifyedObject)
  }


  module.exports = transformValue;