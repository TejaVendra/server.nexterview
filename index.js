import express, { json } from 'express'

const app = express();


app.get('/',(req,res)=>{
    return res.json({"message" :"home is getting called ...."})
})
app.listen(3000,() =>{
    try {
        console.log('server is start')
    } catch (error) {
        console.error("Error to start thr server")
    }
})