import express from 'express'
import {firebaseAuth}  from '../middleware/firebaseAuth.js';


const router = express.Router();


router.post('/authenticate',firebaseAuth);



export default router;