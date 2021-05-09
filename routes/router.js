/**
 * 路由模块
 */

//使用express提供的路由管理方式
var express = require('express')
var path = require('path')
var mysql = require('mysql')
var fs = require('fs')

//创建路由容器
var router = express.Router()

//获取客户端的IP地址
function getClientIp(req) {
    var ipAddress;
    var forwardedIpsStr = req.header('x-forwarded-for');
    if (forwardedIpsStr) {
        var forwardedIps = forwardedIpsStr.split(',');
        ipAddress = forwardedIps[0];
    }
    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }
    return ipAddress;
}

//将Date日期格式化
function format(now) {
    var year = now.getFullYear()
    var month = now.getMonth() + 1
    month = month < 10 ? '0' + month : month
    var day = now.getDate()
    day = day < 10 ? '0' + day : day
    var hours = now.getHours()
    hours = hours < 10 ? '0' + hours : hours
    var minutes = now.getMinutes()
    minutes = minutes < 10 ? '0' + minutes : minutes
    var seconds = now.getSeconds()
    seconds = seconds < 10 ? '0' + seconds : seconds
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds
}

//将毫秒数格式化为分秒
function duration(time) {
    var minutes = parseInt(time / 1000 / 60)
    minutes = minutes < 10 ? '0' + minutes : minutes
    var seconds = parseInt(time / 1000 % 60)
    seconds = seconds < 10 ? '0' + seconds : seconds
    return minutes + '分' + seconds + '秒'
}

//创建数据库连接
var connection = mysql.createConnection({
    host: '47.113.99.209',
    user: 'root',
    password: 'MySQL0523',
    database: 'nodeweb'
})
//连接数据库
connection.connect()

//挂载路由到路由容器中
router.get('/', (req, res) => {
    res.render('index.html')
})

router.get('/login', (req, res) => {
    res.render('login.html')
})

router.post('/login', (req, res) => {
    var body = req.body
    var identity = body.identity

    if (identity == '用户') {
        connection.query(`SELECT * FROM user_info where username='${body.username}' and password='${body.password}' `, function (error, results) {
            if (error) {
                res.send('sorry, server error!')
                return
            }
            if (results.length === 0) {
                res.render('login.html', {
                    err_message: '账户名或密码错误',
                    form: body
                })
            } else {
                var ip = getClientIp(req)
                var loginTime = +new Date()
                req.session.user = results[0]
                req.session.user.loginTime = loginTime
                req.session.user.ip = ip
                req.session.user.userType = identity
                res.redirect('/index')
            }
        });
    } else if (identity == '销售人员') {
        connection.query(`select * from salesman_info where username='${body.username}' and password='${body.password}'`, function (error, results) {
            if (error) {
                res.send('sorry, server error!')
                return
            }
            if (results.length === 0) {
                res.render('login.html', {
                    err_message: '账户名或密码错误',
                    form: body
                })
            } else {
                var ip = getClientIp(req)
                var loginTime = new Date()
                req.session.user = results[0]
                req.session.user.loginTime = loginTime
                req.session.user.ip = ip
                req.session.user.userType = identity
                res.redirect('/salesman')
            }
        })
    } else {
        connection.query(`select * from manager_info where username='${body.username}' and password='${body.password}'`, function (error, results) {
            if (error) {
                res.send('sorry, server error!')
                return
            }
            if (results.length === 0) {
                res.render('login.html', {
                    err_message: '账户名或密码错误',
                    form: body
                })
            } else {
                var ip = getClientIp(req)
                var loginTime = new Date()
                req.session.user = results[0]
                req.session.user.loginTime = loginTime
                req.session.user.ip = ip
                req.session.user.userType = '管理员'
                res.redirect('/delSalesman')
            }
        })
    }

})

router.get('/register', (req, res) => {
    res.render('register.html')
})

router.post('/register', (req, res) => {
    var body = req.body
    if (body.username == '' || body.password == '' || body.password2 == '') {
        res.render('register.html', {
            err_message: '账户名或密码不能为空',
            form: body
        })
    } else if (!/^\w{1,12}$/.test(body.username.trim())) {
        res.render('register.html', {
            err_message: '账户名格式有误'
        })
    } else if (!/^[a-zA-Z0-9]{4,12}$/.test(body.password.trim())) {
        res.render('register.html', {
            err_message: '密码格式有误',
            form: body
        })
    } else if (body.password !== body.password2) {
        res.render('register.html', {
            err_message: '两次密码不相同',
            form: body
        })
    } else {
        connection.query(`select * from user_info where username='${body.username}'`, function (error, results) {
            if (error) {
                res.send('sorry, server error!')
                return
            }
            if (results.length !== 0) {
                res.render('register.html', {
                    err_message: '该账户名已存在',
                    form: body
                })
            } else {
                connection.query(`insert into user_info values('${body.username}','${body.password}')`, function (error, results) {
                    if (error) {
                        res.send('sorry, server error!')
                        return
                    }
                    res.statusCode = 302
                    res.setHeader('Location', '/login')
                    res.end()
                })
            }
        })
    }


})

router.get('/index', (req, res) => {
    if (req.session.user) {
        connection.query(`SELECT COUNT(*) FROM cart WHERE username='${req.session.user.username}'`, (error, results) => {
            if (error) {
                res.send('查询购物车出错……')
                return
            }
            res.render('index.html', {
                user: req.session.user,
                amount: results[0]['COUNT(*)']
            })
        })
    } else {
        res.render('index.html', {
            user: req.session.user
        })
    }
})

router.post('/index', (req, res) => {
    res.render('index.html')
})

router.get('/logout', (req, res) => {
    var logout = new Date()
    var login = new Date(req.session.user.loginTime)
    var last = logout - login

    var loginTime = format(login)
    var logoutTime = format(logout)
    var durationTime = duration(last)
    var user = req.session.user

    if (req.session.user.userType === '用户') {
        connection.query(`insert into user_login values('${user.username}','${loginTime}','${logoutTime}','${user.ip}','${durationTime}')`, err => {
            if (err) {
                return res.send('保存登录状态时出错')
            }
            delete req.session.user
            res.redirect('/login')
        })
    } else {
        connection.query(`insert into staff_login values('${user.username}','${loginTime}','${logoutTime}','${user.ip}','${durationTime}')`, err => {
            if (err) {
                return res.send('保存登录状态时出错')
            }
            delete req.session.user
            res.redirect('/login')
        })
    }
})

router.get('/mobile', (req, res) => {
    connection.query(`select * from mobiles where type='1' order by sales desc`, function (error, results) {
        if (error) {
            res.send('sorry, server error!')
            return
        }
        res.render('mobile.html', {
            mobiles: results,
            user: req.session.user
        })
    })
})

router.get('/electrical', (req, res) => {
    connection.query(`select * from mobiles where type='2' order by sales desc`, function (error, results) {
        if (error) {
            res.send('sorry, server error!')
            return
        }
        res.render('electrical.html', {
            electricals: results,
            user: req.session.user
        })
    })
})

router.post('/electrical', (req, res) => {
    if (req.session.user) {
        var ids = req.body.mobileID
        var user = req.session.user
        if (ids instanceof Array) {
            const promises = ids.map(id => {
                return new Promise((resolve, reject) => {
                    connection.query(`select * from mobiles where id='${id}'`, (error, results) => {
                        if (error) {
                            reject('加入购物车时查询商品信息出错……')
                        }
                        resolve(results[0])
                    })
                })
            })
            Promise.all(promises).then(datas => {
                req.session.productsToCart = datas
                const promises2 = ids.map(id => {
                    return new Promise((resolve, reject) => {
                        //查询该用户的购物车有无该电器商品
                        connection.query(`select * from cart where username='${user.username}' and productID='${id}'`, (error, results) => {
                            if (error) {
                                reject(error)
                            }
                            if (results[0]) {
                                req.session.productsToCart = req.session.productsToCart.filter(item => item.id != results[0].productID)
                            }
                            resolve(results)
                        })
                    })
                })
                Promise.all(promises2).then(results => {
                    var toCart = req.session.productsToCart
                    const promises4 = toCart.map(item => {
                        return new Promise((resolve, reject) => {
                            connection.query(`insert into cart values('${user.username}','${item.id}','${item.mobilename}','${item.price}',1)`, error => {
                                if (error) {
                                    reject(error)
                                }
                                resolve()
                            })
                        })
                    })

                    const promises3 = results.map(item => {
                        return new Promise((resolve, reject) => {
                            if (item[0]) {
                                connection.query(`update cart set amount=amount+1 where username='${user.username}' and productID='${item[0].productID}'`, (error) => {
                                    if (error) {
                                        reject(error)
                                    }
                                    resolve()
                                })
                            } else {
                                resolve()
                            }
                        })
                    })
                    Promise.all([...promises3, ...promises4]).then(success => {
                        res.json({
                            err_code: 1
                        })
                    })
                })
            })
        } else {
            connection.query(`select * from cart where username='${user.username}' and productID='${ids}'`, (error, results) => {
                if (error) {
                    return res.send('error')
                }
                if (results[0]) {
                    connection.query(`update cart set amount=amount+1 where username='${user.username}' and productID='${ids}'`, (error) => {
                        if (error) {
                            return res.send('error')
                        }
                        res.json({
                            err_code: 1
                        })
                    })
                } else {
                    connection.query(`select * from mobiles where id='${ids}'`, (error, results) => {
                        if (error) {
                            return res.send('error')
                        }
                        connection.query(`insert into cart values('${user.username}','${ids}','${results[0].mobilename}','${results[0].price}',1)`, err => {
                            if (err) {
                                return res.send('error')
                            }
                            res.json({
                                err_code: 1
                            })
                        })
                    })
                }
            })
        }
    } else {
        res.json({
            err_code: 0
        })
    }
})

router.get('/computer', (req, res) => {
    connection.query(`select * from mobiles where type='3'  order by sales desc`, function (error, results) {
        if (error) {
            res.send('sorry, server error!')
            return
        }
        res.render('computer.html', {
            computers: results,
            user: req.session.user
        })
    })
})

router.get('/clothes', (req, res) => {
    connection.query(`select * from mobiles where type='4'  order by sales desc`, function (error, results) {
        if (error) {
            res.send('sorry, server error!')
            return
        }
        res.render('clothes.html', {
            clothes: results,
            user: req.session.user
        })
    })
})

router.get('/cartAjax', (req, res) => {
    if (!req.session.user) {
        res.json({
            err_code: 0
        })
    } else {
        res.json({
            err_code: 1
        })
    }
})

router.get('/cart', (req, res) => {
    var user = req.session.user
    connection.query(`select * from cart where username='${user.username}'`, (error, results) => {
        if (error) {
            res.send('查询购物车出错了……')
            return
        }
        res.render('cart.html', {
            carts: results,
            user: user
        })
    })
})

router.post('/order', (req, res) => {
    //{ productID: [ '10001', '10003', '10004' ] }
    if (req.body.productID) {
        var user = req.session.user
        //下单多个商品
        if (req.body.productID instanceof Array) {
            const promises = req.body.productID.map(function (id) {
                return new Promise((resolve, reject) => {
                    connection.query(`select * from cart where username='${user.username}' and productID='${id}'`, (error, results) => {
                        if (error) {
                            reject('订单页面，查询购物车信息出错……')
                        }
                        resolve(results[0])
                    })
                })
            })
            Promise.all(promises).then(function (datas) {
                var total = 0
                datas.forEach(item => {
                    item.price = parseInt(item.price)
                    total += parseInt(item.price) * item.amount
                })
                //把即将下单的商品记录在session中
                req.session.orders = datas
                res.render('order.html', {
                    user: user,
                    orders: datas,
                    total: total
                })
            })
        } else { //只下单一个商品
            connection.query(`select * from cart where username='${user.username}' and productID='${req.body.productID}'`, (error, results) => {
                if (error) {
                    reject('订单页面，查询购物车信息出错……')
                }
                var total = 0
                results.forEach(item => {
                    item.price = parseInt(item.price)
                    total += parseInt(item.price) * item.amount
                })
                //把即将下单的商品记录在session中
                req.session.orders = results
                res.render('order.html', {
                    user: user,
                    orders: results,
                    total: total
                })
            })
        }
    } else {
        res.redirect('/cart')
    }
})

router.post('/records', (req, res) => {
    //获取保存在session中的下单的商品信息
    const records = req.session.orders
    const now = new Date()
    var date = format(now)
    records.forEach(item => {
        item.date = date
        item.total = item.price * item.amount
        item.type = item.productID[0]
    })

    //添加用户购买记录
    const promises1 = records.map(item => {
        return new Promise((resolve, reject) => {
            connection.query(`insert into records values('${item.username}','${item.productID}',${item.price},${item.amount},${item.total},'${item.type}','${item.date}')`, (error) => {
                if (error) {
                    reject(error)
                }
                resolve()
            })
        })
    })

    //删除用户购物车中对应的商品信息
    const promises2 = records.map(item => {
        return new Promise((resolve, reject) => {
            connection.query(`delete from cart where username='${item.username}' and productID='${item.productID}'`, error => {
                if (error) {
                    reject(error)
                }
                resolve()
            })
        })
    })

    //修改对应商品的销售量
    const promises3 = records.map(item => {
        return new Promise((resolve, reject) => {
            connection.query(`update mobiles set sales=sales+${item.amount} where id='${item.productID}'`, error => {
                if (error) {
                    reject(error)
                }
                resolve()
            })
        })
    })

    Promise.all([...promises1, ...promises2, ...promises3]).then((success) => {
        res.json({
            err_code: 1
        })
    })
})

router.get('/salesman', (req, res) => {
    var type = req.session.user.username[4]
    connection.query(`select * from mobiles where type='${type}'`, (err, results) => {
        if (err) {
            return res.send('查询商品表出错')
        }
        res.render('../views/salestaff/salesman.html', {
            products: results,
            user: req.session.user
        })
    })

})

router.post('/salesman', (req, res) => {
    // req.body:
    // {productID: [ '20011', '22211', '22411', '22251' ]}
    // { productID: '20011' }
    var ids = req.body.productID
    if (ids instanceof Array) {
        const promises = ids.map(id => {
            return new Promise((resolve, reject) => {
                connection.query(`delete from mobiles where id='${id}'`, err => {
                    if (err) {
                        reject(err)
                    }
                    resolve()
                })
            })
        })
        Promise.all(promises).then(success => {
            res.json({
                err_code: 1
            })
        })
    } else {
        connection.query(`delete from mobiles where id='${ids}'`, err => {
            if (err) {
                return res.send('删除商品出错')
            }
            res.json({
                err_code: 1
            })
        })
    }
})

router.get('/addProduct', (req, res) => {
    res.render('../views/salestaff/addProduct.html', {
        user: req.session.user
    })
})

router.post('/addProduct', (req, res) => {
    /**
     * {
        productName: 'err',
        price: '123',
        hand: 'add'
        }
     */
    // console.log(req.body);
    var body = req.body
    if (body.hand === 'add') {
        var type = req.session.user.username[4]
        var id = type
        for (var i = 0; i < 4; i++) {
            id += parseInt(Math.random() * 9)
        }
        connection.query(`select id from mobiles`, (err, results) => {
            if (err) {
                return res.send('查询商品出错')
            }
            var allIds = results.map(item => {
                return item.id
            })
            while (allIds.indexOf(id) !== -1) {
                id = type
                for (var i = 0; i < 4; i++) {
                    id += parseInt(Math.random() * 9)
                }
            }

            connection.query(`insert into mobiles values('${id}','${body.productName}',${parseInt(body.price)},0,'${type}')`, err => {
                if (err) {
                    return res.send('插入商品信息出错')
                }
                res.json({
                    err_code: 1
                })
            })
        })
    } else {
        connection.query(`select * from mobiles where id='${body.productID}'`, (err, results) => {
            if (err) {
                return res.send('查询商品出错')
            }
            if (results.length === 0) {
                res.json({
                    err_code: 0
                })
            } else {
                connection.query(`update mobiles set price=${parseInt(body.price)} where id='${body.productID}'`, err => {
                    if (err) {
                        return res.send('修改商品信息出错')
                    }
                    res.json({
                        err_code: 1
                    })
                })
            }
        })
    }

})

router.get('/records', (req, res) => {
    var type = req.session.user.username[4]
    connection.query(`SELECT * FROM records WHERE TYPE='${type}' ORDER BY DATE DESC`, (err, results) => {
        if (err) {
            return res.send('查询用户购买记录出错')
        }
        res.render('../views/salestaff/records.html', {
            user: req.session.user,
            records: results
        })
    })
})

router.get('/delSalesman', (req, res) => {
    connection.query(`select * from salesman_info`, (err, results) => {
        if (err) {
            return res.send('查询销售人员ID出错')
        }
        res.render('../views/manager/delSalesman.html', {
            user: req.session.user,
            salesID: results
        })
    })
})

router.post('/delSalesman', (req, res) => {
    var names = req.body.username
    if (names instanceof Array) {
        const promises = names.map(item => {
            return new Promise((resolve, reject) => {
                connection.query(`delete from salesman_info where username='${item}'`, err => {
                    if (err) {
                        reject(err)
                    }
                    resolve()
                })
            })
        })
        Promise.all(promises).then(success => {
            res.json({
                err_code: 1
            })
        })
    } else {
        connection.query(`delete from salesman_info where username='${names}'`, err => {
            if (err) {
                return res.send('删除销售人员ID出错')
            }
            res.json({
                err_code: 1
            })
        })
    }
})

router.get('/addSalesman', (req, res) => {
    res.render('../views/manager/addSalesman.html', {
        user: req.session.user
    })
})

router.post('/addSalesman', (req, res) => {
    var body = req.body
    if (body.hand === 'add') {
        if (!/^[a-zA-Z]{4}[1-9]$/.test(body.username)) {
            res.json({
                err_code: 0
            })
        } else if (!/^\w{4,12}$/.test(body.password)) {
            res.json({
                err_code: 0
            })
        } else {
            connection.query(`select * from salesman_info where username='${body.username}'`, (err, results) => {
                if (err) {
                    return res.send('检查销售人员ID是否存在出错')
                }
                if (results[0]) {
                    res.json({
                        err_code: 3
                    })
                } else {
                    connection.query(`insert into salesman_info values('${body.username}','${body.password}')`, err => {
                        if (err) {
                            return res.send('插入ID出错')
                        }
                        res.json({
                            err_code: 1
                        })
                    })
                }
            })
        }
    } else {
        if (!/^\w{4,12}$/.test(body.password)) {
            res.json({
                err_code: 3
            })
        } else {
            connection.query(`select * from salesman_info where username='${body.username}'`, (err, results) => {
                if (err) {
                    return res.send('检查销售人员ID是否存在出错')
                }
                if (results.length === 0) {
                    res.json({
                        err_code: 0
                    })
                } else {
                    connection.query(`update salesman_info set password='${body.password}' where username='${body.username}'`, err => {
                        if (err) {
                            return res.send('修改口令出错')
                        }
                        res.json({
                            err_code: 1
                        })
                    })
                }
            })
        }
    }
})

router.get('/checkRecords', (req, res) => {
    connection.query(`select * from records order by date desc`, (err, results) => {
        if (err) {
            return res.send('查询购买记录出错')
        }
        res.render('../views/manager/checkRecords.html', {
            user: req.session.user,
            records: results
        })
    })
})

router.post('/checkRecords', (req, res) => {
    // { type: '1' }
    var body = req.body
    if (body.type === '0') {
        connection.query(`select * from records order by date desc`, (err, results) => {
            if (err) {
                return res.send('查询购买记录出错')
            }
            res.render('../views/manager/checkRecords.html', {
                user: req.session.user,
                records: results
            })
        })
    } else {
        connection.query(`select * from records where type='${body.type}' order by date desc`, (err, results) => {
            if (err) {
                return res.send('查询购买记录出错')
            }
            res.render('../views/manager/checkRecords.html', {
                user: req.session.user,
                records: results
            })
        })
    }
})

router.get('/performance', (req, res) => {
    /*
    [
        RowDataPacket { TYPE: '1', total: 358471, amount: 118 },
        RowDataPacket { TYPE: '2', total: 35591, amount: 9 },
        RowDataPacket { TYPE: '3', total: 6269, amount: 1 },
        RowDataPacket { TYPE: '4', total: 973, amount: 5 }
    ]
    */
    connection.query(`SELECT TYPE,SUM(total) total,SUM(amount) amount FROM records GROUP BY TYPE order by total desc`, (err, results) => {
        if (err) {
            return res.send('统计销售业绩出错')
        }
        results.forEach(item => {
            if (item.TYPE === '1') {
                item.cate = '手机'
            } else if (item.TYPE === '2') {
                item.cate = '家用电器'
            } else if (item.TYPE === '3') {
                item.cate = '电脑办公'
            } else if (item.TYPE === '4') {
                item.cate = '服装'
            }
        })
        res.render('../views/manager/performance.html', {
            user: req.session.user,
            records: results
        })
    })
})

router.get('/loginStatus', (req, res) => {
    connection.query(`select * from user_login order by logoutTime desc`, (err, results) => {
        if (err) {
            return res.send('查询用户登录状态出错')
        }
        res.render('../views/manager/loginStatus.html', {
            user: req.session.user,
            records: results
        })
    })
})

router.post('/loginStatus', (req, res) => {
    var body = req.body
    if (body.userType === '1') {
        connection.query(`select * from user_login order by logoutTime desc`, (err, results) => {
            if (err) {
                return res.send('查询用户登录状态出错')
            }
            res.render('../views/manager/loginStatus.html', {
                user: req.session.user,
                records: results
            })
        })
    } else {
        connection.query(`select * from staff_login order by logoutTime desc`, (err, results) => {
            if (err) {
                return res.send('查询用户登录状态出错')
            }
            res.render('../views/manager/loginStatus.html', {
                user: req.session.user,
                records: results
            })
        })
    }
})

router.get('/userPicture', (req, res) => {
    connection.query(`select username from user_info`, (err, results) => {
        if (err) {
            return res.send('查询所有用户ID出错')
        }
        res.render('../views/manager/userPicture.html', {
            user: req.session.user,
            consumers: results
        })
    })
})

router.post('/userPicture', (req, res) => {
    var username = req.body.username
    var avgConsumption = 0
    var avgDuration = 0
    var situations = null
    var consumers = null

    const p1 = new Promise((resolve, reject) => {
        connection.query(`SELECT AVG(total) average FROM records WHERE username='${username}'`, (err, results) => {
            if (err) {
                reject('计算平均消费总额出错')
            }
            avgConsumption = parseInt(results[0].average)
            resolve()
        })
    })

    const p2 = new Promise((resolve, reject) => {
        connection.query(`SELECT duration FROM user_login WHERE username='${username}'`, (err, results) => {
            if (err) {
                reject('计算平均用户登录时长出错')
            }
            results = results.map(item => {
                return item.duration
            })
            var mins = results.map(item => {
                return item.substring(0, item.indexOf('分'))
            })
            var secs = results.map(item => {
                return item.slice(item.indexOf('分') + 1, -1)
            })

            var sumMins = 0
            mins.forEach(item => {
                sumMins += parseInt(item)
            })
            var avgMins = (sumMins / mins.length).toFixed(2)

            var sumSecs = 0
            secs.forEach(item => {
                sumSecs += parseInt(item)
            })
            var avgSecs = ((sumSecs / secs.length) / 60).toFixed(2)
            avgDuration = ((avgMins / 1) + (avgSecs / 1)).toFixed(2) / 1

            resolve()
        })
    })

    const p3 = new Promise((resolve, reject) => {
        connection.query(`SELECT TYPE,SUM(amount) amount,SUM(total) total FROM records WHERE username='${username}' GROUP BY TYPE ORDER BY amount DESC`, (err, results) => {
            if (err) {
                reject('计算用户各类商品消费情况出错')
            }
            if (results.length !== 0) {
                situations = results
                situations.forEach(item => {
                    switch (item.TYPE) {
                        case '1':
                            item.TYPE = '手机'
                            break
                        case '2':
                            item.TYPE = '家用电器'
                            break
                        case '3':
                            item.TYPE = '电脑办公'
                            break
                        case '4':
                            item.TYPE = '服装'
                            break
                    }
                })
            }

            resolve()
        })
    })

    const p4 = new Promise((resolve, reject) => {
        connection.query(`select username from user_info`, (err, results) => {
            if (err) {
                reject('查询所有用户ID出错')
            }
            consumers = results
            resolve()
        })
    })

    Promise.all([p1, p2, p3, p4]).then(success => {
        var evaluation = {}
        if (avgConsumption < 1000) {
            evaluation.level = '普通水平'
            evaluation.cc = '一般'
        } else if (avgConsumption < 5000) {
            evaluation.level = '高级水平'
            evaluation.cc = '较强'
        } else {
            evaluation.level = 'VIP水平'
            evaluation.cc = '极强'
        }

        if (avgDuration < 2) {
            evaluation.sticky = '一般'
        } else if (avgDuration < 5) {
            evaluation.sticky = '较好'
        } else {
            evaluation.sticky = '很好'
        }

        res.render('../views/manager/userPicture.html', {
            user: req.session.user,
            username: username,
            consumers: consumers,
            avgConsumption: avgConsumption,
            avgDuration: avgDuration,
            situations: situations,
            evaluation: evaluation
        })
    })
})

router.get('/recommend', (req, res) => {
    if (req.session.user) {
        var username = req.session.user.username
        const p = new Promise((resolve, reject) => {
            connection.query(`SELECT TYPE,SUM(amount) amount FROM records WHERE username='${username}' GROUP BY TYPE ORDER BY amount DESC`, (err, results) => {
                if (err) {
                    reject('计算用户各类商品消费情况出错')
                }
                resolve(results)
            })
        })
        p.then(situations => {
            //计算各类商品的推荐条数
            var sumAmount = 0
            situations.forEach(item => {
                sumAmount += item.amount
            })
            situations.forEach(item => {
                item.amount = Math.ceil((item.amount / sumAmount) * 10)
            })
            //根据上述计算条数随机查询各类商品n条数据
            const promises = situations.map(item => {
                return new Promise((resolve, reject) => {
                    connection.query(`select * from mobiles where type='${item.TYPE}' order by rand() limit ${item.amount}`, (err, results) => {
                        if (err) {
                            reject('随机查询商品信息时出错')
                        }
                        resolve(results)
                    })
                })
            })
            return Promise.all(promises)
        }).then(datas => {
            //把数据转换成对象数组的格式
            var mobiles = []
            datas.forEach(item => {
                mobiles.push(...item)
            })
            res.render('../views/recommend.html', {
                user: req.session.user,
                mobiles: mobiles
            })
        })
    } else {
        //若没有登录，则随机推荐10条商品数据
        connection.query(`select * from mobiles order by rand() limit 10`, (err, results) => {
            if (err) {
                return res.send('随机查询商品信息时出错')
            }
            res.render('../views/recommend.html', {
                user: req.session.user,
                mobiles: results
            })
        })

    }
})

router.post('/searchPrice', (req, res) => {
    var lowprice = req.body.lowprice
    var highprice = req.body.highprice
    var type = req.body.type
    if (isNaN(Number(lowprice)) || isNaN(Number(highprice)) || lowprice == '' || highprice == '') {
        switch (type) {
            case '1':
                res.redirect('/mobile')
                break
            case '2':
                res.redirect('/electrical')
                break
            case '3':
                res.redirect('/computer')
                break
            case '4':
                res.redirect('/clothes')
                break
        }
    } else {
        lowprice = Number(lowprice)
        highprice = Number(highprice)
        if (lowprice > highprice) {
            var temp = lowprice
            lowprice = highprice
            highprice = temp
        }
        connection.query(`SELECT * FROM mobiles WHERE TYPE='${type}' AND price BETWEEN ${lowprice} AND ${highprice}`, (err, results) => {
            if (err) {
                return res.send('查询商品出错')
            }
            switch (type) {
                case '1':
                    res.render('../views/mobile.html', {
                        user: req.session.user,
                        mobiles: results
                    })
                    break
                case '2':
                    res.render('../views/electrical.html', {
                        user: req.session.user,
                        electricals: results
                    })
                    break
                case '3':
                    res.render('../views/computer.html', {
                        user: req.session.user,
                        computers: results
                    })
                    break
                case '4':
                    res.render('../views/clothes.html', {
                        user: req.session.user,
                        clothes: results
                    })
                    break
            }
        })
    }
})

//导出路由
module.exports = router