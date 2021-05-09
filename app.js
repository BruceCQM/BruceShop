var express = require('express')
var bodyParser = require('body-parser')
var path = require('path')
var router = require('./routes/router')
var session = require('express-session')

var app = express()

//开放静态资源
app.use('/public/', express.static('./public/'))
app.use('/node_modules/', express.static('./node_modules/'))

//配置art-template模板引擎,设置默认目录
app.engine('html', require('express-art-template'))
app.set('views', path.join(__dirname, './views/'))

// 配置body-parser
app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json())

//配置session
//该插件会为req请求对象添加一个成员:req.session默认是一个对象
app.use(session({
    //配置加密字符串，他会在原有的基础上和字符串拼接起来去加密
    //目的是为了增加安全性，防止客户端恶意伪造
    secret: 'Bruce',
    resave: false,
    saveUninitialized: false, //无论是否用Session，都默认直接分配一把钥匙
}))

//挂载路由容器到app服务中
app.use(router)

app.listen(5000, '0.0.0.0', function () {
    console.log('server running at 5000...')
})