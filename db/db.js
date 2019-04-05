const mysql = require('mysql');
// import mysql from 'mysql';
const  conn = mysql.createConnection({
    host: '127.0.0.1', // 数据库的地址
    user: 'root', // 账号
    password: 'root', // 密码
    database: 'luo_pdd', // 数据库名称
});
conn.connect((err)=>{
    if (err) {
        console.log('数据库连接出错');
    }
    console.log('数据库连接成功');
});

module.exports = conn;