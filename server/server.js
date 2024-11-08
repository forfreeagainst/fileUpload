const express = require("express");
const fs = require('fs');//fileSystem
const bodyParser = require("body-parser");
const multiparty = require("multiparty");
const SparkMD5 = require("spark-md5");

//创建服务
const app = express();
const PORT = 9001;
const HOST = 'http://127.0.0.1';
const HOSTNAME = `${HOST}:${PORT}`;
app.listen(PORT, () => {
    console.log(`server is created：${PORT}，YOU CAN VISIT：${HOSTNAME}`);
});

//multipart/form-data用于发送包含文件的表单数据。
//application/x-www-form-urlencoded用于不含文件的表单数据。(key1=value1&key2=value2&…)

//中间件
app.use((req, res, next) => {
  //允许来自任何域的请求访问该资源
  res.header("Access-Control-Allow-Origin", "*");
  //‌当在前端看到method为OPTIONS的请求时，这通常是一个HTTP OPTIONS请求，主要用于CORS预检。
  if (req.method === 'OPTIONS') {
      res.send('CURRENT SERVICES SUPPORT CROSS DOMAIN REQUESTS!')
  } else {
      next();
  }
});

//注意: body-parser 现在已经被认为是较旧的解决方案，
//并被 express 自带的中间件 express.json() 和 express.urlencoded() 所取代。
//不解析嵌套对象，且限制请求体大小不超过1024MB
app.use(bodyParser.urlencoded({
    extended: false,
    limit: '1024mb'
}));

// 延迟函数
const delay = function delay(interval) {
    typeof interval !== "number" ? interval = 1000 : null;
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};

// 检测文件是否存在
const exists = function exists(path) {
    return new Promise(resolve => {
        fs.access(path, fs.constants.F_OK, err => {
            if (err) {
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
};







//托管静态文件
//eg:localhost:9001/server.js
app.use(express.static('./'));
//路由匹配不到，显示
app.use((req, res) => {
    res.status(404);
    res.send('NOT FOUND!');
});
