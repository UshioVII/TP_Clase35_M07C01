
const getUrl = (req) => {
    return `${req.protocol}://${req.get('host')}${req.originalUrl}`
}

const getUrlBase = (req) => {
    return `${req.protocol}://${req.get('host')}`
}

module.exports = {
    getUrl,
    getUrlBase
}