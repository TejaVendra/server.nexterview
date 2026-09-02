import express from 'express'
import {firebaseAuth}  from '../middleware/firebaseAuth.js';
import { protectedRoute } from '../middleware/protected.js';
import { deleteUser, getSignature, updateName, updateProfilePic, userProfile } from '../controllers/userController.js';


const router = express.Router();


router.post('/authenticate',firebaseAuth);
router.get('/user/:email',protectedRoute,userProfile)
router.post('/user/update/name',protectedRoute,updateName);
router.get('/user/get-signature',protectedRoute,getSignature);
router.post('user/update/profile',protectedRoute,updateProfilePic);
router.delete('/user/delete',protectedRoute,deleteUser);



export default router;