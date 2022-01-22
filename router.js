module.exports = (app) => {
    // '/'
    app.use('/', require('./routes/index'));
    // '/authorize'
    app.use('/api', require('./routes/api'));
}