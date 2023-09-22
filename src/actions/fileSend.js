const fs = require('fs');
const path = require("path");
const fileSend = (req, res, example) => {
    const { path: filepath } = example.payload;
    const fileLocation = path.join(process.cwd(), filepath)
    if (fs.existsSync(fileLocation)) {
      return res.sendFile(fileLocation);
    }
    return res.send(example);
  }

  module.exports = fileSend