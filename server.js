const http=require('http');
const{WebSocketServer}=require('ws');
const fs=require('fs');
const path=require('path');
const PORT=process.env.CHAT_PORT||8445;
const TOKEN=process.env.CHAT_TOKEN||'auris-chat-2026';
const history=[];const MAX=200;const clients=new Set();
function broadcast(msg){const d=JSON.stringify(msg);clients.forEach(ws=>{if(ws.readyState===1)ws.send(d);});}
function add(name,text,src){const msg={id:Date.now()+'-'+Math.random().toString(36).slice(2,6),name,text,source:src||'web',at:new Date().toISOString()};history.push(msg);if(history.length>MAX)history.shift();broadcast(msg);return msg;}
function readBody(req){return new Promise((r,j)=>{const c=[];req.on('data',d=>c.push(d));req.on('end',()=>r(Buffer.concat(c)));req.on('error',j);});}
const server=http.createServer(async(req,res)=>{
const url=new URL(req.url,'http://localhost');
res.setHeader('Access-Control-Allow-Origin','*');
res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
res.setHeader('Access-Control-Allow-Headers','Content-Type,x-chat-token');
if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
if(url.pathname==='/'||url.pathname==='/index.html'){fs.readFile(path.join(__dirname,'index.html'),(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(d);});return;}
if(url.pathname==='/api/send'&&req.method==='POST'){const auth=req.headers['x-chat-token']||url.searchParams.get('token');if(auth!==TOKEN){res.writeHead(401,{'Content-Type':'application/json'});res.end('{"error":"unauthorized"}');return;}const body=JSON.parse((await readBody(req)).toString());if(!body.name||!body.text){res.writeHead(400,{'Content-Type':'application/json'});res.end('{"error":"name and text required"}');return;}const msg=add(body.name,body.text,'api');res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,message:msg}));return;}
if(url.pathname==='/api/history'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({messages:history}));return;}
if(url.pathname==='/api/status'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({alive:true,online:clients.size,messages:history.length}));return;}
res.writeHead(404);res.end();
});
const wss=new WebSocketServer({server});
wss.on('connection',(ws)=>{clients.add(ws);ws.send(JSON.stringify({type:'history',messages:history}));broadcast({type:'online',count:clients.size});ws.on('message',(raw)=>{try{const d=JSON.parse(raw.toString());if(d.type==='message'&&d.name&&d.text)add(d.name,d.text,'web');}catch(e){}});ws.on('close',()=>{clients.delete(ws);broadcast({type:'online',count:clients.size});});});
server.listen(PORT,'0.0.0.0',()=>console.log('Auris chat on '+PORT));
