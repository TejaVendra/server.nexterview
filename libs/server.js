import express from 'express'
import { Server } from 'socket.io';
import http from 'http'


const app = express();

const server = http.createServer(app); // creates the http instance and pass the my express app into  as its request handler

const io = new Server(server,{
    cors:{
        origin:["http://localhost:5173"]
    },
     maxHttpBufferSize: 1e7,
})

const userSocketMap = {}; // to map the user id to the scocket  { userId : socketId }


io.on("connection",(socket) => {
    console.log("connected : ",socket.id);

    socket.on("disconnect",() =>{
        console.log("disconneted : ",socket.id);
    })
})



export { io, server, app};