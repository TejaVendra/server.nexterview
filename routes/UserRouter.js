import express from 'express'
import {firebaseAuth}  from '../middleware/firebaseAuth.js';
import { protectedRoute } from '../middleware/protected.js';
import { deleteUser, updateName, userProfile } from '../controllers/UserController.js';


const router = express.Router();


router.post('/authenticate',firebaseAuth);
router.get('/user/:email',protectedRoute,userProfile)
router.post('/user/update/name',protectedRoute,updateName);
router.delete('/user/delete',protectedRoute,deleteUser);



export default router;