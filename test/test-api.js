const http = require('http');

// 测试注册API
function testRegister() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('注册API响应:', data);
    });
  });

  req.on('error', (e) => {
    console.error('注册API错误:', e.message);
  });

  req.write(JSON.stringify({ username: 'test', password: '123456' }));
  req.end();
}

// 测试登录API
function testLogin() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('登录API响应:', data);
    });
  });

  req.on('error', (e) => {
    console.error('登录API错误:', e.message);
  });

  req.write(JSON.stringify({ username: 'test', password: '123456' }));
  req.end();
}

// 运行测试
testRegister();
setTimeout(testLogin, 1000);
