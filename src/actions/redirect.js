const redirect = (req, res, example) => {
    const { url: urlIn } = example.payload;
    const url = new URL(urlIn)
    return res.redirect(url.toString());
  }

  module.exports = redirect