const express = require('express');
const router = express.Router();
const conn = require('../db/db');
var svgCaptcha = require('svg-captcha');
const sms_util = require('./../util/sms_util');

let users = {}; // 用户信息

// 获取首页轮播图数据
router.get('/api/homecarousel',(req,res)=>{
  let sql = "SELECT * FROM pdd_homecasual"; 
  conn.query(sql,(error, results, fields)=>{
    if (error){
      res.json({
        code: 0,
        message: '请求数据失败'
      })
    } else {
      res.json({
        code: 200,
        message: results
      })
    }
  })
})
// 获取首页热门栏目导航图片
router.get('/api/homenav',(req,res)=>{
  let sql = "SELECT * FROM pdd_home_nav";
  conn.query(sql,(error, results, fields)=>{
    if (error){
      res.json({
        code: 0,
        message: '请求数据失败'
      })
    } else {
      res.json({
        code: 200,
        message: results
      })
    }
  })
})
// 获得首页商品列表数据
router.get('/api/shoplist',(req,res)=>{
  let results = require('../data/shopList').goods_list;
  res.json({
    code: 200,
    message: results
  })
})
// 获取推介页面商品列表数据
router.get('/api/recommend_shop_list',(req,res)=>{
  let num = req.query.num;
  let size = req.query.size;
  let sql = `SELECT * FROM pdd_recommend LIMIT ${num},${size}`;
  conn.query(sql,(error, results, fields)=>{
    if (error){
      res.json({
        code: 0,
        message: '请求数据失败'
      })
    } else {
      res.json({
        code: 200,
        message: results
      })
    }
  })
})
// 获得搜索页面的数据
router.get('/api/search',(req,res)=>{
  let results = require('../data/search').data;
  res.json({
    code: 200,
    message: results
  })
})
// 获得图形验证码
router.get('/api/captcha',(req,res)=>{
  let captcha = svgCaptcha.create({
    size: 4, // 验证码长度
    ignoreChars: '0o1i', // 验证码字符中排除 0o1i
    noise: 1, // 干扰线条的数量
    color: true, // 验证码的字符是否有颜色，默认没有，如果设定了背景，则默认有
    background: '#fff' // 验证码图片背景颜色
  });
  req.session.captcha = captcha.text.toLocaleLowerCase();
  res.type('svg');
  res.send(captcha.data);
})
// 帐号登录
router.post('/api/login_email',(req,res)=>{
  let email = req.body.email;
  let pwd = req.body.pwd;
  let captcha = req.body.captcha.toLocaleLowerCase();

  if (captcha !== req.session.captcha) {
    res.json({code: 0, message: '图形验证码不正确!'});
    return;
  }
  delete req.session.captcha;
  let selectEmail = "SELECT * FROM pdd_user_info WHERE user_email = '"+ email +"' LIMIT 1";
  conn.query(selectEmail,(error, results, fields)=>{
    if (error){
      res.json({
        code: 0,
        message: '请求数据失败'
      })
    } else {
      let results = JSON.parse(JSON.stringify(results));
      if (!results[0]) {
        res.json({
          code: 0,
          message: '用户名不存在'
        })
      } else {
        if (results[0].user_pwd !== pwd) {
          res.json({
            code: 0,
            message: '密码错误'
          })
        } else if (results[0].user_pwd == pwd){
          req.session.userId = results[0].user_id;
          res.json({
            code: 200,
            message: {
              user_id: results[0].user_id,
              user_name: results[0].user_name,
              user_phone: results[0].user_phone,
              user_email: results[0].user_email,
              user_birthday: results[0].user_birthday,
              user_address: results[0].user_address,
              user_sign: results[0].user_sign,
              user_sex: results[0].user_sex,
            },
            info: '登录成功'
          })
        }
      }
    }
  })
})
// 发送手机验证码
router.get('/api/phone_code',(req,res)=>{
  const phone = req.query.phone;
  // 生成随机验证码
  let code = sms_util.randomCode(6);
  
  users[phone] = code;
  res.json({code: 200, message: code});
})
// 手机登录
router.post('/api/login_phone',(req,res)=>{
  let phone = req.body.phone;
  let code = req.body.code;
  // 对比验证码
  if(users[phone] !== code){
    res.json({
      code: 0,
      message: '验证码错误'
    });
    return;
  }
  // 成功后删除对应的验证码
  delete users[phone];
  // 查询数据
  let sqlStr = "SELECT * FROM pdd_user_info WHERE user_phone = '" + phone + "' LIMIT 1";

  conn.query(sqlStr, (error, results, fields) => {
    if(error){
      res.json({
        code: 0,
        message: '登录异常'
      })
    }else{
      results = JSON.parse(JSON.stringify(results));
      if(results[0]){//用户已经存在
        req.session.userId = results[0].user_id;
        // 返回数据给客户端
        res.json({
            code: 200,
            message: {
              user_id: results[0].user_id,
              user_name: results[0].user_name,
              user_phone: results[0].user_phone,
              user_email: results[0].user_email,
              user_birthday: results[0].user_birthday,
              user_address: results[0].user_address,
              user_sign: results[0].user_sign,
              user_sex: results[0].user_sex,
            },
            info: '登录成功'
        });
      }else{// 新用户
        // 新用户手机登录时随机生成一个user_name
        let num = sms_util.randomCode(4);
        let num1 = sms_util.randomCode(6);
        let num2 = sms_util.randomCode(6);
        let userName = "PDD_" +  + num + num1 + num2;
        const addSql = "INSERT INTO pdd_user_info(user_name, user_phone) VALUES (?, ?)";
        const addSqlParams = [userName, phone];
        conn.query(addSql, addSqlParams, (error, results, fields)=>{
          if(error){
            res.json({
              code: 0,
              message: '登录异常'
            })
          }else{
            results = JSON.parse(JSON.stringify(results));
            req.session.userId = results.insertId;
            let sqlStr = "SELECT * FROM pdd_user_info WHERE user_id = '" + results.insertId + "' LIMIT 1";
            conn.query(sqlStr, (error, results, fields) => {
              if (error) {
                  res.json({code: 0, message: '请求数据失败'});
              } else {
                  results = JSON.parse(JSON.stringify(results));
                  // 返回数据给客户端
                  res.json({
                    code: 200,
                    message: {
                      user_id: results[0].user_id,
                      user_name: results[0].user_name,
                      user_phone: results[0].user_phone,
                      user_email: results[0].user_email,
                      user_birthday: results[0].user_birthday,
                      user_address: results[0].user_address,
                      user_sign: results[0].user_sign,
                      user_sex: results[0].user_sex,
                    },
                    info: '登录成功'
                  });
              }
            });
          }
        })
      }
    }
  })
})
// 返回用户信息，用于记录登录状态
router.get('/api/user_info',(req,res)=>{
  let userId = req.session.userId;
  let sqlStr = "SELECT * FROM pdd_user_info WHERE user_id = '" + userId + "' LIMIT 1";
  conn.query(sqlStr, (error, results, fields) => {
    if (error) {
        res.json({code: 0, message: '请求数据失败'});
    } else {
      results = JSON.parse(JSON.stringify(results));
      if (!results[0]) {
        res.json({code: 0, message: '请重新登录'});
      } else {
        // 返回数据给客户端
        res.json({
          code: 200,
          message: {
            user_id: results[0].user_id,
            user_name: results[0].user_name,
            user_phone: results[0].user_phone,
            user_email: results[0].user_email,
            user_birthday: results[0].user_birthday,
            user_address: results[0].user_address,
            user_sign: results[0].user_sign,
            user_sex: results[0].user_sex,
          },
        });
      }
    }
  });
})
// 修改用户信息
router.post('/api/set_user_info',(req,res)=>{
  let userId = req.session.userId;
  let user_name = req.body.user_name;
  let user_sex = req.body.user_sex;
  let user_address = req.body.user_address;
  let user_birthday = req.body.user_birthday;
  let user_sign = req.body.user_sign;
  let sqlStr = "UPDATE pdd_user_info SET user_name = '" + user_name + "',user_sex = '" + user_sex + "',user_address = '" + user_address + "',user_birthday = '"+ user_birthday + "',user_sign = '"+ user_sign + "' WHERE user_id = '"+ userId + "'";
  conn.query(sqlStr, (error) =>{
    if (error) {
      res.json({
        code: 0,
        message: '更新信息失败',
      })
    } else {
      let sqlStr = "SELECT * FROM pdd_user_info WHERE user_id = '" + userId + "' LIMIT 1";
      conn.query(sqlStr,(error, results, fields) => {
        if (error) {
          res.json({
            code: 0,
            message: '更新信息失败',
          })
        } else {
          if (results[0]){
            results = JSON.parse(JSON.stringify(results));
            res.json({
              code: 200,
              message: {
                user_id: results[0].user_id,
                user_name: results[0].user_name,
                user_phone: results[0].user_phone,
                user_email: results[0].user_email,
                user_birthday: results[0].user_birthday,
                user_address: results[0].user_address,
                user_sign: results[0].user_sign,
                user_sex: results[0].user_sex,
              },
            })
          } else {
            res.json({
              code: 0,
              message: '更新信息失败',
            })
          }
        }
      })
    }
  })
})
// 退出登录
router.get('/api/login_out',(req,res)=>{
  delete req.session.userId;
  res.json({
    code: 200,
    message: '退出成功'
  })
})
// 添加到购物车
router.post('/api/add_car',(req,res)=>{
  let user_id = req.session.userId;
  let goods_id = req.body.goods_id;
  let thumb_url = req.body.thumb_url;
  let price = req.body.price;
  let goods_name = req.body.goods_name;
  let goods_amount = req.body.goods_amount || 1;
  let sql_select = "SELECT * FROM pdd_car WHERE user_id = '"+ user_id +"' AND goods_id ='" + goods_id + "'";
  conn.query(sql_select, (error, results, fields) => {
    if (error) {
      res.json({code: 0,message: '添加到购物车出错！'});
    } else {
      if (results[0]) {
        results = JSON.parse(JSON.stringify(results));
        let goods_amount = results[0].goods_amount + 1;
        let sql_updata = "UPDATE pdd_car SET goods_amount = '"+ goods_amount +"' WHERE user_id = '"+ user_id +"' AND goods_id ='" + goods_id + "'";
        conn.query(sql_updata, (error, results, fields) => {
          if (error) {
            res.json({code: 0,message: '添加到购物车失败！'});
          } else {
            res.json({code: 200,message: '添加到购物车成功！'});
          }
        })
      } else {
        let sql_insert = "INSERT INTO pdd_car(user_id, goods_id, thumb_url, price, goods_name, goods_amount) VALUES (?, ?, ?, ?, ?, ?)";
        const addSqlParams = [user_id, goods_id, thumb_url, price, goods_name, goods_amount];
        conn.query(sql_insert, addSqlParams, (error, results, fields)=>{
          if (error) {
            res.json({code: 0,message: '添加到购物车出错！'});
          } else {
            res.json({code: 200,message: '添加到购物车成功！'});
          }
        })
      }
    }
  })
})
// 返回每个用户的购物车数据
router.get('/api/shop_car_list',(req,res)=>{
  let user_id = req.session.userId;
  if (user_id) {
    let sql_select = "SELECT * FROM pdd_car WHERE user_id = '"+ user_id +"'";
    conn.query(sql_select,(error, results, fields)=>{
      results = JSON.parse(JSON.stringify(results));
      if (error) {
        res.json({code: 0,message: '获取商品列表出错！'});
      } else {
        if(results){
          res.json({
            code: 200,
            message: results
          })
        }else{
          res.json({
            code: 200,
            message: results
          })
        }
      }
    });
  } else {
    res.json({code: 0,message:"请重新登录"})
  }
})
// 购物车加减按钮
router.post('/api/set_shop_count',(req,res)=>{
  let user_id = req.session.userId;
  let goods_id = req.body.goods_id;
  let goods_amount = req.body.goods_amount || 1;
  let isAdd = req.body.isAdd;
  if(user_id){
    if(isAdd) {
      goods_amount = goods_amount + 1;
    } else {
      if (goods_amount > 1){
        goods_amount = goods_amount - 1;
      } else {
        return;
      }
    }
    let sql_updata = "UPDATE pdd_car SET goods_amount = '"+ goods_amount +"' WHERE user_id = '"+ user_id +"' AND goods_id ='" + goods_id + "'";
    conn.query(sql_updata, (error, results, fields) => {
      if (error) {
        res.json({code: 0,message: '失败！'});
      } else {
        let sql_select = "SELECT * FROM pdd_car WHERE user_id = '"+ user_id +"'";
        conn.query(sql_select, (error, results, fields) => {
          if(error){
            res.json({code: 0,message: '失败！'});
          }else{
            if(results) {
              results = JSON.parse(JSON.stringify(results));
              res.json({code: 200,message: results});
            } else {
              res.json({code: 0,message: '失败！'});
            }
          }
        })
      }
    })
  } else {
    res.json({code: 0,message: '请先登录！'});
  }
})
// 购物车商品删除按钮
router.post('/api/delete_shop',(req,res)=>{
  let user_id = req.session.userId;
  let goods_id = req.body.goods_id;
  let sql_delete = "DELETE FROM pdd_car WHERE user_id = '"+ user_id +"' AND goods_id = '"+ goods_id + "'";
  if(user_id){
    conn.query(sql_delete, (error, results, fields) => {
      if (error) {
        res.json({
          code: 0,
          message: '删除失败'
        })
      } else {
        res.json({
          code: 200,
          message: '删除成功'
        })
      }
    })
  }else{
    res.json({
      code: 0,
      message: '删除失败'
    })
  }
  
})
module.exports = router;
