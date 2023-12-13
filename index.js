const server = require('./src/app.js');
const axios = require('axios');         
const swaggerDocs = require("../API-clientes-Advantech/src/swagger.js")

server.listen(3001, () => {
  console.log('%s listening at 3001'); // eslint-disable-line no-console
  swaggerDocs(server, 3001);
});