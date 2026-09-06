import express from 'express'
import {firebaseAuth}  from '../middleware/firebaseAuth.js';
import { protectedRoute } from '../middleware/protected.js';
import { checkAuth, deleteUser, getRefreshToken, getSignature, updateName, updateProfilePic, userProfile } from '../controllers/userController.js';
import { verification } from '../middleware/verification.js';


const router = express.Router();


router.post('/authenticate',firebaseAuth);
router.get('/user/profile',protectedRoute,verification,userProfile)
router.post('/user/update/name',protectedRoute,verification,updateName);
router.get('/user/get-signature',protectedRoute,verification,getSignature);
router.post('/user/update/profile',protectedRoute,verification,updateProfilePic);
router.delete('/user/delete',protectedRoute,verification,deleteUser);
router.get('/check',protectedRoute,verification,checkAuth);
router.post("/refresh",getRefreshToken);


export default router;