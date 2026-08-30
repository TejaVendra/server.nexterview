import express from 'express'
import {firebaseAuth}  from '../middleware/firebaseAuth.js';
import { protectedRoute } from '../middleware/protected.js';
import { userProfile } from '../controllers/UserController.js';


const router = express.Router();


router.post('/authenticate',firebaseAuth);
router.get('/user/:email',protectedRoute,userProfile)



export default router;