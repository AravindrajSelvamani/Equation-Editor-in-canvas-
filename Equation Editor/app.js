var express = require('express');
var app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.get('/', function(req, res) {
    res.render('index');
});
app.listen(8080);
console.log('start in http://localhost:8080');