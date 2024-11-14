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
const delay = function (interval) {
    typeof interval !== "number" ? interval = 1000 : null;
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};

// 检测文件是否存在
const exists = function (path) {
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

//__dirname获取当前文件所在的路径，D:\github-repo\file-upload\server
const uploadDir = `${__dirname}/upload`;
// req是请求参数
const multiparty_upload = function (req, isConfigUploadDir = false) {
    const options = {
        maxFieldsSize: 200 * 1024 * 1024//200MB
    }
    if (!!isConfigUploadDir) {
        options.uploadDir = uploadDir;
    }
    return new Promise((resolve, reject) => {
        var form = new multiparty.Form(options);
        form.parse(req, function (err, fields, files) {
            if (err) return reject(err);
            // console.log(fields, 'fields');//{filename: ['asdfa.jpng']}
            // console.log(files, 'files');//{file: [{文件1}, {文件2}]}
            resolve({
                fields,
                files
            });
        }) 
    })
}

// 创建文件并写入到指定的目录 & 返回客户端结果
const writeFile = function (res, path, file, filename, stream) {
    //file是buffer,
    return new Promise((resolve, reject) => {
        if (stream) {
            try {
                let readStream = fs.createReadStream(file.path),
                    writeStream = fs.createWriteStream(path);
                readStream.pipe(writeStream);
                readStream.on('end', () => {
                    resolve();
                    fs.unlinkSync(file.path);
                    res.send({
                        code: 0,
                        codeText: 'upload success',
                        originalFilename: filename,
                        servicePath: path.replace(__dirname, HOSTNAME)
                    });
                });
            } catch (err) {
                reject(err);
                res.send({
                    code: 1,
                    codeText: err
                });
            }
            return;
        }
        fs.writeFile(path, file, err => {
            if (err) {
                reject(err);
                res.send({
                    code: 1,
                    codeText: err
                });
                return;
            }
            resolve();
            res.send({
                code: 0,
                codeText: 'upload success',
                originalFilename: filename,
                servicePath: path.replace(__dirname, HOSTNAME)
            });
        });
    });
}

// 单文件上传处理「FORM-DATA」
app.post('/upload_single', async (req, res) => {
    try {
        let {files} = await multiparty_upload(req, true);
        let file = (files.file && files.file[0]) || {};
        res.send({
            code: 0,
            codeText: 'upload success',
            originalFilename: file.originalFilename,
            servicePath: file.path.replace(__dirname, HOSTNAME)
        });
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});

//单文件上传处理「BASE64」
app.post('/upload_single_base64', async (req, res) => {
    //文件名不一样，但文件内容一样，是不会重复上传的哦
    let { file, filename } = req.body;
    let spark = new SparkMD5.ArrayBuffer();
    file = decodeURIComponent(file);//客户端encodeURLComponent，这里要解码
    // console.log(file, 'file');
    file = file.replace(/^data:image\/\w+;base64,/, "");
    //Buffer.from这里没有传入第二个参数base64，官网没找到
    file = Buffer.from(file);//不影响spark.end的结果，这是要干啥,file为Buffer
    spark.append(file);
    const suffix = filename.split('.').slice(-1);
    const uploadPath = `${uploadDir}/${spark.end()}.${suffix}`;
    const isExists = await exists(uploadPath);
    await delay();
    if (isExists) {
        res.send({
            code: 0,
            codeText: 'file is exists',
            originalFilename: filename,
            servicePath: uploadPath.replace(__dirname, HOSTNAME)
        });
        return;
    }
    writeFile(res, uploadPath, file, filename, false);
})

//场景一：客户端用hash作为文件名，单一图片文件上传
app.post('/upload_single_name', async (req, res) => {
    try {
        let { fields, files } = await multiparty_upload(req);
        let file = (files.file && files.file[0]) || {};
        let filename = (fields.filename && fields.filename[0]) || "";
        let path = `${uploadDir}/${filename}`;
        // 检测是否存在
        const isExists = await exists(path);
        if (isExists) {
            res.send({
                code: 0,
                codeText: 'file is exists',
                originalFilename: filename,
                servicePath: path.replace(__dirname, HOSTNAME)
            });
            return;
        }
        writeFile(res, path, file, filename, true);
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});



//托管静态文件
//eg:localhost:9001/server.js
app.use(express.static('./'));
//路由匹配不到，显示
app.use((req, res) => {
    res.status(404);
    res.send('NOT FOUND!');
});
