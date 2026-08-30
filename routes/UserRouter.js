import express from 'express'
import {firebaseAuth}  from '../middleware/firebaseAuth.js';
import { protectedRoute } from '../middleware/protected.js';
import { updateName, userProfile } from '../controllers/UserController.js';


const router = express.Router();


router.post('/authenticate',firebaseAuth);
router.get('/user/:email',protectedRoute,userProfile)
router.post('/user/update/name'.protectedRoute,updateName);



export default router;