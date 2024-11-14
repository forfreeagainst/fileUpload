// 延迟函数
const delay = function delay(interval) {
    typeof interval !== "number" ? interval = 1000 : null;
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};

//单一文件上传【Form-Data】
((function () {
  const fileEventEl = document.querySelector(".eg-one-file");
  const selectEl = document.querySelector(".eg-one-select");
  const uploadEl = document.querySelector('.eg-one-upload');
  const tipsEl = document.querySelector('.eg-one-tips');
  const filesEl = document.querySelector('.eg-one-files');
  let fileList = null;
  //选择按钮
  selectEl.addEventListener('click', function (e) {
    //触发隐藏input的type=file的能力
    fileEventEl.click();
  })
  //选择完文件
  fileEventEl.addEventListener('change', function (e) {
    //input{type:file}不设置mulitply，无法多选。
    //这里的files指的是本次选择的文件
    //fileList最多只有一个了
    fileList = fileEventEl.files;
    const [fileObj] = fileList;
    if (fileObj.size > 1024 * 1024 * 2) {
      return alert("文件太大了");
    }
    filesEl.innerHTML = `<li>
      <span>文件: ${fileObj.name}</span>
      <span class="eg-one-remove">移除<span>
    </li>`;
  })
  //上传按钮
  uploadEl.addEventListener("click", function () {
    if (!fileList) return alert('请选择文件，再上传，谢谢啦');
    const [file] = fileList;
    const formData = new FormData();
    formData.append('file', file);//服务器用parse接收
    formData.append('filename', file.name);//服务器用parse接收
    instance.post('/upload_single', formData).then(data => {
      alert(`上传成功，你使用
      ${data.servicePath}
      进行访问`);
    }).catch(err => {
      alert('上传失败', err);
    })
  })
  const clearFiles = () => {
    fileList = [];
    filesEl.innerHTML = ``;
  }
  //事件委托，文件列表的移除
  filesEl.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('eg-one-remove')) {
      clearFiles();
    }
  })
}))();//分号很重要的

//单一文件上传【BASE64】，只适合图片！！！
(function () {
  const fileEventEl = document.querySelector('.eg-two-file');
  const file = document.querySelector('.eg-two-upload');
  file.addEventListener('click', function (e) {
    fileEventEl.click();
  })
  fileEventEl.addEventListener('change', function (e) {
    const [file] = this.files;//这里的this指的是fileEventEl
    //FileReader异步读取存储在用户计算机上的文件的内容
    const fileReaderTool = new FileReader();
    //readAsDataUrl:开始读取指定的 Blob 中的内容。
    //一旦完成，result 属性中将包含一个表示文件数据的 data: URL。
    fileReaderTool.readAsDataURL(file);
    fileReaderTool.onload = (e) => {
      const base64 = e.target.result;
      const data = {
        //encodeUrlComponent通常只用于转码URL组成部分,
        //若整个链接被encodeURIComponent()转码，则该链接无法被浏览器访问，
        //需要解码之后才可以正常访问。
        file: encodeURIComponent(base64),
        filename: file.name
      };
      const options = {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
      instance.post('/upload_single_base64', data, options).then(data => {
        //在这里使用Promise.reject，能执行catch的代码
        console.log(data);
        if (data.codeText === "file is exists") {
          throw "文件已存在，请不要重复上传，谢谢啦";
        }
        if (data.code === 0) {
          return alert(`上传成功，于此${data.servicePath}访问`)
        }
        throw data.codeText;
      }).catch(err => {
        alert(err);
      }).finally(() => {
        //可去除加载效果等
      });
    }
  })
})();//分号很重要的

//单一文件上传【缩略图处理】
(function () {
  const egThree = document.querySelector('.eg-three');
  const fileEventEl = egThree.querySelector('.input-file');
  const selectEl = egThree.querySelector('.btn-select');
  const uploadEl = egThree.querySelector('.btn-upload');
  const listAddr = egThree.querySelector('.list-abbr');
  const abbrImg = egThree.querySelector('.abbr-img');
  let fileList = null;

  const toBeBase64 = file => {
    return new Promise((resolve, reject) => {
      try {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = (e) => {
          const base64 = e.target.result;
          resolve(base64);
        }
      } catch (err) {
        reject(err);
      }
    })
  };

  const toBeBuffer = file => {
    return new Promise((resolve, reject) => {
      try {
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload = (e) => {
          resolve(e.target.result);
        }
      } catch (err) {
        reject(err);
      }
    })
  };

  selectEl.addEventListener('click', function (e) {
    fileEventEl.click();
  })
  fileEventEl.addEventListener('change', async function (e) {
    fileList = this.files;
    const base64 = await toBeBase64(fileList[0]);
    abbrImg.src = base64;
  })
  uploadEl.addEventListener('click', async function (e) {
    if (!fileList) return alert("请先选择文件");
    const [fileObj] = fileList;
    //生成buffer,通过sparkMD5,生成hash
    const buffer = await toBeBuffer(fileObj);
    const spark = new SparkMD5.ArrayBuffer();
    spark.append(buffer);
    const hash = spark.end();

    const suffix = fileObj.name.split('.').slice(-1);
    const filename = `${hash}.${suffix}`;
    let formData = new FormData();
    console.log(fileList, filename);
    formData.append('file', fileObj);//1个对象
    formData.append('filename', filename);//1个文件名
    instance.post('/upload_single_name', formData).then(data => {
      if (data.codeText === "file is exists") {
        return alert("文件已存在，请不要重复上传，谢谢啦");
      }
      if (data.code === 0) {
        return alert(`上传成功，于此${data.servicePath}访问`)
      }
      alert(data.codeText);
    })
  })
})();

//单一文件上传【进度管控】
(function () { 
  const egFourEl = document.querySelector('.eg-four');
  const fileEventEl = egFourEl.querySelector('.input-file');
  const uploadEl = egFourEl.querySelector('.btn-upload');
  const uploadProgress = egFourEl.querySelector('.upload-progress');
  const uploadValue = egFourEl.querySelector('.upload-value');
  fileEventEl.addEventListener('change', async function (e) {
    const [fileObj] = this.files;
    if (!fileObj) return alert('请选择文件，再进行上传');
    const formData = new FormData();
    formData.append('file', fileObj);
    formData.append('filename', fileObj.name);
    try {
      const data = await instance.post('/upload_single', formData, {
        onUploadProgress: (e) => {
          const { loaded, total } = e;
          uploadProgress.style.display = "block";
          uploadValue.style.width = `${loaded / total * 100} %`;
        }
      });
      if (data.code === 0) {
        uploadValue.style.width = '100%';
        await delay(300);
        //alert会阻碍页面渲染
        alert(`上传成功,于此${data.servicePath}访问`);
        return;
      }
      throw data.codeText;
    } catch (err) {
      alert(`上传失败，原因：${err}`);
    } finally {
      uploadProgress.style.display = "none";
      uploadValue.style.width = 0;
    }
  })
  uploadEl.addEventListener('click', function (e) {
    fileEventEl.click();
  })
})();

//多文件上传
(function () {
  const egFiveEl = document.querySelector('.eg-five');
  const fileEventEl = egFiveEl.querySelector('.input-file');
  const selectEl = egFiveEl.querySelector('.btn-select');
  const uploadEl = egFiveEl.querySelector('.btn-upload');
  const filesEl = egFiveEl.querySelector('.file-ul');
  let fileList = [];
  selectEl.addEventListener('click', function (e) {
    fileEventEl.click();
  })
  fileEventEl.addEventListener('change', function (e) {
    //bug，重新点，没有了
    console.log(this.files, '???');
    fileList = [...this.files];//类数组转数组
    if (!fileList.length) return alert('请选择文件，再上传');
    let html = ``;
    fileList = fileList.map(v => {
      return {
        file: v,
        filename: v.name,
        key: Math.random().toString()
      }
    })
    for (let item of fileList) {
      html += `<li key="${item.key}">
        <span>文件：${item.filename}</span>
        <span class="remove-action">移除<span>
      </li>`
    }
    filesEl.innerHTML = html;
  })
  uploadEl.addEventListener('click', function (e) {
    if (!fileList.length) return alert('请选择文件，再上传');
    //获取列表的所有li元素
    const liArr = Array.from(filesEl.querySelectorAll('li'));
    const promiseList = fileList.map(v => {
      const formData = new FormData();
      formData.append('file', v.file);
      formData.append('filename', v.filename);
      //找到对应的li元素
      const curLi = liArr.find(item => item.getAttribute('key') === v.key);
      const curSpan = curLi.querySelector('.remove-action');
      return instance.post('/upload_single', formData, {
        onUploadProgress: function (ev) {
          curSpan.innerHTML = `${ev.loaded/ ev.total * 100}%`;
        }
      }).then(async data => {
        if (+data.code === 0) {
          curSpan.innerHTML = `100%`;
          return;
        }
        return Promise.reject();
      }).catch(err => {
        return Promise.reject();
      });
    })
    //列表中的都不是Promise：pending, Promise:reject, 就会执行.then
    //列表中的都不是Promise：pending, Promise:reject, 就会执行.then
    //列表中的都不是Promise：pending, Promise:reject, 就会执行.then
    Promise.all(promiseList).then(async res => {
      await delay(300);//alert会阻塞页面渲染（100%有300毫秒延迟）
      alert('恭喜你，全部上传成功');
      filesEl.innerHTML = ``;
      fileList = [];
    }).catch(err => {
      console.log(promiseList, 'err');
      alert('上传失败，请稍候重试');
    })
  })
  //事件委托
  filesEl.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('remove-action')) {
      const currLi = e.target.parentNode;
      const currKey = currLi.getAttribute('key');
      //移除当前的数据
      fileList = fileList.filter(v => {
        return v.key !== currKey;
      });
      this.removeChild(currLi);
    }
  })
})();