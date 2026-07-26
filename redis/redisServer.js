import Redis from 'ioredis'


const client = new Redis("redis://localhost:6379");

const res = await client.set("user:4","pavan","NX");
console.log('====================================');
console.log(res);
console.log('====================================');

export default client;