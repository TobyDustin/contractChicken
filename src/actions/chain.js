const fetch = require("../utils/fetch");
const transformValue = require("../utils/transformValue");

const getChainObjects = (chains) => new Promise(async (resolve, reject) => {
    const chainNames = Object.keys(chains)
    const urls = chainNames.map((name) => chains[name].url)

    const requests = urls.map((url) => fetch(url));
    const responses = await Promise.all(requests);

    const errors = responses.filter((response) => !response.ok);

    if (errors.length > 0) {
        throw errors.map((response) => Error(response.statusText));
    }

    const json = responses.map((response) => response.json());
    const data = await Promise.all(json);

    const chainObjects = {}
    chainNames.forEach((name, index) => {
        chainObjects[name] = data[index]
    })

    return resolve(chainObjects);
})


const chain = async (req, res, example) => {
    const { payload } = example;
    const chainNames = Object.keys(payload.chains);
    const chainResponseObjects = await getChainObjects(payload.chains)
    const transformedValue = transformValue(payload.value, chainResponseObjects)
    return res.send(transformedValue)
}

module.exports = chain;