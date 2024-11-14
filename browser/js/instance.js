let instance = axios.create();
//注意端口号与服务器一致
instance.defaults.baseURL = 'http://127.0.0.1:9001';
instance.defaults.headers['Content-Type'] = 'multipart/form-data';
instance.defaults.transformRequest = (data, headers) => {
    const contentType = headers['Content-Type'];
    if (contentType === "application/x-www-form-urlencoded") return Qs.stringify(data);
    return data;
};
instance.interceptors.response.use(response => {
    return response.data;
});